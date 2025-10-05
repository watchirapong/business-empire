import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '../../../../../config/database';
import jwt from 'jsonwebtoken';
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
    
    const { email, username } = body;

    // Validate required fields
    if (!email && !username) {
      return NextResponse.json({ 
        error: 'Email or username is required' 
      }, { status: 400 });
    }

    // Find user by email or username
    const user = await User.findOne({ 
      $or: [{ email }, { username }], 
      isActive: true 
    });

    if (!user) {
      return NextResponse.json({ 
        error: 'User not found' 
      }, { status: 401 });
    }

    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: user._id, 
        email: user.email,
        username: user.username,
        discordId: user.discordId
      },
      process.env.NEXTAUTH_SECRET || 'fallback-secret',
      { expiresIn: '7d' }
    );

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    return NextResponse.json({ 
      success: true, 
      user: user,
      token,
      message: 'Login successful'
    }, { status: 200 });

  } catch (error) {
    console.error('Error in user login:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}
