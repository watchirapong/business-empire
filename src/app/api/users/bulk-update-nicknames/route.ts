import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAdmin } from '@/lib/admin-config';
import mongoose from 'mongoose';

// Connect to MongoDB
const connectDB = async () => {
  try {
    if (mongoose.connection.readyState === 1) {
      console.log('MongoDB already connected');
      return;
    }
    await mongoose.connect(process.env.MONGODB_URI!);
    console.log('MongoDB Connected successfully');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    throw error;
  }
};

// Username history schema
const usernameHistorySchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  usernameHistory: [{
    username: { type: String, required: true },
    globalName: { type: String },
    discriminator: { type: String },
    nickname: { type: String },
    changedAt: { type: Date, default: Date.now }
  }],
  currentUsername: { type: String, required: true },
  currentGlobalName: { type: String },
  currentDiscriminator: { type: String },
  currentNickname: { type: String },
  lastUpdated: { type: Date, default: Date.now }
});

const UsernameHistory = mongoose.models.UsernameHistory || mongoose.model('UsernameHistory', usernameHistorySchema);

// Server member data schema
const serverMemberDataSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  serverId: { type: String, required: true },
  serverData: { type: mongoose.Schema.Types.Mixed, required: true },
  lastUpdated: { type: Date, default: Date.now }
});

const ServerMemberData = mongoose.models.ServerMemberData || mongoose.model('ServerMemberData', serverMemberDataSchema);

