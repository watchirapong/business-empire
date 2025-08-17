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

// User schema
const userSchema = new mongoose.Schema({
  discordId: { 
    type: String, 
    required: true, 
    unique: true 
  },
  username: { 
    type: String, 
    required: true 
  },
  email: { 
    type: String, 
    required: true 
  },
  avatar: { 
    type: String 
  },
  discriminator: { 
    type: String 
  },
  globalName: { 
    type: String 
  },
  accessToken: { 
    type: String 
  },
  refreshToken: { 
    type: String 
  },
  lastLogin: { 
    type: Date, 
    default: Date.now 
  },
  loginCount: { 
    type: Number, 
    default: 1 
  },
  isActive: { 
    type: Boolean, 
    default: true 
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
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
    const { id, username, email, avatar, discriminator, globalName, accessToken, refreshToken } = discordData;
    
    // Check if user already exists
    let user = await User.findOne({ discordId: id });
    
    if (user) {
      // Update existing user
      user.username = username;
      user.email = email;
      user.avatar = avatar;
      user.discriminator = discriminator;
      user.globalName = globalName;
      user.accessToken = accessToken;
      user.refreshToken = refreshToken;
      user.lastLogin = new Date();
      user.loginCount += 1;
      user.isActive = true;
      
      await user.save();
      console.log(`Updated existing user: ${username} (${id})`);
    } else {
      // Create new user
      user = new User({
        discordId: id,
        username,
        email,
        avatar,
        discriminator,
        globalName,
        accessToken,
        refreshToken,
        lastLogin: new Date(),
        loginCount: 1,
        isActive: true
      });
      
      await user.save();
      console.log(`Created new user: ${username} (${id})`);
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
