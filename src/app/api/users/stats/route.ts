import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authConfig } from '@/lib/auth-config';
import mongoose from 'mongoose';

export async function GET() {
  try {
    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(process.env.MONGODB_URI!);
    }

    const session = await getServerSession(authConfig);
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = (session.user as any).id;
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID not found in session' },
        { status: 400 }
      );
    }

    // Dynamic import to avoid model compilation issues
    const User = (await import('@/models/User')).default;
    const user = await User.findOne({ discordId: userId });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      stats: {
        programming: user.stats?.programming || 1,
        artist: user.stats?.artist || 1,
        creative: user.stats?.creative || 1,
        leadership: user.stats?.leadership || 1,
        communication: user.stats?.communication || 1,
        selfLearning: user.stats?.selfLearning || 1
      }
    });

  } catch (error) {
    console.error('Error fetching user stats:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(process.env.MONGODB_URI!);
    }

    const session = await getServerSession(authConfig);
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = (session.user as any).id;
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID not found in session' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { programming, artist, creative, leadership, communication, selfLearning } = body;

    // Validate input values
    const validateStat = (value: number, name: string) => {
      if (typeof value !== 'number' || value < 1 || value > 100) {
        throw new Error(`${name} must be a number between 1 and 100`);
      }
    };

    if (programming !== undefined) validateStat(programming, 'Programming');
    if (artist !== undefined) validateStat(artist, 'Artist');
    if (creative !== undefined) validateStat(creative, 'Creative');
    if (leadership !== undefined) validateStat(leadership, 'Leadership');
    if (communication !== undefined) validateStat(communication, 'Communication');
    if (selfLearning !== undefined) validateStat(selfLearning, 'Self Learning');

    const updateData: any = {};
    if (programming !== undefined) updateData['stats.programming'] = programming;
    if (artist !== undefined) updateData['stats.artist'] = artist;
    if (creative !== undefined) updateData['stats.creative'] = creative;
    if (leadership !== undefined) updateData['stats.leadership'] = leadership;
    if (communication !== undefined) updateData['stats.communication'] = communication;
    if (selfLearning !== undefined) updateData['stats.selfLearning'] = selfLearning;

    // Dynamic import to avoid model compilation issues
    const User = (await import('@/models/User')).default;
    const user = await User.findOneAndUpdate(
      { discordId: userId },
      { $set: updateData },
      { new: true }
    );

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Stats updated successfully',
      stats: {
        programming: user.stats?.programming || 1,
        artist: user.stats?.artist || 1,
        creative: user.stats?.creative || 1,
        leadership: user.stats?.leadership || 1,
        communication: user.stats?.communication || 1,
        selfLearning: user.stats?.selfLearning || 1
      }
    });

  } catch (error) {
    console.error('Error updating user stats:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
