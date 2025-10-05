import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '../../../../../config/database';
import mongoose from 'mongoose';

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    
    // Get or create User model to avoid compilation conflicts
    let User: any;
    if (mongoose.connection.models.User) {
      User = mongoose.connection.models.User;
    } else {
      User = (await import('../../../../../models/User')).default;
    }
    
    let body;
    try {
      body = await request.json();
    } catch (parseError) {
      return NextResponse.json({ 
        error: 'Invalid JSON in request body' 
      }, { status: 400 });
    }
    
    const { email, username, discordId } = body;

    // Validate required fields
    if (!email || !username) {
      return NextResponse.json({ 
        error: 'Email and username are required' 
      }, { status: 400 });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ 
      $or: [{ email }, { username }, { discordId }] 
    });

    if (existingUser) {
      return NextResponse.json({ 
        error: 'User with this email, username, or Discord ID already exists' 
      }, { status: 409 });
    }

    // Create new user (Discord OAuth style)
    const newUser = new User({
      discordId: discordId || `temp_${Date.now()}`,
      username,
      email,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    await newUser.save();

    return NextResponse.json({ 
      success: true, 
      user: newUser,
      message: 'User registered successfully'
    }, { status: 201 });

  } catch (error) {
    console.error('Error in user registration:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}
