import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '../../../../config/database';
import ProjectTemplate from '../../../../models/ProjectTemplate';

// POST /api/seed-templates - Create default project templates
export async function POST(request: NextRequest) {
  try {
    await connectDB();
    
    // Check if templates already exist
    const existingTemplates = await ProjectTemplate.countDocuments();
    if (existingTemplates > 0) {
      return NextResponse.json({ message: 'Templates already exist' });
    }

    const defaultTemplates = [
      {
        name: 'Website Development',
        description: 'Complete website development project template',
        category: 'development',
        color: '#3b82f6',
        isPublic: true,
        createdBy: 'system',
        todoLists: [
          {
            name: 'Planning & Design',
            description: 'Initial planning and design phase',
            tasks: [
              { title: 'Create wireframes', priority: 'high', estimatedDuration: 120 },
              { title: 'Design mockups', priority: 'high', estimatedDuration: 240 },
              { title: 'Get client approval', priority: 'medium', estimatedDuration: 60 },
              { title: 'Create style guide', priority: 'medium', estimatedDuration: 90 }
            ]
          },
          {
            name: 'Frontend Development',
            description: 'Client-side development tasks',
            tasks: [
              { title: 'Set up project structure', priority: 'high', estimatedDuration: 60 },
              { title: 'Implement responsive layout', priority: 'high', estimatedDuration: 180 },
              { title: 'Add interactive features', priority: 'medium', estimatedDuration: 240 },
              { title: 'Optimize for performance', priority: 'medium', estimatedDuration: 120 }
            ]
          },
          {
            name: 'Backend Development',
            description: 'Server-side development tasks',
            tasks: [
              { title: 'Set up database', priority: 'high', estimatedDuration: 90 },
              { title: 'Create API endpoints', priority: 'high', estimatedDuration: 180 },
              { title: 'Implement authentication', priority: 'medium', estimatedDuration: 120 },
              { title: 'Add data validation', priority: 'medium', estimatedDuration: 90 }
            ]
          },
          {
            name: 'Testing & Deployment',
            description: 'Final testing and deployment tasks',
            tasks: [
              { title: 'Write unit tests', priority: 'medium', estimatedDuration: 120 },
              { title: 'Perform integration testing', priority: 'medium', estimatedDuration: 90 },
              { title: 'Deploy to staging', priority: 'high', estimatedDuration: 60 },
              { title: 'Deploy to production', priority: 'high', estimatedDuration: 60 }
            ]
          }
        ]
      },
      {
        name: 'Marketing Campaign',
        description: 'Digital marketing campaign template',
        category: 'marketing',
        color: '#10b981',
        isPublic: true,
        createdBy: 'system',
        todoLists: [
          {
            name: 'Strategy & Planning',
            description: 'Campaign strategy and planning phase',
            tasks: [
              { title: 'Define target audience', priority: 'high', estimatedDuration: 120 },
              { title: 'Set campaign objectives', priority: 'high', estimatedDuration: 90 },
              { title: 'Create content calendar', priority: 'medium', estimatedDuration: 180 },
              { title: 'Allocate budget', priority: 'high', estimatedDuration: 60 }
            ]
          },
          {
            name: 'Content Creation',
            description: 'Marketing content development',
            tasks: [
              { title: 'Write blog posts', priority: 'medium', estimatedDuration: 240 },
              { title: 'Create social media graphics', priority: 'medium', estimatedDuration: 180 },
              { title: 'Produce video content', priority: 'high', estimatedDuration: 360 },
              { title: 'Design email templates', priority: 'medium', estimatedDuration: 120 }
            ]
          },
          {
            name: 'Campaign Launch',
            description: 'Launch and execution tasks',
            tasks: [
              { title: 'Set up tracking tools', priority: 'high', estimatedDuration: 90 },
              { title: 'Launch social media ads', priority: 'high', estimatedDuration: 60 },
              { title: 'Send email campaigns', priority: 'medium', estimatedDuration: 60 },
              { title: 'Monitor performance', priority: 'medium', estimatedDuration: 120 }
            ]
          }
        ]
      },
      {
        name: 'Product Launch',
        description: 'New product launch project template',
        category: 'work',
        color: '#f59e0b',
        isPublic: true,
        createdBy: 'system',
        todoLists: [
          {
            name: 'Product Development',
            description: 'Core product development tasks',
            tasks: [
              { title: 'Define product requirements', priority: 'high', estimatedDuration: 180 },
              { title: 'Create MVP', priority: 'high', estimatedDuration: 480 },
              { title: 'Conduct user testing', priority: 'medium', estimatedDuration: 240 },
              { title: 'Iterate based on feedback', priority: 'medium', estimatedDuration: 180 }
            ]
          },
          {
            name: 'Marketing Preparation',
            description: 'Pre-launch marketing activities',
            tasks: [
              { title: 'Create product website', priority: 'high', estimatedDuration: 240 },
              { title: 'Develop marketing materials', priority: 'medium', estimatedDuration: 180 },
              { title: 'Plan launch event', priority: 'medium', estimatedDuration: 120 },
              { title: 'Build email list', priority: 'low', estimatedDuration: 90 }
            ]
          },
          {
            name: 'Launch Execution',
            description: 'Launch day and post-launch tasks',
            tasks: [
              { title: 'Execute launch plan', priority: 'high', estimatedDuration: 120 },
              { title: 'Monitor launch metrics', priority: 'high', estimatedDuration: 60 },
              { title: 'Respond to customer feedback', priority: 'medium', estimatedDuration: 90 },
              { title: 'Plan follow-up campaigns', priority: 'low', estimatedDuration: 60 }
            ]
          }
        ]
      },
      {
        name: 'Personal Goals',
        description: 'Personal development and goal tracking template',
        category: 'personal',
        color: '#8b5cf6',
        isPublic: true,
        createdBy: 'system',
        todoLists: [
          {
            name: 'Health & Fitness',
            description: 'Health and fitness related goals',
            tasks: [
              { title: 'Exercise 3 times per week', priority: 'high', estimatedDuration: 180 },
              { title: 'Eat healthy meals', priority: 'medium', estimatedDuration: 60 },
              { title: 'Get 8 hours of sleep', priority: 'medium', estimatedDuration: 0 },
              { title: 'Drink 8 glasses of water daily', priority: 'low', estimatedDuration: 0 }
            ]
          },
          {
            name: 'Learning & Development',
            description: 'Personal learning and skill development',
            tasks: [
              { title: 'Read 1 book per month', priority: 'medium', estimatedDuration: 600 },
              { title: 'Take online course', priority: 'high', estimatedDuration: 1200 },
              { title: 'Practice new skill daily', priority: 'medium', estimatedDuration: 30 },
              { title: 'Attend workshops/events', priority: 'low', estimatedDuration: 180 }
            ]
          },
          {
            name: 'Career & Finance',
            description: 'Career advancement and financial goals',
            tasks: [
              { title: 'Update resume and portfolio', priority: 'high', estimatedDuration: 120 },
              { title: 'Network with professionals', priority: 'medium', estimatedDuration: 60 },
              { title: 'Save 20% of income', priority: 'high', estimatedDuration: 0 },
              { title: 'Invest in retirement fund', priority: 'medium', estimatedDuration: 30 }
            ]
          }
        ]
      }
    ];

    await ProjectTemplate.insertMany(defaultTemplates);

    return NextResponse.json({ 
      message: 'Default templates created successfully',
      count: defaultTemplates.length 
    });
  } catch (error) {
    console.error('Error seeding templates:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
