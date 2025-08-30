import mongoose from 'mongoose';

const purchaseHistorySchema = new mongoose.Schema({
  userId: { 
    type: String, 
    required: true,
    index: true
  },
  username: {
    type: String,
    required: true
  },
  itemId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'ShopItem',
    required: true,
    index: true
  },
  itemName: {
    type: String,
    required: true
  },
  price: { 
    type: Number, 
    required: true 
  },
  purchaseDate: { 
    type: Date, 
    default: Date.now 
  },
  downloadCount: { 
    type: Number, 
    default: 0 
  },
  lastDownloadDate: { 
    type: Date 
  },
  hasFile: {
    type: Boolean,
    default: false
  },
  fileUrl: {
    type: String
  },
  fileName: {
    type: String
  }
});

// Indexes for better performance
purchaseHistorySchema.index({ userId: 1, purchaseDate: -1 });
purchaseHistorySchema.index({ itemId: 1 });

export default mongoose.model('PurchaseHistory', purchaseHistorySchema);
