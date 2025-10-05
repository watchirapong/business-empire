import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authConfig } from '@/lib/auth-config';
import mongoose from 'mongoose';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authConfig);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(process.env.MONGODB_URI!);
    }
    
    const User = mongoose.models.User || mongoose.model('User', new mongoose.Schema({
      discordId: String,
      username: String,
      email: String,
      preferences: {
        theme: { type: String, default: 'light' },
        notifications: { type: Boolean, default: true },
        timezone: { type: String, default: 'UTC' },
        language: { type: String, default: 'en' }
      }
    }));
    
    const user = await User.findOne({ 
      $or: [
        { discordId: session.user.id },
        { email: session.user.email }
      ]
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({
      preferences: user.preferences || {
        theme: 'light',
        notifications: true,
        timezone: 'UTC',
        language: 'en'
      }
    });

  } catch (error) {
    console.error('Error fetching user preferences:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authConfig);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { preferences } = body;

    if (!preferences) {
      return NextResponse.json({ error: 'Preferences data required' }, { status: 400 });
    }

    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(process.env.MONGODB_URI!);
    }
    
    const User = mongoose.models.User || mongoose.model('User', new mongoose.Schema({
      discordId: String,
      username: String,
      email: String,
      preferences: {
        theme: { type: String, default: 'light' },
        notifications: { type: Boolean, default: true },
        timezone: { type: String, default: 'UTC' },
        language: { type: String, default: 'en' }
      }
    }));
    
    const user = await User.findOneAndUpdate(
      { 
        $or: [
          { discordId: session.user.id },
          { email: session.user.email }
        ]
      },
      { 
        $set: { 
          preferences: preferences,
          updatedAt: new Date()
        }
      },
      { new: true, upsert: false }
    );

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({
      message: 'Preferences updated successfully',
      preferences: user.preferences
    });

  } catch (error) {
    console.error('Error updating user preferences:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
