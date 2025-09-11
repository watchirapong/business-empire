import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import mongoose from 'mongoose';
import AdminUser from '@/models/AdminUser';
import { isSuperAdmin } from '@/lib/admin-config';

const connectDB = async () => {
  if (mongoose.connections[0]?.readyState) return;
  await mongoose.connect(process.env.MONGODB_URI!);
};

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !isSuperAdmin((session.user as any).id)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    const admins = await AdminUser.find({}).lean();
    return NextResponse.json({
      success: true,
      admins: admins.map(a => ({ userId: a.userId, addedBy: a.addedBy, addedAt: a.addedAt }))
    });
  } catch (error) {
    console.error('GET admin-users error:', error);
    return NextResponse.json({ error: 'Failed to fetch admin users' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !isSuperAdmin((session.user as any).id)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { userId } = await request.json();
    if (!userId) {
      return NextResponse.json({ error: 'userId required' }, { status: 400 });
    }
    if (userId === (session.user as any).id) {
      // super admin is implicitly admin
      return NextResponse.json({ success: true, message: 'Super admin already has admin privileges' });
    }

    await connectDB();
    const existing = await AdminUser.findOne({ userId });
    if (existing) {
      return NextResponse.json({ success: true, message: 'User is already an admin' });
    }
    await AdminUser.create({ userId, addedBy: (session.user as any).id });
    return NextResponse.json({ success: true, message: 'Admin added' });
  } catch (error) {
    console.error('POST admin-users error:', error);
    return NextResponse.json({ error: 'Failed to add admin' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !isSuperAdmin((session.user as any).id)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    if (!userId) {
      return NextResponse.json({ error: 'userId required' }, { status: 400 });
    }
    // prevent removing super admin
    if (userId === (session.user as any).id) {
      return NextResponse.json({ error: 'Cannot remove super admin' }, { status: 400 });
    }

    await connectDB();
    await AdminUser.deleteOne({ userId });
    return NextResponse.json({ success: true, message: 'Admin removed' });
  } catch (error) {
    console.error('DELETE admin-users error:', error);
    return NextResponse.json({ error: 'Failed to remove admin' }, { status: 500 });
  }
}


