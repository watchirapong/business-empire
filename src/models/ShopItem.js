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
  category: {
    type: String,
    required: true,
    trim: true
  },
  contentType: {
    type: String,
    enum: ['none', 'text', 'link', 'youtube', 'file'],
    default: 'none'
  },
  textContent: {
    type: String,
    trim: true
  },
  linkUrl: {
    type: String,
    trim: true
  },
  youtubeUrl: {
    type: String,
    trim: true
  },
  fileUrl: {
    type: String,
    trim: true
  },
  fileName: {
    type: String,
    trim: true
  },
  hasFile: {
    type: Boolean,
    default: false
  },
  inStock: {
    type: Boolean,
    default: true
  },
  allowMultiplePurchases: {
    type: Boolean,
    default: false
  },
  requiresRole: {
    type: Boolean,
    default: false
  },
  requiredRoleId: {
    type: String,
    trim: true
  },
  requiredRoleName: {
    type: String,
    trim: true
  },
  purchaseCount: {
    type: Number,
    default: 0,
    min: 0
  },
  totalRevenue: {
    type: Number,
    default: 0,
    min: 0
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
