const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const ProjectTask = require('./models/Task');
const Project = require('./models/Project');
const Section = require('./models/Section');

const checkDatabase = async () => {
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
    }

    if (projectCount > 0) {
      console.log('\n📁 All projects:');
      const projects = await Project.find({});
      projects.forEach(project => {
        console.log(`  - ID: ${project._id}, Name: "${project.name}"`);
      });
    }

    if (sectionCount > 0) {
      console.log('\n📂 All sections:');
      const sections = await Section.find({});
      sections.forEach(section => {
        console.log(`  - ID: ${section._id}, Name: "${section.name}", Project: ${section.projectId}`);
      });
    }

  } catch (error) {
    console.error('❌ Error checking database:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
};

checkDatabase();
