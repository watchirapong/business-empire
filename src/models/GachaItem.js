import mongoose from 'mongoose';

const gachaItemSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true,
    trim: true
  },
  description: { 
    type: String, 
    required: true,
    trim: true
  },
  image: { 
    type: String, 
    required: true,
    trim: true
  },
  rarity: { 
    type: String, 
    required: true,
    enum: ['common', 'rare', 'epic', 'legendary', 'mythic']
  },
  dropRate: { 
    type: Number, 
    required: true,
    min: 0,
    max: 100
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
gachaItemSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Index for faster queries
gachaItemSchema.index({ rarity: 1 });
gachaItemSchema.index({ isActive: 1 });
gachaItemSchema.index({ dropRate: 1 });

export default mongoose.model('GachaItem', gachaItemSchema);
