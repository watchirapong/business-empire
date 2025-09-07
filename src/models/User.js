import mongoose from 'mongoose';

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
  stats: {
    programming: { type: Number, default: 1, min: 1, max: 100 },
    artist: { type: Number, default: 1, min: 1, max: 100 },
    creative: { type: Number, default: 1, min: 1, max: 100 },
    leadership: { type: Number, default: 1, min: 1, max: 100 },
    communication: { type: Number, default: 1, min: 1, max: 100 },
    selfLearning: { type: Number, default: 1, min: 1, max: 100 }
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

// Method to update last login
userSchema.methods.updateLastLogin = function() {
  this.lastLogin = new Date();
  this.loginCount += 1;
  return this.save();
};

export default mongoose.model('User', userSchema);
