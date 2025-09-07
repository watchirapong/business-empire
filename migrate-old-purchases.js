require('dotenv').config();
const mongoose = require('mongoose');

async function migrateOldPurchases() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const db = mongoose.connection.db;

    // Get all old purchases
    const oldPurchases = await db.collection('purchases').find({}).toArray();
    console.log('Found', oldPurchases.length, 'old purchases to migrate');

    let migratedCount = 0;
    let skippedCount = 0;

    for (const oldPurchase of oldPurchases) {
      // Each old purchase can have multiple items
      for (const item of oldPurchase.items || []) {
        // Check if this purchase already exists in new format
        const existingPurchase = await db.collection('purchasehistories').findOne({
          userId: oldPurchase.userId,
          itemId: item.itemId,
          purchaseDate: oldPurchase.purchaseDate
        });

        if (!existingPurchase) {
          // Create new purchase record
          const newPurchase = {
            userId: oldPurchase.userId,
            username: oldPurchase.username || 'Unknown',
            itemId: item.itemId,
            itemName: item.name,
            price: item.price,
            purchaseDate: oldPurchase.purchaseDate,
            downloadCount: 0,
            hasFile: false,
            fileUrl: '',
            fileName: '',
            contentType: 'none',
            textContent: '',
            linkUrl: '',
            youtubeUrl: ''
          };

          await db.collection('purchasehistories').insertOne(newPurchase);
          migratedCount++;
        } else {
          skippedCount++;
        }
      }
    }

    console.log('Migration completed:');
    console.log('- Migrated:', migratedCount);
    console.log('- Skipped (already exist):', skippedCount);

    // Show final counts
    const finalCount = await db.collection('purchasehistories').countDocuments();
    console.log('Total purchases in new collection:', finalCount);

    await mongoose.disconnect();
  } catch (error) {
    console.error('Migration error:', error);
  }
}

migrateOldPurchases();
