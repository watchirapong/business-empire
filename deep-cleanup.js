const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const ProjectTask = require('./models/Task');
const Project = require('./models/Project');
const Section = require('./models/Section');

const deepCleanup = async () => {
  try {
    // Connect to MongoDB
    const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/business-empire';
    await mongoose.connect(uri);
    console.log('✅ Connected to MongoDB');

    console.log('🧹 Starting deep cleanup...');

    // 1. Clean up tasks with invalid section references
    const validSections = await Section.find({});
    const validSectionIds = validSections.map(s => s._id.toString());

    const tasksWithInvalidSections = await ProjectTask.find({
      sectionId: { $exists: true, $ne: null, $nin: validSectionIds }
    });

    console.log(`🔍 Found ${tasksWithInvalidSections.length} tasks with invalid section references`);

    if (tasksWithInvalidSections.length > 0) {
      // Set invalid sectionId to null instead of deleting
      await ProjectTask.updateMany(
        { sectionId: { $exists: true, $ne: null, $nin: validSectionIds } },
        { $unset: { sectionId: 1 } }
      );
      console.log(`✅ Fixed ${tasksWithInvalidSections.length} tasks with invalid section references`);
    }

    // 2. Clean up duplicate tasks (same title, project, and createdById)
    const duplicateTasks = await ProjectTask.aggregate([
      {
        $group: {
          _id: { title: '$title', projectId: '$projectId', createdById: '$createdById' },
          count: { $sum: 1 },
          tasks: { $push: '$_id' }
        }
      },
      {
        $match: { count: { $gt: 1 } }
      }
    ]);

    console.log(`🔍 Found ${duplicateTasks.length} groups of duplicate tasks`);

    let totalDuplicatesRemoved = 0;
    for (const group of duplicateTasks) {
      // Keep the first task, delete the rest
      const tasksToDelete = group.tasks.slice(1);
      if (tasksToDelete.length > 0) {
        await ProjectTask.deleteMany({ _id: { $in: tasksToDelete } });
        totalDuplicatesRemoved += tasksToDelete.length;
        console.log(`🗑️ Removed ${tasksToDelete.length} duplicate tasks for "${group._id.title}"`);
      }
    }

    if (totalDuplicatesRemoved > 0) {
      console.log(`✅ Total duplicates removed: ${totalDuplicatesRemoved}`);
    }

    // 3. Clean up tasks with empty or whitespace-only titles
    const emptyTitleTasks = await ProjectTask.find({
      $or: [
        { title: { $regex: /^\s*$/ } },
        { title: '' }
      ]
    });

    console.log(`🔍 Found ${emptyTitleTasks.length} tasks with empty titles`);

    if (emptyTitleTasks.length > 0) {
      await ProjectTask.deleteMany({
        $or: [
          { title: { $regex: /^\s*$/ } },
          { title: '' }
        ]
      });
      console.log(`✅ Deleted ${emptyTitleTasks.length} tasks with empty titles`);
    }

    // 4. Clean up tasks with invalid priority values
    const invalidPriorityTasks = await ProjectTask.find({
      priority: { $nin: ['low', 'medium', 'high', 'urgent'] }
    });

    console.log(`🔍 Found ${invalidPriorityTasks.length} tasks with invalid priority values`);

    if (invalidPriorityTasks.length > 0) {
      // Fix invalid priorities by setting them to 'low'
      await ProjectTask.updateMany(
        { priority: { $nin: ['low', 'medium', 'high', 'urgent'] } },
        { $set: { priority: 'low' } }
      );
      console.log(`✅ Fixed ${invalidPriorityTasks.length} tasks with invalid priority values`);
    }

    // 5. Clean up tasks with invalid status values
    const invalidStatusTasks = await ProjectTask.find({
      status: { $nin: ['not_started', 'in_progress', 'completed', 'on_hold', 'cancelled'] }
    });

    console.log(`🔍 Found ${invalidStatusTasks.length} tasks with invalid status values`);

    if (invalidStatusTasks.length > 0) {
      // Fix invalid statuses by setting them to 'not_started'
      await ProjectTask.updateMany(
        { status: { $nin: ['not_started', 'in_progress', 'completed', 'on_hold', 'cancelled'] } },
        { $set: { status: 'not_started' } }
      );
      console.log(`✅ Fixed ${invalidStatusTasks.length} tasks with invalid status values`);
    }

    // 6. Recalculate positions for tasks in each section
    const sections = await Section.find({});
    for (const section of sections) {
      const sectionTasks = await ProjectTask.find({ sectionId: section._id }).sort({ position: 1 });
      
      // Reassign positions starting from 0
      for (let i = 0; i < sectionTasks.length; i++) {
        if (sectionTasks[i].position !== i) {
          await ProjectTask.updateOne(
            { _id: sectionTasks[i]._id },
            { $set: { position: i } }
          );
        }
      }
    }

    // 7. Recalculate positions for unassigned tasks
    const unassignedTasks = await ProjectTask.find({ sectionId: { $exists: false } }).sort({ position: 1 });
    for (let i = 0; i < unassignedTasks.length; i++) {
      if (unassignedTasks[i].position !== i) {
        await ProjectTask.updateOne(
          { _id: unassignedTasks[i]._id },
          { $set: { position: i } }
        );
      }
    }

    console.log(`✅ Recalculated positions for all tasks`);

    // Final statistics
    const finalTaskCount = await ProjectTask.countDocuments();
    const finalProjectCount = await Project.countDocuments();
    const finalSectionCount = await Section.countDocuments();

    console.log('\n📊 Final Statistics:');
    console.log(`  - Tasks: ${finalTaskCount}`);
    console.log(`  - Projects: ${finalProjectCount}`);
    console.log(`  - Sections: ${finalSectionCount}`);

    console.log('\n🎉 Deep cleanup completed successfully!');

  } catch (error) {
    console.error('❌ Error during deep cleanup:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
};

deepCleanup();
