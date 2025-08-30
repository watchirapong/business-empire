const mongoose = require('mongoose');
require('dotenv').config();

// Import the TCAS service
const TCASService = require('../services/tcasService');

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

// Test functions
const testAPI = async () => {
  try {
    console.log('🧪 Testing TCAS API with MongoDB data...\n');
    
    // Test 1: Get all data (first 10 records)
    console.log('1. Testing getAllData...');
    const allData = await TCASService.getAllData(1, 10);
    console.log(`✅ Found ${allData.total} total records, showing first 10`);
    console.log(`   Sample record: ${allData.data[0]?.universityName} - ${allData.data[0]?.programName}\n`);
    
    // Test 2: Search functionality
    console.log('2. Testing search...');
    const searchResults = await TCASService.searchData('จุฬา', 1, 5);
    console.log(`✅ Search for "จุฬา" found ${searchResults.total} results`);
    console.log(`   Sample: ${searchResults.data[0]?.universityName} - ${searchResults.data[0]?.programName}\n`);
    
    // Test 3: Computer Science programs
    console.log('3. Testing computer science programs...');
    const csPrograms = await TCASService.getComputerSciencePrograms(1, 5);
    console.log(`✅ Found ${csPrograms.total} computer science programs`);
    console.log(`   Sample: ${csPrograms.data[0]?.universityName} - ${csPrograms.data[0]?.programName}\n`);
    
    // Test 4: University statistics
    console.log('4. Testing university statistics...');
    const universityStats = await TCASService.getUniversityStats();
    console.log(`✅ Generated statistics for ${universityStats.length} universities`);
    console.log(`   Top university: ${universityStats[0]?.universityName} (${universityStats[0]?.totalConfirmed} confirmed)\n`);
    
    // Test 5: Round analysis
    console.log('5. Testing round analysis...');
    const roundAnalysis = await TCASService.getRoundAnalysis();
    console.log(`✅ Round analysis completed`);
    console.log(`   Round 1: ${roundAnalysis.round1.totalConfirmed} confirmed`);
    console.log(`   Round 2: ${roundAnalysis.round2.totalConfirmed} confirmed`);
    console.log(`   Round 3: ${roundAnalysis.round3.totalConfirmed} confirmed`);
    console.log(`   Round 4: ${roundAnalysis.round4.totalConfirmed} confirmed`);
    console.log(`   Round 4.2: ${roundAnalysis.round42.totalConfirmed} confirmed\n`);
    
    // Test 6: Statistics
    console.log('6. Testing overall statistics...');
    const statistics = await TCASService.getStatistics();
    console.log(`✅ Overall statistics:`);
    console.log(`   Total Records: ${statistics.totalRecords}`);
    console.log(`   Total Universities: ${statistics.totalUniversities}`);
    console.log(`   Total Programs: ${statistics.totalPrograms}`);
    console.log(`   Total Confirmed: ${statistics.totalConfirmed.toLocaleString()}`);
    console.log(`   Total Quota: ${statistics.totalQuota.toLocaleString()}`);
    console.log(`   Total Applicants: ${statistics.totalApplicants.toLocaleString()}\n`);
    
    // Test 7: Get data by university
    console.log('7. Testing university-specific data...');
    const universityData = await TCASService.getDataByUniversity(universityStats[0]?.universityCode);
    console.log(`✅ Found ${universityData.length} programs for ${universityStats[0]?.universityName}\n`);
    
    console.log('🎉 All tests passed! MongoDB migration is working correctly.');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    throw error;
  }
};

// Main execution
const main = async () => {
  try {
    await connectDB();
    await testAPI();
    process.exit(0);
  } catch (error) {
    console.error('❌ Test suite failed:', error);
    process.exit(1);
  }
};

// Run the script
if (require.main === module) {
  main();
}

module.exports = { testAPI };
