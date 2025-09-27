import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isSuperAdmin } from '@/lib/admin-config';
import mongoose from 'mongoose';
import AdminUser from '@/models/AdminUser';

// Connect to MongoDB
const connectDB = async () => {
  if (mongoose.connection.readyState !== 1) {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/business-empire');
  }
};

// GET - Fetch all admins (hardcoded + dynamic)
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is super admin
    if (!isSuperAdmin((session.user as any).id)) {
      return NextResponse.json({ error: 'Super admin access required' }, { status: 403 });
    }

    await connectDB();

    // Get hardcoded admins from config
    const { ADMIN_USER_IDS, SUPER_ADMIN_ID } = await import('@/lib/admin-config');
    
    // Fetch user data for hardcoded admins
    const hardcodedAdmins = [];
    for (const userId of ADMIN_USER_IDS) {
      try {
        // Try to find user in database
        const User = mongoose.models.User || mongoose.model('User', new mongoose.Schema({
          discordId: String,
          username: String,
          email: String,
          avatar: String,
          globalName: String
        }));
        
        const user = await User.findOne({ discordId: userId });
        if (user) {
          hardcodedAdmins.push({
            userId: user.discordId,
            username: user.username || user.globalName || 'Unknown User',
            email: user.email || 'No email',
            avatar: user.avatar || 'https://cdn.discordapp.com/embed/avatars/0.png',
            isSuperAdmin: userId === SUPER_ADMIN_ID
          });
        } else {
          // Fallback for users not in database
          hardcodedAdmins.push({
            userId,
            username: 'Unknown User',
            email: 'No email',
            avatar: 'https://cdn.discordapp.com/embed/avatars/0.png',
            isSuperAdmin: userId === SUPER_ADMIN_ID
          });
        }
      } catch (error) {
        console.error(`Error fetching user data for ${userId}:`, error);
        hardcodedAdmins.push({
          userId,
          username: 'Unknown User',
          email: 'No email',
          avatar: 'https://cdn.discordapp.com/embed/avatars/0.png',
          isSuperAdmin: userId === SUPER_ADMIN_ID
        });
      }
    }

    // Get dynamic admins from database
    const dynamicAdmins = await AdminUser.find({})
      .populate('addedBy', 'username email avatar')
      .sort({ addedAt: -1 });

    // Format dynamic admins
    const formattedDynamicAdmins = await Promise.all(
      dynamicAdmins.map(async (admin) => {
        try {
          // Get user data for the admin
          const User = mongoose.models.User || mongoose.model('User', new mongoose.Schema({
            discordId: String,
            username: String,
            email: String,
            avatar: String,
            globalName: String
          }));
          
          const user = await User.findOne({ discordId: admin.userId });
          return {
            _id: admin._id,
            userId: admin.userId,
            username: user?.username || user?.globalName || 'Unknown User',
            email: user?.email || 'No email',
            avatar: user?.avatar || 'https://cdn.discordapp.com/embed/avatars/0.png',
            addedBy: admin.addedBy,
            addedAt: admin.addedAt,
            isSuperAdmin: false
          };
        } catch (error) {
          console.error(`Error formatting admin ${admin.userId}:`, error);
          return {
            _id: admin._id,
            userId: admin.userId,
            username: 'Unknown User',
            email: 'No email',
            avatar: 'https://cdn.discordapp.com/embed/avatars/0.png',
            addedBy: admin.addedBy,
            addedAt: admin.addedAt,
            isSuperAdmin: false
          };
        }
      })
    );

    return NextResponse.json({
      success: true,
      hardcodedAdmins,
      dynamicAdmins: formattedDynamicAdmins,
      totalAdmins: hardcodedAdmins.length + formattedDynamicAdmins.length
    });

  } catch (error) {
    console.error('GET admin-management error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch admins' },
      { status: 500 }
    );
  }
}
