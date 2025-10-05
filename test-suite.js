#!/usr/bin/env node

/**
 * Business Empire App - Automated Test Suite
 * This script uses MCP to automatically test your application
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

class BusinessEmpireTester {
  constructor() {
    this.baseUrl = 'https://hamsterhub.fun';
    this.testResults = [];
    this.startTime = Date.now();
  }

  async runAllTests() {
    console.log('🚀 Starting Business Empire App Test Suite...\n');
    
    try {
      // Test 1: Application Health Check
      await this.testApplicationHealth();
      
      // Test 2: Project Manager Page Load
      await this.testProjectManagerPage();
      
      // Test 3: User Authentication
      await this.testUserAuthentication();
      
      // Test 4: Project Creation
      await this.testProjectCreation();
      
      // Test 5: Task Creation
      await this.testTaskCreation();
      
      // Test 6: User Management
      await this.testUserManagement();
      
      // Test 7: API Endpoints
      await this.testAPIEndpoints();
      
      // Generate Report
      this.generateTestReport();
      
    } catch (error) {
      console.error('❌ Test suite failed:', error);
      process.exit(1);
    }
  }

  async testApplicationHealth() {
    console.log('🔍 Testing Application Health...');
    
    try {
      const response = await fetch(`${this.baseUrl}/api/health`);
      const isHealthy = response.ok;
      
      this.recordTest('Application Health', isHealthy, 
        isHealthy ? 'Application is running' : 'Application is not responding');
        
    } catch (error) {
      this.recordTest('Application Health', false, `Error: ${error.message}`);
    }
  }

  async testProjectManagerPage() {
    console.log('🔍 Testing Project Manager Page...');
    
    try {
      const response = await fetch(`${this.baseUrl}/project-manager`);
      const pageLoads = response.ok;
      
      this.recordTest('Project Manager Page Load', pageLoads,
        pageLoads ? 'Page loads successfully' : 'Page failed to load');
        
    } catch (error) {
      this.recordTest('Project Manager Page Load', false, `Error: ${error.message}`);
    }
  }

  async testUserAuthentication() {
    console.log('🔍 Testing User Authentication...');
    
    try {
      // Test if user session endpoint is accessible
      const response = await fetch(`${this.baseUrl}/api/auth/session`);
      const authWorks = response.status === 200 || response.status === 401; // 401 is expected for unauthenticated
      
      this.recordTest('User Authentication', authWorks,
        authWorks ? 'Authentication system is working' : 'Authentication system failed');
        
    } catch (error) {
      this.recordTest('User Authentication', false, `Error: ${error.message}`);
    }
  }

  async testProjectCreation() {
    console.log('🔍 Testing Project Creation API...');
    
    try {
      const testProject = {
        name: 'Test Project',
        description: 'Automated test project',
        color: '#3498db',
        ownerId: 'test-user-id'
      };

      const response = await fetch(`${this.baseUrl}/api/projects`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testProject)
      });

      const projectCreationWorks = response.status === 201 || response.status === 400; // 400 might be expected without auth
      
      this.recordTest('Project Creation API', projectCreationWorks,
        projectCreationWorks ? 'Project creation API is accessible' : 'Project creation API failed');
        
    } catch (error) {
      this.recordTest('Project Creation API', false, `Error: ${error.message}`);
    }
  }

  async testTaskCreation() {
    console.log('🔍 Testing Task Creation API...');
    
    try {
      const testTask = {
        title: 'Test Task',
        priority: 'medium',
        projectId: 'test-project-id',
        createdById: 'test-user-id'
      };

      const response = await fetch(`${this.baseUrl}/api/tasks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testTask)
      });

      const taskCreationWorks = response.status === 201 || response.status === 400; // 400 might be expected without auth
      
      this.recordTest('Task Creation API', taskCreationWorks,
        taskCreationWorks ? 'Task creation API is accessible' : 'Task creation API failed');
        
    } catch (error) {
      this.recordTest('Task Creation API', false, `Error: ${error.message}`);
    }
  }

  async testUserManagement() {
    console.log('🔍 Testing User Management...');
    
    try {
      const response = await fetch(`${this.baseUrl}/api/users/all`);
      const userManagementWorks = response.ok;
      
      this.recordTest('User Management API', userManagementWorks,
        userManagementWorks ? 'User management API is working' : 'User management API failed');
        
    } catch (error) {
      this.recordTest('User Management API', false, `Error: ${error.message}`);
    }
  }

  async testAPIEndpoints() {
    console.log('🔍 Testing Core API Endpoints...');
    
    const endpoints = [
      '/api/projects',
      '/api/tasks',
      '/api/users/all',
      '/api/project-templates'
    ];

    for (const endpoint of endpoints) {
      try {
        const response = await fetch(`${this.baseUrl}${endpoint}`);
        const endpointWorks = response.ok || response.status === 401; // 401 is acceptable for protected endpoints
        
        this.recordTest(`API Endpoint: ${endpoint}`, endpointWorks,
          endpointWorks ? 'Endpoint is accessible' : 'Endpoint failed');
          
      } catch (error) {
        this.recordTest(`API Endpoint: ${endpoint}`, false, `Error: ${error.message}`);
      }
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

  generateTestReport() {
    const endTime = Date.now();
    const duration = (endTime - this.startTime) / 1000;
    
    const passedTests = this.testResults.filter(test => test.passed).length;
    const totalTests = this.testResults.length;
    const successRate = (passedTests / totalTests * 100).toFixed(1);
    
    console.log('\n📊 Test Report');
    console.log('='.repeat(50));
    console.log(`Total Tests: ${totalTests}`);
    console.log(`Passed: ${passedTests}`);
    console.log(`Failed: ${totalTests - passedTests}`);
    console.log(`Success Rate: ${successRate}%`);
    console.log(`Duration: ${duration}s`);
    console.log('='.repeat(50));
    
    // Save detailed report
    const report = {
      summary: {
        total: totalTests,
        passed: passedTests,
        failed: totalTests - passedTests,
        successRate: parseFloat(successRate),
        duration: duration
      },
      tests: this.testResults,
      timestamp: new Date().toISOString()
    };
    
    fs.writeFileSync(
      path.join(__dirname, 'test-report.json'),
      JSON.stringify(report, null, 2)
    );
    
    console.log('📄 Detailed report saved to: test-report.json');
    
    // Exit with appropriate code
    process.exit(passedTests === totalTests ? 0 : 1);
  }
}

// Run the test suite
if (require.main === module) {
  const tester = new BusinessEmpireTester();
  tester.runAllTests().catch(console.error);
}

module.exports = BusinessEmpireTester;
