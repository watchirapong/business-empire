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

// Default gacha items to seed
const defaultGachaItems = [
  // Common items (60% total drop rate)
  { name: 'Bronze Coin', description: 'A shiny bronze coin', image: '🥉', rarity: 'common', dropRate: 25 },
  { name: 'Basic Hamster Food', description: 'Standard hamster pellets', image: '🌾', rarity: 'common', dropRate: 20 },
  { name: 'Wooden Wheel', description: 'A simple wooden exercise wheel', image: '🎡', rarity: 'common', dropRate: 15 },
  
  // Rare items (25% total drop rate)
  { name: 'Silver Coin', description: 'A valuable silver coin', image: '🥈', rarity: 'rare', dropRate: 12 },
  { name: 'Premium Food', description: 'High-quality hamster treats', image: '🥜', rarity: 'rare', dropRate: 8 },
  { name: 'Cozy Bed', description: 'A comfortable sleeping spot', image: '🛏️', rarity: 'rare', dropRate: 5 },
  
  // Epic items (10% total drop rate)
  { name: 'Gold Coin', description: 'A precious gold coin', image: '🥇', rarity: 'epic', dropRate: 5 },
  { name: 'Luxury Cage', description: 'A spacious multi-level cage', image: '🏠', rarity: 'epic', dropRate: 3 },
  { name: 'Exercise Ball', description: 'A transparent exercise ball', image: '🔮', rarity: 'epic', dropRate: 2 },
  
  // Legendary items (4% total drop rate)
  { name: 'Diamond Ring', description: 'A sparkling diamond ring', image: '💍', rarity: 'legendary', dropRate: 2 },
  { name: 'Golden Wheel', description: 'A luxurious golden exercise wheel', image: '⭐', rarity: 'legendary', dropRate: 1.5 },
  { name: 'Royal Crown', description: 'Fit for a hamster king', image: '👑', rarity: 'legendary', dropRate: 0.5 },
  
  // Mythic items (1% total drop rate)
  { name: 'Rainbow Crystal', description: 'A mystical rainbow crystal', image: '🌈', rarity: 'mythic', dropRate: 0.5 },
  { name: 'Phoenix Feather', description: 'A legendary phoenix feather', image: '🔥', rarity: 'mythic', dropRate: 0.3 },
  { name: 'Unicorn Horn', description: 'The rarest of all treasures', image: '🦄', rarity: 'mythic', dropRate: 0.2 }
];

async function seedGachaItems() {
  try {
    await connectDB();

    // Check if items already exist
    const existingItems = await GachaItem.countDocuments();
    console.log(`Found ${existingItems} existing gacha items`);

    if (existingItems > 0) {
      console.log('Gacha items already exist. Skipping seed.');
      return;
    }

    // Insert default items
    const insertedItems = await GachaItem.insertMany(defaultGachaItems);
    console.log(`Successfully seeded ${insertedItems.length} gacha items!`);

    // Display seeded items
    insertedItems.forEach(item => {
      console.log(`- ${item.name} (${item.rarity}) - ${item.dropRate}% drop rate`);
    });

  } catch (error) {
    console.error('Error seeding gacha items:', error);
  } finally {
    await mongoose.connection.close();
    console.log('Database connection closed');
  }
}

// Run the seed function
seedGachaItems();
