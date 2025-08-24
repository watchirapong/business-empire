const mongoose = require('mongoose');
const Game = require('../models/Game');

async function fixCompanySchema() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/business-empire');
    console.log('Connected to MongoDB');

    // Find all games
    const games = await Game.find({});
    console.log(`Found ${games.length} games to update`);

    let updatedCount = 0;

    for (const game of games) {
      let needsUpdate = false;
      
      // Update companies to ensure they have required properties
      const updatedCompanies = game.companies.map(company => {
        const updated = {
          name: company.name,
          totalInvestment: company.totalInvestment || 0,
          growth: company.growth || 0,
        };

        // Keep stock trading properties if they exist
        if (company.currentPrice !== undefined) {
          updated.currentPrice = company.currentPrice;
        }
        if (company.priceHistory) {
          updated.priceHistory = company.priceHistory;
        }
        if (company.volatility !== undefined) {
          updated.volatility = company.volatility;
        }

        // Check if we need to update
        if (company.totalInvestment === undefined || company.growth === undefined) {
          needsUpdate = true;
        }

        return updated;
      });

      if (needsUpdate) {
        game.companies = updatedCompanies;
        await game.save();
        updatedCount++;
        console.log(`Updated game ${game.roomId}`);
      }
    }

    console.log(`Successfully updated ${updatedCount} games`);
  } catch (error) {
    console.error('Error fixing company schema:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run the migration if this script is called directly
if (require.main === module) {
  fixCompanySchema();
}

module.exports = fixCompanySchema;
