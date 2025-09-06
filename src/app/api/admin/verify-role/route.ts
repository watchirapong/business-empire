import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAdmin } from '@/lib/admin-config';
import mongoose from 'mongoose';

const connectDB = async () => {
  try {
    if (mongoose.connection.readyState === 1) {
      console.log('MongoDB already connected');
      return;
    }
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/hamsterhub');
    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    throw error;
  }
};

// ServerMemberData Schema
const serverMemberDataSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  username: { type: String, required: true },
  globalName: { type: String },
  avatar: { type: String },
  serverId: { type: String, required: true },
  serverData: { type: mongoose.Schema.Types.Mixed },
  roles: [String],
  lastUpdated: { type: Date, default: Date.now }
}, { strict: false });

const ServerMemberData = mongoose.models.ServerMemberData || mongoose.model('ServerMemberData', serverMemberDataSchema);

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;

    if (!isAdmin(userId)) {
      return NextResponse.json({ error: 'Unauthorized - Not admin' }, { status: 401 });
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const roleId = searchParams.get('roleId');

    if (!roleId) {
      return NextResponse.json({ success: false, error: 'Role ID is required' }, { status: 400 });
    }

    // Find all server members
    const serverMembers = await ServerMemberData.find({ 
      serverId: '699984143542517801' 
    });

    let usersWithRole = 0;
    let roleExists = false;
    const usersWithRoleDetails: any[] = [];

    // Check each member for the role
    for (const member of serverMembers) {
      let memberRoles: string[] = [];
      
      // Extract roles from different possible locations in the data structure
      if (member.serverData?.roles) {
        memberRoles = member.serverData.roles;
      } else if (member.serverData?.serverInfo?.roles) {
        memberRoles = member.serverData.serverInfo.roles;
      } else if (member.serverData?.member?.roles) {
        memberRoles = member.serverData.member.roles;
      } else if (member.roles) {
        memberRoles = member.roles;
      }

      // Check if the role ID exists in the member's roles
      if (memberRoles.includes(roleId)) {
        roleExists = true;
        usersWithRole++;
        
        usersWithRoleDetails.push({
          userId: member.userId,
          username: member.username || 'Unknown',
          globalName: member.globalName || member.username || 'Unknown',
          avatar: member.avatar,
          roles: memberRoles,
          lastUpdated: member.updatedAt
        });
      }
    }

    // Also check if the role exists in any member's role list (even if no users currently have it)
    if (!roleExists) {
      for (const member of serverMembers) {
        let memberRoles: string[] = [];
        
        if (member.serverData?.roles) {
          memberRoles = member.serverData.roles;
        } else if (member.serverData?.serverInfo?.roles) {
          memberRoles = member.serverData.serverInfo.roles;
        } else if (member.serverData?.member?.roles) {
          memberRoles = member.serverData.member.roles;
        } else if (member.roles) {
          memberRoles = member.roles;
        }

        // Check if any member has this role ID in their roles array
        if (memberRoles.includes(roleId)) {
          roleExists = true;
          break;
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        roleId,
        roleExists,
        usersWithRole,
        totalServerMembers: serverMembers.length,
        usersWithRoleDetails: usersWithRoleDetails.slice(0, 10), // Limit to first 10 for performance
        hasMoreUsers: usersWithRole > 10
      }
    });

  } catch (error) {
    console.error('Verify role error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to verify role' 
    }, { status: 500 });
  }
}
