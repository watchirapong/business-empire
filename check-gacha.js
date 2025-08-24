const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB Connected successfully');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    throw error;
  }
};

// Gacha Item Schema
const gachaItemSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  description: { type: String, required: true, trim: true },
  image: { type: String, required: true, trim: true },
  rarity: { type: String, required: true, enum: ['common', 'rare', 'epic', 'legendary', 'mythic'] },
  dropRate: { type: Number, required: true, min: 0, max: 100 },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const GachaItem = mongoose.models.GachaItem || mongoose.model('GachaItem', gachaItemSchema);

async function checkGachaItems() {
  try {
    await connectDB();

    // Get all gacha items
    const items = await GachaItem.find();
    console.log(`Found ${items.length} gacha items:`);

    items.forEach(item => {
      console.log(`- ${item.name} (${item.rarity}) - ${item.dropRate}% drop rate - Active: ${item.isActive}`);
    });

    // Calculate total drop rate
    const totalDropRate = items.reduce((sum, item) => sum + (item.isActive ? item.dropRate : 0), 0);
    console.log(`\nTotal drop rate: ${totalDropRate}%`);

  } catch (error) {
    console.error('Error checking gacha items:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\nDatabase connection closed');
  }
}

// Run the check function
checkGachaItems();
