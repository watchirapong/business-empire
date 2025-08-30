import mongoose from 'mongoose';

const shopItemSchema = new mongoose.Schema({
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
  price: { 
    type: Number, 
    required: true,
    min: 0
  },

  image: { 
    type: String, 
    required: true,
    trim: true
  },
  inStock: { 
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
shopItemSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Index for faster queries
shopItemSchema.index({ inStock: 1 });

export default mongoose.model('ShopItem', shopItemSchema);