// User schema (main users collection)
const userSchema = new mongoose.Schema({
  discordId: { type: String, required: true, unique: true },
  username: { type: String, required: true },
  email: { type: String, required: true },
  globalName: { type: String },
  avatar: { type: String },
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.models.User || mongoose.model('User', userSchema);

// Process a single user with retry logic
async function processUser(userId: string, guildId: string, results: any) {
  const maxRetries = 3;
  let retryCount = 0;
  
  while (retryCount < maxRetries) {
    try {
      console.log(`Processing user: ${userId} (attempt ${retryCount + 1})`);

      // Fetch current server member data from Discord
      const discordResponse = await fetch(
        `https://discord.com/api/v10/guilds/${guildId}/members/${userId}`,
        {
          headers: {
            'Authorization': `Bot ${process.env.DISCORD_BOT_TOKEN}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!discordResponse.ok) {
        if (discordResponse.status === 404) {
          console.log(`User ${userId} not found in server`);
          results.errors.push(`User ${userId}: Not found in server`);
          results.notInServer++;
          return;
        } else if (discordResponse.status === 429) {
          // Rate limited - wait and retry
          const retryAfter = discordResponse.headers.get('Retry-After');
          const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : 5000;
          console.log(`Rate limited for user ${userId}. Waiting ${waitTime}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
          retryCount++;
          continue;
        } else {
          console.log(`Failed to fetch data for user ${userId}: ${discordResponse.status}`);
          results.errors.push(`User ${userId}: Discord API error ${discordResponse.status}`);
          results.failed++;
          return;
        }
      }

        const memberData = await discordResponse.json();
        const currentNickname = memberData.nick || null;

        if (!currentNickname) {
          console.log(`User ${userId} has no nickname set`);
          results.noNickname++;
        }

        // Fetch user data from Discord
        const userResponse = await fetch(
          `https://discord.com/api/v10/users/${userId}`,
          {
            headers: {
              'Authorization': `Bot ${process.env.DISCORD_BOT_TOKEN}`,
              'Content-Type': 'application/json',
            },
          }
        );

        let userData = null;
        if (userResponse.ok) {
          userData = await userResponse.json();
        }

        // Update or create UsernameHistory
        let history = await UsernameHistory.findOne({ userId });

        if (!history) {
          // Create new history record
          history = new UsernameHistory({
            userId,
            usernameHistory: [{
              username: userData?.username || 'Unknown',
              globalName: userData?.global_name || null,
              discriminator: userData?.discriminator || null,
              nickname: currentNickname,
              changedAt: new Date()
            }],
            currentUsername: userData?.username || 'Unknown',
            currentGlobalName: userData?.global_name || null,
            currentDiscriminator: userData?.discriminator || null,
            currentNickname: currentNickname
          });
        } else {
          // Update existing history if nickname changed
          if (history.currentNickname !== currentNickname) {
            // Add current state to history if nickname changed
            if (history.currentNickname !== null) {
              history.usernameHistory.push({
                username: history.currentUsername,
                globalName: history.currentGlobalName,
                discriminator: history.currentDiscriminator,
                nickname: history.currentNickname,
                changedAt: new Date()
              });
            }
            
            // Update current values
            history.currentUsername = userData?.username || history.currentUsername;
            history.currentGlobalName = userData?.global_name || history.currentGlobalName;
            history.currentDiscriminator = userData?.discriminator || history.currentDiscriminator;
            history.currentNickname = currentNickname;
            history.lastUpdated = new Date();
          }
        }

        await history.save();

        // Update ServerMemberData
        await ServerMemberData.findOneAndUpdate(
          { userId, serverId: guildId },
          {
            userId,
            serverId: guildId,
            serverData: memberData,
            lastUpdated: new Date()
          },
          { upsert: true }
        );

        results.updated++;
        console.log(`Successfully updated user ${userId} with nickname: ${currentNickname || 'No nickname'}`);
        return; // Success, exit retry loop

      } catch (error) {
        console.error(`Error processing user ${userId} (attempt ${retryCount + 1}):`, error);
        
        if (retryCount < maxRetries - 1) {
          // Wait before retry
          const waitTime = 1000 * (retryCount + 1); // Exponential backoff
          console.log(`Retrying user ${userId} in ${waitTime}ms...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
          retryCount++;
          continue;
        } else {
          // Max retries reached
          results.errors.push(`User ${userId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
          results.failed++;
          return;
        }
      }
    }
  }

// Background job storage (in production, use Redis or a proper job queue)
const backgroundJobs = new Map<string, {
  status: 'running' | 'completed' | 'failed';
  progress: number;
  results?: any;
  error?: string;
  startTime: Date;
  endTime?: Date;
}>();

// Cleanup old jobs (keep only last 10 jobs)
const cleanupOldJobs = () => {
  if (backgroundJobs.size > 10) {
    const jobs = Array.from(backgroundJobs.entries());
    // Sort by start time, keep only the 10 most recent
    jobs.sort((a, b) => b[1].startTime.getTime() - a[1].startTime.getTime());
    const jobsToKeep = jobs.slice(0, 10);
    backgroundJobs.clear();
    jobsToKeep.forEach(([id, job]) => backgroundJobs.set(id, job));
  }
};

// POST - Bulk update nicknames for all users in database
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    if (!isAdmin((session.user as any).id)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Check if there's already a job running
    const runningJobs = Array.from(backgroundJobs.values()).filter(job => job.status === 'running');
    if (runningJobs.length > 0) {
      const runningJobId = Object.keys(backgroundJobs).find(key => backgroundJobs.get(key) === runningJobs[0]);
      return NextResponse.json({ 
        error: 'A bulk update is already running. Please wait for it to complete.',
        jobId: runningJobId || null
      }, { status: 409 });
    }

    // Create a new job
    const jobId = `bulk-update-${Date.now()}`;
    backgroundJobs.set(jobId, {
      status: 'running',
      progress: 0,
      startTime: new Date()
    });

    // Cleanup old jobs
    cleanupOldJobs();

    // Start the background job
    processBulkUpdateInBackground(jobId);

    return NextResponse.json({ 
      message: 'Bulk update started in background',
      jobId,
      status: 'running'
    });

  } catch (error) {
    console.error('Error starting bulk nickname update:', error);
    return NextResponse.json({ 
      error: 'Failed to start bulk nickname update',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Background processing function
async function processBulkUpdateInBackground(jobId: string) {
  try {
    await connectDB();

    // Check if we have a bot token
    if (!process.env.DISCORD_BOT_TOKEN) {
      throw new Error('Discord bot token not configured');
    }

    const guildId = '699984143542517801';
    const results = {
      total: 0,
      updated: 0,
      failed: 0,
      notInServer: 0,
      noNickname: 0,
      errors: [] as string[]
    };

    // Get ALL users from the main users collection
    const allUsers = await User.find({}, 'discordId username globalName');
    const allUserIds = allUsers.map(user => user.discordId);

    results.total = allUserIds.length;

    console.log(`Found ${results.total} users to process from main users collection`);

    // Process users in smaller batches to avoid rate limits
    const BATCH_SIZE = 5; // Reduced batch size
    const batches = [];
    
    for (let i = 0; i < allUserIds.length; i += BATCH_SIZE) {
      batches.push(allUserIds.slice(i, i + BATCH_SIZE));
    }

    console.log(`Processing ${batches.length} batches of ${BATCH_SIZE} users each`);

    // Process each batch
    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];
      console.log(`Processing batch ${batchIndex + 1}/${batches.length} (${batch.length} users)`);

      // Update progress
      const progress = Math.round(((batchIndex * BATCH_SIZE) / results.total) * 100);
      const job = backgroundJobs.get(jobId);
      if (job) {
        job.progress = progress;
      }

      // Process users in this batch sequentially to avoid rate limits
      for (let i = 0; i < batch.length; i++) {
        const userId = batch[i];
        console.log(`Processing user ${i + 1}/${batch.length} in batch ${batchIndex + 1}: ${userId}`);
        
        // Add delay between each user request
        if (i > 0) {
          await new Promise(resolve => setTimeout(resolve, 200)); // 200ms delay between users
        }
        
        await processUser(userId, guildId, results);
      }

      // Add longer delay between batches to be extra safe with rate limiting
      if (batchIndex < batches.length - 1) {
        console.log(`Batch ${batchIndex + 1} completed. Waiting 2 seconds before next batch...`);
        await new Promise(resolve => setTimeout(resolve, 2000)); // 2 second delay between batches
      }
    }

    console.log('All batches completed successfully');

    // Update job status
    const job = backgroundJobs.get(jobId);
    if (job) {
      job.status = 'completed';
      job.progress = 100;
      job.results = results;
      job.endTime = new Date();
    }

  } catch (error) {
    console.error('Error in background bulk nickname update:', error);
    
    // Update job status
    const job = backgroundJobs.get(jobId);
    if (job) {
      job.status = 'failed';
      job.error = error instanceof Error ? error.message : 'Unknown error';
      job.endTime = new Date();
    }
  }
}

// GET - Check job status
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    if (!isAdmin((session.user as any).id)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get('jobId');

    if (!jobId) {
      // Return all jobs
      const allJobs = Array.from(backgroundJobs.entries()).map(([id, job]) => ({
        jobId: id,
        ...job
      }));
      return NextResponse.json({ jobs: allJobs });
    }

    const job = backgroundJobs.get(jobId);
    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    return NextResponse.json({
      jobId,
      ...job,
      summary: job.results ? {
        total: job.results.total,
        updated: job.results.updated,
        failed: job.results.failed,
        notInServer: job.results.notInServer,
        noNickname: job.results.noNickname,
        successRate: `${((job.results.updated / job.results.total) * 100).toFixed(1)}%`
      } : null
    });

  } catch (error) {
    console.error('Error checking job status:', error);
    return NextResponse.json({ 
      error: 'Failed to check job status',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
