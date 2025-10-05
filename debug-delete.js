const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const ProjectTask = require('./models/Task');
const Project = require('./models/Project');
const Section = require('./models/Section');

const debugDelete = async () => {
  try {
    // Connect to MongoDB
    const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/business-empire';
    await mongoose.connect(uri);
    console.log('✅ Connected to MongoDB');

    // Check current state
    const taskCount = await ProjectTask.countDocuments();
    const projectCount = await Project.countDocuments();
    const sectionCount = await Section.countDocuments();

    console.log(`📊 Current database state:`);
    console.log(`  - Tasks: ${taskCount}`);
    console.log(`  - Projects: ${projectCount}`);
    console.log(`  - Sections: ${sectionCount}`);

    if (taskCount > 0) {
      console.log('\n📋 All tasks:');
      const tasks = await ProjectTask.find({});
      tasks.forEach(task => {
        console.log(`  - ID: ${task._id}, Title: "${task.title}", Project: ${task.projectId}, Section: ${task.sectionId}`);
      });

      // Test delete the first task
      if (tasks.length > 0) {
        const taskToDelete = tasks[0];
        console.log(`\n🗑️ Testing delete for task: ${taskToDelete._id} (${taskToDelete.title})`);
        
        const deleteResult = await ProjectTask.findByIdAndDelete(taskToDelete._id);
        if (deleteResult) {
          console.log(`✅ Successfully deleted task: ${deleteResult.title}`);
        } else {
          console.log(`❌ Failed to delete task: ${taskToDelete._id}`);
        }
      }
    }

    // Final state
    const finalTaskCount = await ProjectTask.countDocuments();
    console.log(`\n📊 Final task count: ${finalTaskCount}`);

  } catch (error) {
    console.error('❌ Error during debug:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
};

debugDelete();
