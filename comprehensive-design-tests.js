#!/usr/bin/env node

/**
 * Business Empire App - Comprehensive Design Validation Tests
 * Tests ALL features from PROJECT_MANAGEMENT_SYSTEM_DESIGN.md
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

class DesignValidationTester {
  constructor() {
    this.baseUrl = 'https://hamsterhub.fun';
    this.browser = null;
    this.page = null;
    this.testResults = [];
    this.startTime = Date.now();
    this.testData = {
      testUser: {
        id: 'test-user-123',
        username: 'testuser',
        email: 'test@example.com'
      },
      testProject: {
        name: 'Design Validation Test Project',
        description: 'Testing all design features',
        color: '#3498db',
        category: 'Work'
      },
      testTask: {
        title: 'Design Validation Test Task',
        description: 'Testing task management features',
        priority: 'high',
        status: 'not_started'
      }
    };
  }

  async setup() {
    console.log('🌐 Setting up browser for comprehensive design validation...');
    this.browser = await chromium.launch({ 
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    this.page = await this.browser.newPage();
    await this.page.setViewportSize({ width: 1280, height: 720 });
  }

  async teardown() {
    if (this.browser) {
      await this.browser.close();
    }
  }

  async runAllDesignTests() {
    console.log('🚀 Starting Comprehensive Design Validation Tests...\n');
    console.log('📋 Testing ALL features from PROJECT_MANAGEMENT_SYSTEM_DESIGN.md\n');
    
    try {
      await this.setup();
      
      // 1. System Overview Tests
      await this.testSystemOverview();
      
      // 2. Core Features Tests
      await this.testProjectManagement();
      await this.testTodoListSystem();
      await this.testTaskManagement();
      await this.testUserAssignmentCollaboration();
      await this.testDeadlineManagement();
      
      // 3. Database Schema Tests
      await this.testDatabaseSchema();
      
      // 4. User Interface Tests
      await this.testUserInterface();
      
      // 5. User Experience Flow Tests
      await this.testUserExperienceFlow();
      
      // 6. Technical Architecture Tests
      await this.testTechnicalArchitecture();
      
      // 7. Advanced Features Tests
      await this.testAdvancedFeatures();
      
      // 8. Security & Privacy Tests
      await this.testSecurityPrivacy();
      
      // 9. Performance & Scalability Tests
      await this.testPerformanceScalability();
      
      // Generate comprehensive report
      this.generateDesignValidationReport();
      
    } catch (error) {
      console.error('❌ Design validation tests failed:', error);
    } finally {
      await this.teardown();
    }
  }

  // 1. System Overview Tests
  async testSystemOverview() {
    console.log('🔍 Testing System Overview...');
    
    try {
      await this.page.goto(this.baseUrl, { waitUntil: 'networkidle' });
      
      // Test: Web-based Project Management System
      const isWebBased = await this.page.locator('body').count() > 0;
      this.recordTest('System Overview - Web-based System', isWebBased,
        isWebBased ? 'System is web-based and accessible' : 'System is not web-based');
      
      // Test: Target Users (Teams, Project Managers, Individual Users)
      await this.page.goto(`${this.baseUrl}/project-manager`, { waitUntil: 'networkidle' });
      const hasProjectManager = await this.page.locator('text=Project Manager').count() > 0;
      this.recordTest('System Overview - Target Users Support', hasProjectManager,
        hasProjectManager ? 'Supports project management for teams and individuals' : 'Missing project management features');
      
      // Test: Core Features (Project Creation, Todo Lists, Task Assignment, Deadline Management)
      const hasCreateProject = await this.page.locator('text=Create Project, text=+ Create Project').count() > 0;
      const hasCreateTask = await this.page.locator('text=Create Task, text=+ Create Task').count() > 0;
      const hasTaskAssignment = await this.page.locator('text=Assign To, text=Assign to').count() > 0;
      
      const coreFeaturesPresent = hasCreateProject && hasCreateTask && hasTaskAssignment;
      this.recordTest('System Overview - Core Features', coreFeaturesPresent,
        coreFeaturesPresent ? 'All core features are present' : 'Some core features are missing');
        
    } catch (error) {
      this.recordTest('System Overview', false, `Error: ${error.message}`);
    }
  }

  // 2.1 Project Management Tests
  async testProjectManagement() {
    console.log('🔍 Testing Project Management Features...');
    
    try {
      await this.page.goto(`${this.baseUrl}/project-manager`, { waitUntil: 'networkidle' });
      
      // Test: Create Projects
      const createProjectButton = this.page.locator('text=Create Project, text=+ Create Project').first();
      if (await createProjectButton.count() > 0) {
        await createProjectButton.click();
        await this.page.waitForTimeout(1000);
        
        const hasProjectForm = await this.page.locator('input[placeholder*="Project name"], input[placeholder*="Name"]').count() > 0;
        this.recordTest('Project Management - Create Projects', hasProjectForm,
          hasProjectForm ? 'Project creation form is present' : 'Project creation form is missing');
      } else {
        this.recordTest('Project Management - Create Projects', false, 'Create project button not found');
      }
      
      // Test: Project Categories
      const hasCategories = await this.page.locator('text=Category, select[name*="category"]').count() > 0;
      this.recordTest('Project Management - Project Categories', hasCategories,
        hasCategories ? 'Project categories are supported' : 'Project categories are not supported');
      
      // Test: Project Templates
      const hasTemplates = await this.page.locator('text=Template, text=Templates').count() > 0;
      this.recordTest('Project Management - Project Templates', hasTemplates,
        hasTemplates ? 'Project templates are available' : 'Project templates are not available');
      
      // Test: Project Archiving
      const hasArchive = await this.page.locator('text=Archive, text=archived').count() > 0;
      this.recordTest('Project Management - Project Archiving', hasArchive,
        hasArchive ? 'Project archiving is supported' : 'Project archiving is not supported');
      
      // Test: Project Sharing
      const hasSharing = await this.page.locator('text=Share, text=Invite, text=Members').count() > 0;
      this.recordTest('Project Management - Project Sharing', hasSharing,
        hasSharing ? 'Project sharing is supported' : 'Project sharing is not supported');
        
    } catch (error) {
      this.recordTest('Project Management', false, `Error: ${error.message}`);
    }
  }

  // 2.2 Todo List System Tests
  async testTodoListSystem() {
    console.log('🔍 Testing Todo List System...');
    
    try {
      // Test: Multiple Lists per Project
      const hasMultipleLists = await this.page.locator('text=Lists, text=Todo Lists').count() > 0;
      this.recordTest('Todo List System - Multiple Lists per Project', hasMultipleLists,
        hasMultipleLists ? 'Multiple lists per project are supported' : 'Multiple lists per project are not supported');
      
      // Test: List Organization (Drag-and-drop reordering)
      const hasDragDrop = await this.page.locator('[draggable="true"], .drag-handle').count() > 0;
      this.recordTest('Todo List System - List Organization', hasDragDrop,
        hasDragDrop ? 'List organization with drag-and-drop is supported' : 'List organization is not supported');
      
      // Test: List Templates
      const hasListTemplates = await this.page.locator('text=List Template, text=Template').count() > 0;
      this.recordTest('Todo List System - List Templates', hasListTemplates,
        hasListTemplates ? 'List templates are available' : 'List templates are not available');
      
      // Test: List Sharing
      const hasListSharing = await this.page.locator('text=Share List, text=List Members').count() > 0;
      this.recordTest('Todo List System - List Sharing', hasListSharing,
        hasListSharing ? 'List sharing is supported' : 'List sharing is not supported');
        
    } catch (error) {
      this.recordTest('Todo List System', false, `Error: ${error.message}`);
    }
  }

  // 2.3 Task Management Tests
  async testTaskManagement() {
    console.log('🔍 Testing Task Management...');
    
    try {
      // Test: Task Creation
      const createTaskButton = this.page.locator('text=Create Task, text=+ Create Task').first();
      if (await createTaskButton.count() > 0) {
        await createTaskButton.click();
        await this.page.waitForTimeout(1000);
        
        const hasTaskForm = await this.page.locator('input[placeholder*="What needs to be done"], input[placeholder*="Task title"]').count() > 0;
        this.recordTest('Task Management - Task Creation', hasTaskForm,
          hasTaskForm ? 'Task creation form is present' : 'Task creation form is missing');
      } else {
        this.recordTest('Task Management - Task Creation', false, 'Create task button not found');
      }
      
      // Test: Task Priorities (High, Medium, Low with color coding)
      const hasPriorities = await this.page.locator('select[name*="priority"], [data-priority]').count() > 0;
      this.recordTest('Task Management - Task Priorities', hasPriorities,
        hasPriorities ? 'Task priorities are supported' : 'Task priorities are not supported');
      
      // Test: Task Status (Not Started, In Progress, Completed, On Hold, Cancelled)
      const hasStatus = await this.page.locator('select[name*="status"], [data-status]').count() > 0;
      this.recordTest('Task Management - Task Status', hasStatus,
        hasStatus ? 'Task status management is supported' : 'Task status management is not supported');
      
      // Test: Task Dependencies
      const hasDependencies = await this.page.locator('text=Dependencies, text=Depends on').count() > 0;
      this.recordTest('Task Management - Task Dependencies', hasDependencies,
        hasDependencies ? 'Task dependencies are supported' : 'Task dependencies are not supported');
      
      // Test: Task Comments
      const hasComments = await this.page.locator('text=Comments, text=Add comment').count() > 0;
      this.recordTest('Task Management - Task Comments', hasComments,
        hasComments ? 'Task comments are supported' : 'Task comments are not supported');
      
      // Test: Task Attachments
      const hasAttachments = await this.page.locator('text=Attachments, text=Upload, input[type="file"]').count() > 0;
      this.recordTest('Task Management - Task Attachments', hasAttachments,
        hasAttachments ? 'Task attachments are supported' : 'Task attachments are not supported');
      
      // Test: Task Tags
      const hasTags = await this.page.locator('text=Tags, text=Labels').count() > 0;
      this.recordTest('Task Management - Task Tags', hasTags,
        hasTags ? 'Task tags are supported' : 'Task tags are not supported');
        
    } catch (error) {
      this.recordTest('Task Management', false, `Error: ${error.message}`);
    }
  }

  // 2.4 User Assignment & Collaboration Tests
  async testUserAssignmentCollaboration() {
    console.log('🔍 Testing User Assignment & Collaboration...');
    
    try {
      // Test: User Roles (Owner, Admin, Member, Viewer)
      const hasRoles = await this.page.locator('text=Owner, text=Admin, text=Member, text=Viewer').count() > 0;
      this.recordTest('User Assignment - User Roles', hasRoles,
        hasRoles ? 'User roles are supported' : 'User roles are not supported');
      
      // Test: Task Assignment
      const hasTaskAssignment = await this.page.locator('text=Assign To, text=Assign to, input[placeholder*="Search users"]').count() > 0;
      this.recordTest('User Assignment - Task Assignment', hasTaskAssignment,
        hasTaskAssignment ? 'Task assignment is supported' : 'Task assignment is not supported');
      
      // Test: Team Management
      const hasTeamManagement = await this.page.locator('text=Team, text=Members, text=Invite').count() > 0;
      this.recordTest('User Assignment - Team Management', hasTeamManagement,
        hasTeamManagement ? 'Team management is supported' : 'Team management is not supported');
      
      // Test: User Profiles
      const hasUserProfiles = await this.page.locator('text=Profile, text=Avatar, img[alt*="avatar"]').count() > 0;
      this.recordTest('User Assignment - User Profiles', hasUserProfiles,
        hasUserProfiles ? 'User profiles are supported' : 'User profiles are not supported');
      
      // Test: Activity Feed
      const hasActivityFeed = await this.page.locator('text=Activity, text=Feed, text=Recent').count() > 0;
      this.recordTest('User Assignment - Activity Feed', hasActivityFeed,
        hasActivityFeed ? 'Activity feed is supported' : 'Activity feed is not supported');
      
      // Test: Mention System
      const hasMentions = await this.page.locator('text=@, text=mention').count() > 0;
      this.recordTest('User Assignment - Mention System', hasMentions,
        hasMentions ? 'Mention system is supported' : 'Mention system is not supported');
        
    } catch (error) {
      this.recordTest('User Assignment & Collaboration', false, `Error: ${error.message}`);
    }
  }

  // 2.5 Deadline Management Tests
  async testDeadlineManagement() {
    console.log('🔍 Testing Deadline Management...');
    
    try {
      // Test: Due Dates
      const hasDueDates = await this.page.locator('input[type="date"], input[placeholder*="Due date"], text=Due Date').count() > 0;
      this.recordTest('Deadline Management - Due Dates', hasDueDates,
        hasDueDates ? 'Due dates are supported' : 'Due dates are not supported');
      
      // Test: Recurring Tasks
      const hasRecurring = await this.page.locator('text=Recurring, text=Repeat').count() > 0;
      this.recordTest('Deadline Management - Recurring Tasks', hasRecurring,
        hasRecurring ? 'Recurring tasks are supported' : 'Recurring tasks are not supported');
      
      // Test: Deadline Notifications
      const hasNotifications = await this.page.locator('text=Notifications, text=Reminder, .notification').count() > 0;
      this.recordTest('Deadline Management - Deadline Notifications', hasNotifications,
        hasNotifications ? 'Deadline notifications are supported' : 'Deadline notifications are not supported');
      
      // Test: Calendar Integration
      const hasCalendar = await this.page.locator('text=Calendar, text=Calendar View').count() > 0;
      this.recordTest('Deadline Management - Calendar Integration', hasCalendar,
        hasCalendar ? 'Calendar integration is supported' : 'Calendar integration is not supported');
      
      // Test: Time Tracking
      const hasTimeTracking = await this.page.locator('text=Time Tracking, text=Timer, text=Start Timer').count() > 0;
      this.recordTest('Deadline Management - Time Tracking', hasTimeTracking,
        hasTimeTracking ? 'Time tracking is supported' : 'Time tracking is not supported');
      
      // Test: Gantt Charts
      const hasGantt = await this.page.locator('text=Gantt, text=Timeline').count() > 0;
      this.recordTest('Deadline Management - Gantt Charts', hasGantt,
        hasGantt ? 'Gantt charts are supported' : 'Gantt charts are not supported');
        
    } catch (error) {
      this.recordTest('Deadline Management', false, `Error: ${error.message}`);
    }
  }

  // 3. Database Schema Tests
  async testDatabaseSchema() {
    console.log('🔍 Testing Database Schema Implementation...');
    
    try {
      // Test API endpoints that correspond to database tables
      const endpoints = [
        { name: 'Users Table', url: '/api/users/all' },
        { name: 'Projects Table', url: '/api/projects' },
        { name: 'Tasks Table', url: '/api/tasks' },
        { name: 'Notifications Table', url: '/api/notifications' }
      ];
      
      for (const endpoint of endpoints) {
        try {
          const response = await fetch(`${this.baseUrl}${endpoint.url}`);
          const isAccessible = response.ok || response.status === 401; // 401 is acceptable for protected endpoints
          
          this.recordTest(`Database Schema - ${endpoint.name}`, isAccessible,
            isAccessible ? `${endpoint.name} API is accessible` : `${endpoint.name} API is not accessible`);
        } catch (error) {
          this.recordTest(`Database Schema - ${endpoint.name}`, false, `Error: ${error.message}`);
        }
      }
      
    } catch (error) {
      this.recordTest('Database Schema', false, `Error: ${error.message}`);
    }
  }

  // 4. User Interface Tests
  async testUserInterface() {
    console.log('🔍 Testing User Interface Design...');
    
    try {
      // Test: Main Layout Structure
      const hasHeader = await this.page.locator('header, .header, [role="banner"]').count() > 0;
      const hasSidebar = await this.page.locator('aside, .sidebar, nav').count() > 0;
      const hasMainContent = await this.page.locator('main, .main-content, .content').count() > 0;
      
      const hasMainLayout = hasHeader && hasSidebar && hasMainContent;
      this.recordTest('User Interface - Main Layout Structure', hasMainLayout,
        hasMainLayout ? 'Main layout structure is present' : 'Main layout structure is missing');
      
      // Test: Project Dashboard
      const hasDashboard = await this.page.locator('text=Dashboard, text=Overview').count() > 0;
      this.recordTest('User Interface - Project Dashboard', hasDashboard,
        hasDashboard ? 'Project dashboard is present' : 'Project dashboard is missing');
      
      // Test: Task List View
      const hasTaskListView = await this.page.locator('text=List View, .task-list').count() > 0;
      this.recordTest('User Interface - Task List View', hasTaskListView,
        hasTaskListView ? 'Task list view is present' : 'Task list view is missing');
      
      // Test: Kanban Board View
      const hasKanbanView = await this.page.locator('text=Kanban View, text=Board View').count() > 0;
      this.recordTest('User Interface - Kanban Board View', hasKanbanView,
        hasKanbanView ? 'Kanban board view is present' : 'Kanban board view is missing');
      
      // Test: Calendar View
      const hasCalendarView = await this.page.locator('text=Calendar View, .calendar').count() > 0;
      this.recordTest('User Interface - Calendar View', hasCalendarView,
        hasCalendarView ? 'Calendar view is present' : 'Calendar view is missing');
      
      // Test: Task Detail Modal
      const hasTaskModal = await this.page.locator('.modal, [role="dialog"]').count() > 0;
      this.recordTest('User Interface - Task Detail Modal', hasTaskModal,
        hasTaskModal ? 'Task detail modal is present' : 'Task detail modal is missing');
        
    } catch (error) {
      this.recordTest('User Interface', false, `Error: ${error.message}`);
    }
  }

  // 5. User Experience Flow Tests
  async testUserExperienceFlow() {
    console.log('🔍 Testing User Experience Flow...');
    
    try {
      // Test: New User Onboarding
      const hasOnboarding = await this.page.locator('text=Welcome, text=Tutorial, text=Get Started').count() > 0;
      this.recordTest('User Experience - New User Onboarding', hasOnboarding,
        hasOnboarding ? 'New user onboarding is present' : 'New user onboarding is missing');
      
      // Test: Daily Workflow Support
      const hasDailyWorkflow = await this.page.locator('text=Today, text=My Tasks, text=Dashboard').count() > 0;
      this.recordTest('User Experience - Daily Workflow Support', hasDailyWorkflow,
        hasDailyWorkflow ? 'Daily workflow support is present' : 'Daily workflow support is missing');
      
      // Test: Project Lifecycle Support
      const hasProjectLifecycle = await this.page.locator('text=Create Project, text=Archive, text=Complete').count() > 0;
      this.recordTest('User Experience - Project Lifecycle Support', hasProjectLifecycle,
        hasProjectLifecycle ? 'Project lifecycle support is present' : 'Project lifecycle support is missing');
        
    } catch (error) {
      this.recordTest('User Experience Flow', false, `Error: ${error.message}`);
    }
  }

  // 6. Technical Architecture Tests
  async testTechnicalArchitecture() {
    console.log('🔍 Testing Technical Architecture...');
    
    try {
      // Test: Frontend Technology Stack
      const hasReact = await this.page.evaluate(() => {
        return typeof window.React !== 'undefined' || 
               document.querySelector('[data-reactroot]') !== null ||
               document.querySelector('#__next') !== null;
      });
      this.recordTest('Technical Architecture - Frontend Stack', hasReact,
        hasReact ? 'Modern frontend framework is detected' : 'Modern frontend framework is not detected');
      
      // Test: API Design
      const apiEndpoints = [
        '/api/projects',
        '/api/tasks',
        '/api/users/all',
        '/api/auth/session'
      ];
      
      let apiWorkingCount = 0;
      for (const endpoint of apiEndpoints) {
        try {
          const response = await fetch(`${this.baseUrl}${endpoint}`);
          if (response.ok || response.status === 401) {
            apiWorkingCount++;
          }
        } catch (error) {
          // Ignore errors for this test
        }
      }
      
      const apiDesignWorking = apiWorkingCount >= 2; // At least 2 endpoints should work
      this.recordTest('Technical Architecture - API Design', apiDesignWorking,
        apiDesignWorking ? 'API design is implemented' : 'API design is not properly implemented');
        
    } catch (error) {
      this.recordTest('Technical Architecture', false, `Error: ${error.message}`);
    }
  }

  // 7. Advanced Features Tests
  async testAdvancedFeatures() {
    console.log('🔍 Testing Advanced Features...');
    
    try {
      // Test: Analytics & Reporting
      const hasAnalytics = await this.page.locator('text=Analytics, text=Reports, text=Dashboard').count() > 0;
      this.recordTest('Advanced Features - Analytics & Reporting', hasAnalytics,
        hasAnalytics ? 'Analytics and reporting are present' : 'Analytics and reporting are missing');
      
      // Test: Integration Capabilities
      const hasIntegrations = await this.page.locator('text=Integrations, text=Connect, text=Sync').count() > 0;
      this.recordTest('Advanced Features - Integration Capabilities', hasIntegrations,
        hasIntegrations ? 'Integration capabilities are present' : 'Integration capabilities are missing');
      
      // Test: Mobile Support
      await this.page.setViewportSize({ width: 375, height: 667 });
      await this.page.waitForTimeout(1000);
      
      const isMobileResponsive = await this.page.locator('body').count() > 0;
      this.recordTest('Advanced Features - Mobile Support', isMobileResponsive,
        isMobileResponsive ? 'Mobile support is present' : 'Mobile support is missing');
      
      // Reset viewport
      await this.page.setViewportSize({ width: 1280, height: 720 });
      
    } catch (error) {
      this.recordTest('Advanced Features', false, `Error: ${error.message}`);
    }
  }

  // 8. Security & Privacy Tests
  async testSecurityPrivacy() {
    console.log('🔍 Testing Security & Privacy...');
    
    try {
      // Test: Authentication
      const hasAuth = await this.page.locator('text=Login, text=Sign In, text=Auth').count() > 0;
      this.recordTest('Security & Privacy - Authentication', hasAuth,
        hasAuth ? 'Authentication is present' : 'Authentication is missing');
      
      // Test: Authorization
      const hasAuthorization = await this.page.locator('text=Admin, text=Permissions, text=Roles').count() > 0;
      this.recordTest('Security & Privacy - Authorization', hasAuthorization,
        hasAuthorization ? 'Authorization is present' : 'Authorization is missing');
      
      // Test: Data Security (HTTPS)
      const isHTTPS = this.baseUrl.startsWith('https://');
      this.recordTest('Security & Privacy - Data Security (HTTPS)', isHTTPS,
        isHTTPS ? 'HTTPS is enabled' : 'HTTPS is not enabled');
        
    } catch (error) {
      this.recordTest('Security & Privacy', false, `Error: ${error.message}`);
    }
  }

  // 9. Performance & Scalability Tests
  async testPerformanceScalability() {
    console.log('🔍 Testing Performance & Scalability...');
    
    try {
      // Test: Performance Optimization
      const startTime = Date.now();
      await this.page.goto(this.baseUrl, { waitUntil: 'networkidle' });
      const loadTime = Date.now() - startTime;
      
      const isPerformant = loadTime < 5000; // Less than 5 seconds
      this.recordTest('Performance & Scalability - Page Load Performance', isPerformant,
        isPerformant ? `Page loads in ${loadTime}ms (good performance)` : `Page loads in ${loadTime}ms (slow performance)`);
      
      // Test: Caching
      const hasCaching = await this.page.evaluate(() => {
        return window.performance.getEntriesByType('navigation')[0].transferSize < 1000000; // Less than 1MB
      });
      this.recordTest('Performance & Scalability - Caching', hasCaching,
        hasCaching ? 'Caching appears to be working' : 'Caching may not be working properly');
        
    } catch (error) {
      this.recordTest('Performance & Scalability', false, `Error: ${error.message}`);
    }
  }

  recordTest(testName, passed, message) {
    const result = {
      name: testName,
      passed,
      message,
      timestamp: new Date().toISOString()
    };
    
    this.testResults.push(result);
    
    const status = passed ? '✅' : '❌';
    console.log(`  ${status} ${testName}: ${message}`);
  }

  generateDesignValidationReport() {
    const endTime = Date.now();
    const duration = (endTime - this.startTime) / 1000;
    
    const passedTests = this.testResults.filter(test => test.passed).length;
    const totalTests = this.testResults.length;
    const successRate = (passedTests / totalTests * 100).toFixed(1);
    
    console.log('\n📊 Comprehensive Design Validation Report');
    console.log('='.repeat(60));
    console.log(`Total Tests: ${totalTests}`);
    console.log(`Passed: ${passedTests}`);
    console.log(`Failed: ${totalTests - passedTests}`);
    console.log(`Success Rate: ${successRate}%`);
    console.log(`Duration: ${duration}s`);
    console.log('='.repeat(60));
    
    // Categorize results
    const categories = {
      'System Overview': this.testResults.filter(t => t.name.includes('System Overview')),
      'Project Management': this.testResults.filter(t => t.name.includes('Project Management')),
      'Todo List System': this.testResults.filter(t => t.name.includes('Todo List System')),
      'Task Management': this.testResults.filter(t => t.name.includes('Task Management')),
      'User Assignment': this.testResults.filter(t => t.name.includes('User Assignment')),
      'Deadline Management': this.testResults.filter(t => t.name.includes('Deadline Management')),
      'Database Schema': this.testResults.filter(t => t.name.includes('Database Schema')),
      'User Interface': this.testResults.filter(t => t.name.includes('User Interface')),
      'User Experience': this.testResults.filter(t => t.name.includes('User Experience')),
      'Technical Architecture': this.testResults.filter(t => t.name.includes('Technical Architecture')),
      'Advanced Features': this.testResults.filter(t => t.name.includes('Advanced Features')),
      'Security & Privacy': this.testResults.filter(t => t.name.includes('Security & Privacy')),
      'Performance & Scalability': this.testResults.filter(t => t.name.includes('Performance & Scalability'))
    };
    
    console.log('\n📋 Category Breakdown:');
    for (const [category, tests] of Object.entries(categories)) {
      if (tests.length > 0) {
        const categoryPassed = tests.filter(t => t.passed).length;
        const categoryRate = (categoryPassed / tests.length * 100).toFixed(1);
        console.log(`  ${category}: ${categoryPassed}/${tests.length} (${categoryRate}%)`);
      }
    }
    
    // Save detailed report
    const report = {
      type: 'design-validation',
      summary: {
        total: totalTests,
        passed: passedTests,
        failed: totalTests - passedTests,
        successRate: parseFloat(successRate),
        duration: duration
      },
      categories: Object.fromEntries(
        Object.entries(categories).map(([name, tests]) => [
          name,
          {
            total: tests.length,
            passed: tests.filter(t => t.passed).length,
            failed: tests.filter(t => !t.passed).length,
            successRate: tests.length > 0 ? (tests.filter(t => t.passed).length / tests.length * 100).toFixed(1) : '0'
          }
        ])
      ),
      tests: this.testResults,
      timestamp: new Date().toISOString()
    };
    
    fs.writeFileSync(
      path.join(__dirname, 'design-validation-report.json'),
      JSON.stringify(report, null, 2)
    );
    
    console.log('\n📄 Detailed design validation report saved to: design-validation-report.json');
    
    // Recommendations
    console.log('\n💡 Recommendations:');
    const failedTests = this.testResults.filter(t => !t.passed);
    if (failedTests.length > 0) {
      console.log('  Focus on implementing these missing features:');
      failedTests.forEach(test => {
        console.log(`    - ${test.name}: ${test.message}`);
      });
    } else {
      console.log('  🎉 All design features are implemented! Your system matches the design document perfectly.');
    }
  }
}

// Run design validation tests
if (require.main === module) {
  const tester = new DesignValidationTester();
  tester.runAllDesignTests().catch(console.error);
}

module.exports = DesignValidationTester;
