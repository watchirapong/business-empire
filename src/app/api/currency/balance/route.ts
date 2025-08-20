import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
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

// Currency schema (re-defined here for API route context)
const currencySchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  hamsterCoins: { type: Number, default: 1000 },
  totalEarned: { type: Number, default: 0 },
  totalSpent: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const Currency = mongoose.models.Currency || mongoose.model('Currency', currencySchema);

// Get or create user currency
const getUserCurrency = async (userId: string) => {
  try {
    console.log('Looking for currency for user:', userId);
    let currency = await Currency.findOne({ userId });
    
    if (!currency) {
      console.log('Creating new currency account for user:', userId);
      currency = new Currency({
        userId,
        hamsterCoins: 1000,
        totalEarned: 1000
      });
      
      await currency.save();
      console.log(`Created new currency account for user: ${userId}`);
    } else {
      console.log('Found existing currency account for user:', userId);
    }
    
    return currency;
  } catch (error) {
    console.error('Error getting user currency:', error);
    throw error;
  }
};

export async function GET(request: Request) {
  try {
    console.log('Balance API called');
    
    await connectDB();
    
    const session = await getServerSession(authOptions);
    console.log('Session:', session ? 'Found' : 'Not found');
    console.log('Full session object:', JSON.stringify(session, null, 2));
    
    if (!session) {
      console.log('No session found, returning 401');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Try to get user ID from session
    let userId = (session.user as any).id;
    console.log('User ID from session:', userId);
    console.log('Session user object:', JSON.stringify(session.user, null, 2));
    
    // If no user ID in session, try to get it from the email or other fields
    if (!userId) {
      console.log('No user ID in session, trying alternative methods...');
      
      // Try to find user by email in the database
      if (session.user?.email) {
        console.log('Trying to find user by email:', session.user.email);
        
        try {
          // Import the User model
          const User = mongoose.models.User || mongoose.model('User', new mongoose.Schema({
            id: String,
            username: String,
            email: String,
            avatar: String,
            discriminator: String,
            globalName: String,
            accessToken: String,
            refreshToken: String,
            createdAt: { type: Date, default: Date.now },
            updatedAt: { type: Date, default: Date.now }
          }));
          
          const user = await User.findOne({ email: session.user.email });
          if (user) {
            userId = user.discordId; // Use discordId field from the database
            console.log('Found user by email, using Discord ID:', userId);
          } else {
            console.log('No user found by email');
          }
        } catch (error) {
          console.error('Error finding user by email:', error);
        }
      }
      
      if (!userId) {
        // For now, return an error but with more details
        return NextResponse.json({ 
          error: 'No user ID found in session',
          sessionUser: session.user,
          message: 'Session exists but user ID is missing. This might be a session caching issue.'
        }, { status: 400 });
      }
    }

    const currency = await getUserCurrency(userId);

    const balance = {
      hamsterCoins: currency.hamsterCoins,
      totalEarned: currency.totalEarned,
      totalSpent: currency.totalSpent
    };

    console.log('Returning balance:', balance);

    return NextResponse.json({
      success: true,
      data: balance
    });

  } catch (error) {
    console.error('Error in balance API:', error);
    return NextResponse.json(
      { 
        error: 'Failed to get balance',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}