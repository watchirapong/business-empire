const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const ProjectTask = require('./models/Task');
const Project = require('./models/Project');
const Section = require('./models/Section');

const aggressiveCleanup = async () => {
  try {
    // Connect to MongoDB
    const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/business-empire';
    await mongoose.connect(uri);
    console.log('✅ Connected to MongoDB');

    console.log('🧹 Starting AGGRESSIVE cleanup...');

    // Get current counts
    const initialTaskCount = await ProjectTask.countDocuments();
    const initialProjectCount = await Project.countDocuments();
    const initialSectionCount = await Section.countDocuments();

    console.log(`📊 Initial counts: ${initialTaskCount} tasks, ${initialProjectCount} projects, ${initialSectionCount} sections`);

    // 1. DELETE ALL TASKS (nuclear option)
    console.log('💥 DELETING ALL TASKS...');
    const deleteResult = await ProjectTask.deleteMany({});
    console.log(`✅ Deleted ${deleteResult.deletedCount} tasks`);

    // 2. DELETE ALL SECTIONS
    console.log('💥 DELETING ALL SECTIONS...');
    const deleteSectionsResult = await Section.deleteMany({});
    console.log(`✅ Deleted ${deleteSectionsResult.deletedCount} sections`);

    // 3. DELETE ALL PROJECTS
    console.log('💥 DELETING ALL PROJECTS...');
    const deleteProjectsResult = await Project.deleteMany({});
    console.log(`✅ Deleted ${deleteProjectsResult.deletedCount} projects`);

    // Final counts
    const finalTaskCount = await ProjectTask.countDocuments();
    const finalProjectCount = await Project.countDocuments();
    const finalSectionCount = await Section.countDocuments();

    console.log('\n📊 Final counts:');
    console.log(`  - Tasks: ${finalTaskCount}`);
    console.log(`  - Projects: ${finalProjectCount}`);
    console.log(`  - Sections: ${finalSectionCount}`);

    console.log('\n🎉 AGGRESSIVE cleanup completed! Database is now completely clean.');

  } catch (error) {
    console.error('❌ Error during aggressive cleanup:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
};

aggressiveCleanup();
