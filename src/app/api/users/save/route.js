import { NextResponse } from 'next/server';
import mongoose from 'mongoose';

// Connect to MongoDB
const connectDB = async () => {
  if (mongoose.connection.readyState === 1) {
    return;
  }
  
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/business-empire');
    console.log('MongoDB Connected: localhost');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    throw error;
  }
};

// User schema (removed sensitive token fields for security)
const userSchema = new mongoose.Schema({
  discordId: { 
    type: String, 
    required: true, 
    unique: true,
    index: true
  },
  username: { 
    type: String, 
    required: true,
    maxlength: 100
  },
  email: { 
    type: String, 
    required: true,
    lowercase: true,
    index: true
  },
  avatar: { 
    type: String,
    maxlength: 500
  },
  discriminator: { 
    type: String,
    maxlength: 10
  },
  globalName: { 
    type: String,
    maxlength: 100
  },
  // Removed accessToken and refreshToken fields for security
  // These should only be stored in session/JWT, not in database
  lastLogin: { 
    type: Date, 
    default: Date.now,
    index: true
  },
  loginCount: { 
    type: Number, 
    default: 1,
    min: 0
  },
  isActive: { 
    type: Boolean, 
    default: true,
    index: true
  },
  createdAt: { 
    type: Date, 
    default: Date.now,
    index: true
  },
  updatedAt: { 
    type: Date, 
    default: Date.now 
  }
});

// Update the updatedAt field before saving
userSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

const User = mongoose.models.User || mongoose.model('User', userSchema);

// User service functions
const createOrUpdateUser = async (discordData) => {
  try {
    const { id, username, email, avatar, discriminator, globalName } = discordData;
    
    // Input validation
    if (!id || !username || !email) {
      throw new Error('Missing required user data: id, username, or email');
    }
    
    // Sanitize inputs
    const sanitizedData = {
      id: String(id).trim(),
      username: String(username).trim().substring(0, 100),
      email: String(email).trim().toLowerCase(),
      avatar: avatar ? String(avatar).trim() : null,
      discriminator: discriminator ? String(discriminator).trim() : null,
      globalName: globalName ? String(globalName).trim().substring(0, 100) : null
    };
    
    // Check if user already exists
    let user = await User.findOne({ discordId: sanitizedData.id });
    
    if (user) {
      // Update existing user (excluding sensitive tokens)
      user.username = sanitizedData.username;
      user.email = sanitizedData.email;
      user.avatar = sanitizedData.avatar;
      user.discriminator = sanitizedData.discriminator;
      user.globalName = sanitizedData.globalName;
      user.lastLogin = new Date();
      user.loginCount += 1;
      user.isActive = true;
      
      await user.save();
      console.log(`Updated existing user: ${sanitizedData.username} (${sanitizedData.id})`);
    } else {
      // Create new user (excluding sensitive tokens)
      user = new User({
        discordId: sanitizedData.id,
        username: sanitizedData.username,
        email: sanitizedData.email,
        avatar: sanitizedData.avatar,
        discriminator: sanitizedData.discriminator,
        globalName: sanitizedData.globalName,
        lastLogin: new Date(),
        loginCount: 1,
        isActive: true
      });
      
      await user.save();
      console.log(`Created new user: ${sanitizedData.username} (${sanitizedData.id})`);
    }
    
    return user;
  } catch (error) {
    console.error('Error creating/updating user:', error);
    throw error;
  }
};

export async function POST(request) {
  try {
    // Connect to MongoDB
    await connectDB();
    
    // Parse the request body
    const userData = await request.json();
    
    // Save user data to MongoDB
    const user = await createOrUpdateUser(userData);
    
    return NextResponse.json({ 
      success: true, 
      message: 'User saved successfully',
      user: {
        id: user.discordId,
        username: user.username,
        email: user.email,
        loginCount: user.loginCount,
        lastLogin: user.lastLogin
      }
    });
    
  } catch (error) {
    console.error('Error saving user:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Failed to save user',
        error: error.message || 'Unknown error'
      },
      { status: 500 }
    );
  }
}
