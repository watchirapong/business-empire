const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Import the TCAS model
const TCASData = require('../models/TCASData');

// Database connection
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/business-empire');
    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

// CSV parsing function (copied from your existing route)
function parseCSVData() {
  const csvPath = path.join(process.cwd(), 'public/data/TCAS68 STAT-Public.xlsx - แยกสาขารายสถาบัน.csv');
  
  if (!fs.existsSync(csvPath)) {
    throw new Error(`CSV file not found at: ${csvPath}`);
  }
  
  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  const lines = csvContent.split('\n').slice(3); // Skip header rows
  
  return lines
    .filter(line => line.trim() && line.split(',').length > 30)
    .map(line => {
      const columns = line.split(',');
      
      // Skip records with missing essential data
      if (!columns[0]?.trim() || !columns[1]?.trim() || !columns[2]?.trim()) {
        return null;
      }
      
      return {
        universityCode: columns[0] || '',
        universityName: columns[1] || '',
        programCode: columns[2] || '',
        branchCode: columns[3] || '',
        programName: columns[4] || '',
        branchName: columns[5]?.trim() || '',
        round1: {
          quota: parseInt(columns[6]) || 0,
          applicants: parseInt(columns[7]) || 0,
          passed: parseInt(columns[8]) || 0,
          confirmed: parseInt(columns[9]) || 0,
          notUsed: parseInt(columns[10]) || 0,
          waived: parseInt(columns[11]) || 0,
        },
        round2: {
          quota: parseInt(columns[12]) || 0,
          applicants: parseInt(columns[13]) || 0,
          passed: parseInt(columns[14]) || 0,
          confirmed: parseInt(columns[15]) || 0,
          notUsed: parseInt(columns[16]) || 0,
          waived: parseInt(columns[17]) || 0,
        },
        round3: {
          quota: parseInt(columns[18]) || 0,
          applicants: parseInt(columns[19]) || 0,
          passed: parseInt(columns[20]) || 0,
          confirmed: parseInt(columns[21]) || 0,
          notUsed: parseInt(columns[22]) || 0,
          waived: parseInt(columns[23]) || 0,
        },
        round4: {
          applicants: parseInt(columns[24]) || 0,
          passed: parseInt(columns[25]) || 0,
          confirmed: parseInt(columns[26]) || 0,
          notUsed: parseInt(columns[27]) || 0,
          waived: parseInt(columns[28]) || 0,
        },
        round42: {
          quota: parseInt(columns[29]) || 0,
          applicants: parseInt(columns[30]) || 0,
          passed: parseInt(columns[31]) || 0,
          confirmed: parseInt(columns[32]) || 0,
          notUsed: parseInt(columns[33]) || 0,
          waived: parseInt(columns[34]) || 0,
        },
        totalConfirmed: parseInt(columns[35]) || 0,
      };
    })
    .filter(record => record !== null);
}

// Import function
const importTCASData = async () => {
  try {
    console.log('Starting TCAS data import...');
    
    // Parse CSV data
    const csvData = parseCSVData();
    console.log(`Parsed ${csvData.length} records from CSV`);
    
    // Check if data already exists
    const existingCount = await TCASData.countDocuments();
    if (existingCount > 0) {
      console.log(`Found ${existingCount} existing records. Clearing collection...`);
      await TCASData.deleteMany({});
    }
    
    // Insert data in batches for better performance
    const batchSize = 100;
    let insertedCount = 0;
    
    for (let i = 0; i < csvData.length; i += batchSize) {
      const batch = csvData.slice(i, i + batchSize);
      await TCASData.insertMany(batch);
      insertedCount += batch.length;
      console.log(`Inserted ${insertedCount}/${csvData.length} records`);
    }
    
    console.log('✅ TCAS data import completed successfully!');
    console.log(`Total records imported: ${insertedCount}`);
    
    // Create indexes for better performance
    console.log('Creating indexes...');
    await TCASData.createIndexes();
    console.log('✅ Indexes created successfully!');
    
    // Show some statistics
    const stats = await TCASData.aggregate([
      {
        $group: {
          _id: null,
          totalUniversities: { $addToSet: '$universityCode' },
          totalPrograms: { $sum: 1 },
          totalConfirmed: { $sum: '$totalConfirmed' }
        }
      }
    ]);
    
    if (stats.length > 0) {
      console.log('\n📊 Import Statistics:');
      console.log(`- Total Universities: ${stats[0].totalUniversities.length}`);
      console.log(`- Total Programs: ${stats[0].totalPrograms}`);
      console.log(`- Total Confirmed Students: ${stats[0].totalConfirmed.toLocaleString()}`);
    }
    
  } catch (error) {
    console.error('❌ Error during import:', error);
    throw error;
  }
};

// Main execution
const main = async () => {
  try {
    await connectDB();
    await importTCASData();
    console.log('\n🎉 Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
};

// Run the script
if (require.main === module) {
  main();
}

module.exports = { importTCASData, parseCSVData };
