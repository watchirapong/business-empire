import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAdmin } from '@/lib/admin-config';
import connectDB from '@/lib/mongodb';
import mongoose from 'mongoose';
import SystemSettings from '@/models/SystemSettings';

// GET - Fetch system settings
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

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
    const {
      assessmentEnabled,
      phase1Enabled,
      phase2Enabled,
      maxAttempts,
      timeLimit,
      autoSave,
      notifications
    } = body;

    await connectDB();

    let settings = await SystemSettings.findOne();
    
    if (!settings) {
      settings = new SystemSettings();
    }

    // Update settings
    if (assessmentEnabled !== undefined) {
      settings.assessmentEnabled = assessmentEnabled;
    }
    if (phase1Enabled !== undefined) {
      settings.phase1Enabled = phase1Enabled;
    }
    if (phase2Enabled !== undefined) {
      settings.phase2Enabled = phase2Enabled;
    }
    if (maxAttempts !== undefined) {
      settings.maxAttempts = maxAttempts;
    }
    if (timeLimit !== undefined) {
      settings.timeLimit = timeLimit;
    }
    if (autoSave !== undefined) {
      settings.autoSave = autoSave;
    }
    if (notifications !== undefined) {
      settings.notifications = notifications;
    }

    settings.updatedAt = new Date();
    await settings.save();

    return NextResponse.json({
      message: 'Settings updated successfully',
      settings: settings.toObject()
    });

  } catch (error) {
    console.error('Error updating settings:', error);
    return NextResponse.json(
      { error: 'Failed to update settings' },
      { status: 500 }
    );
  }
}