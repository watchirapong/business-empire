import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAdmin } from '@/lib/admin-config';
import mongoose from 'mongoose';
import SystemSettings from '@/models/SystemSettings';

// GET - Fetch system settings
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Connect to MongoDB
    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/business-empire');
    }

    let settings = await SystemSettings.findOne();
    
    if (!settings) {
      // Create default settings
      settings = new SystemSettings();
      await settings.save();
    }

    return NextResponse.json({ settings });

  } catch (error) {
    console.error('Error fetching settings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch settings' },
      { status: 500 }
    );
  }
}

// PUT - Update system settings (Admin only)
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const userId = (session.user as any).id;
    if (!isAdmin(userId)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { phase2Open, allowFriendAnswers, maxImageSize, allowedImageTypes } = body;

    // Connect to MongoDB
    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/business-empire');
    }

    let settings = await SystemSettings.findOne();
    
    if (!settings) {
      settings = new SystemSettings();
    }

    // Update settings
    if (phase2Open !== undefined) settings.phase2Open = phase2Open;
    if (allowFriendAnswers !== undefined) settings.allowFriendAnswers = allowFriendAnswers;
    if (maxImageSize !== undefined) settings.maxImageSize = maxImageSize;
    if (allowedImageTypes !== undefined) settings.allowedImageTypes = allowedImageTypes;

    await settings.save();

    return NextResponse.json({ 
      message: 'Settings updated successfully',
      settings: {
        id: settings._id,
        phase2Open: settings.phase2Open,
        allowFriendAnswers: settings.allowFriendAnswers,
        maxImageSize: settings.maxImageSize,
        allowedImageTypes: settings.allowedImageTypes
      }
    });

  } catch (error) {
    console.error('Error updating settings:', error);
    return NextResponse.json(
      { error: 'Failed to update settings' },
      { status: 500 }
    );
  }
}
