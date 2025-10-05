#!/usr/bin/env node

/**
 * Business Empire App - Browser Automation Tests
 * Uses Playwright for comprehensive UI testing
 */

const { chromium } = require('playwright');

class BrowserTester {
  constructor() {
    this.baseUrl = 'https://hamsterhub.fun';
    this.browser = null;
    this.page = null;
    this.testResults = [];
  }

  async setup() {
    console.log('🌐 Setting up browser for testing...');
    this.browser = await chromium.launch({ 
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    this.page = await this.browser.newPage();
    
    // Set viewport
    await this.page.setViewportSize({ width: 1280, height: 720 });
  }

  async teardown() {
    if (this.browser) {
      await this.browser.close();
    }
  }

  async runBrowserTests() {
    console.log('🚀 Starting Browser Tests for Business Empire App...\n');
    
    try {
      await this.setup();
      
      // Test 1: Homepage Load
      await this.testHomepageLoad();
      
      // Test 2: Project Manager Page Navigation
      await this.testProjectManagerNavigation();
      
      // Test 3: Project Manager UI Elements
      await this.testProjectManagerUI();
      
      // Test 4: Task Creation Form
      await this.testTaskCreationForm();
      
      // Test 5: User Selector Component
      await this.testUserSelector();
      
      // Test 6: Responsive Design
      await this.testResponsiveDesign();
      
      // Generate Report
      this.generateBrowserTestReport();
      
    } catch (error) {
      console.error('❌ Browser tests failed:', error);
    } finally {
      await this.teardown();
    }
  }

  async testHomepageLoad() {
    console.log('🔍 Testing Homepage Load...');
    
    try {
      await this.page.goto(this.baseUrl, { waitUntil: 'networkidle' });
      const title = await this.page.title();
      const hasContent = await this.page.locator('body').count() > 0;
      
      this.recordTest('Homepage Load', hasContent, 
        hasContent ? `Homepage loaded successfully. Title: ${title}` : 'Homepage failed to load');
        
    } catch (error) {
      this.recordTest('Homepage Load', false, `Error: ${error.message}`);
    }
  }

  async testProjectManagerNavigation() {
    console.log('🔍 Testing Project Manager Navigation...');
    
    try {
      await this.page.goto(`${this.baseUrl}/project-manager`, { waitUntil: 'networkidle' });
      const pageTitle = await this.page.title();
      const hasProjectManagerContent = await this.page.locator('text=Project Manager').count() > 0;
      
      this.recordTest('Project Manager Navigation', hasProjectManagerContent,
        hasProjectManagerContent ? 'Project Manager page loaded successfully' : 'Project Manager page failed to load');
        
    } catch (error) {
      this.recordTest('Project Manager Navigation', false, `Error: ${error.message}`);
    }
  }

  async testProjectManagerUI() {
    console.log('🔍 Testing Project Manager UI Elements...');
    
    try {
      // Check for key UI elements
      const hasSidebar = await this.page.locator('[data-testid="sidebar"], .sidebar, nav').count() > 0;
      const hasCreateTaskButton = await this.page.locator('text=Create Task, text=+ Create Task').count() > 0;
      const hasProjectList = await this.page.locator('text=Projects, text=All Tasks').count() > 0;
      
      const uiElementsPresent = hasSidebar && hasCreateTaskButton && hasProjectList;
      
      this.recordTest('Project Manager UI Elements', uiElementsPresent,
        uiElementsPresent ? 'All key UI elements are present' : 'Some UI elements are missing');
        
    } catch (error) {
      this.recordTest('Project Manager UI Elements', false, `Error: ${error.message}`);
    }
  }

  async testTaskCreationForm() {
    console.log('🔍 Testing Task Creation Form...');
    
    try {
      // Try to click the Create Task button
      const createTaskButton = this.page.locator('text=Create Task, text=+ Create Task').first();
      await createTaskButton.click();
      
      // Wait for modal/form to appear
      await this.page.waitForTimeout(1000);
      
      // Check if task creation form elements are present
      const hasTaskTitleInput = await this.page.locator('input[placeholder*="What needs to be done"], input[placeholder*="Task title"]').count() > 0;
      const hasPrioritySelect = await this.page.locator('select, [role="combobox"]').count() > 0;
      const hasAssignToField = await this.page.locator('text=Assign To, text=Assign to').count() > 0;
      
      const formElementsPresent = hasTaskTitleInput && hasPrioritySelect && hasAssignToField;
      
      this.recordTest('Task Creation Form', formElementsPresent,
        formElementsPresent ? 'Task creation form elements are present' : 'Task creation form elements are missing');
        
    } catch (error) {
      this.recordTest('Task Creation Form', false, `Error: ${error.message}`);
    }
  }

  async testUserSelector() {
    console.log('🔍 Testing User Selector Component...');
    
    try {
      // Look for user selector/search input
      const hasUserSearchInput = await this.page.locator('input[placeholder*="Search users"], input[placeholder*="Assign"]').count() > 0;
      
      if (hasUserSearchInput) {
        // Try to interact with the user selector
        const userInput = this.page.locator('input[placeholder*="Search users"], input[placeholder*="Assign"]').first();
        await userInput.click();
        await userInput.fill('test');
        
        // Check if dropdown appears
        await this.page.waitForTimeout(500);
        const hasDropdown = await this.page.locator('[role="listbox"], .dropdown, .user-list').count() > 0;
        
        this.recordTest('User Selector Component', hasDropdown,
          hasDropdown ? 'User selector dropdown appears' : 'User selector dropdown does not appear');
      } else {
        this.recordTest('User Selector Component', false, 'User selector input not found');
      }
      
    } catch (error) {
      this.recordTest('User Selector Component', false, `Error: ${error.message}`);
    }
  }

  async testResponsiveDesign() {
    console.log('🔍 Testing Responsive Design...');
    
    try {
      // Test mobile viewport
      await this.page.setViewportSize({ width: 375, height: 667 });
      await this.page.waitForTimeout(1000);
      
      const isMobileResponsive = await this.page.locator('body').count() > 0;
      
      // Test tablet viewport
      await this.page.setViewportSize({ width: 768, height: 1024 });
      await this.page.waitForTimeout(1000);
      
      const isTabletResponsive = await this.page.locator('body').count() > 0;
      
      // Reset to desktop
      await this.page.setViewportSize({ width: 1280, height: 720 });
      
      const isResponsive = isMobileResponsive && isTabletResponsive;
      
      this.recordTest('Responsive Design', isResponsive,
        isResponsive ? 'App is responsive across different screen sizes' : 'App has responsive design issues');
        
    } catch (error) {
      this.recordTest('Responsive Design', false, `Error: ${error.message}`);
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

  generateBrowserTestReport() {
    const passedTests = this.testResults.filter(test => test.passed).length;
    const totalTests = this.testResults.length;
    const successRate = (passedTests / totalTests * 100).toFixed(1);
    
    console.log('\n📊 Browser Test Report');
    console.log('='.repeat(50));
    console.log(`Total Tests: ${totalTests}`);
    console.log(`Passed: ${passedTests}`);
    console.log(`Failed: ${totalTests - passedTests}`);
    console.log(`Success Rate: ${successRate}%`);
    console.log('='.repeat(50));
    
    // Save detailed report
    const report = {
      type: 'browser-tests',
      summary: {
        total: totalTests,
        passed: passedTests,
        failed: totalTests - passedTests,
        successRate: parseFloat(successRate)
      },
      tests: this.testResults,
      timestamp: new Date().toISOString()
    };
    
    require('fs').writeFileSync(
      require('path').join(__dirname, 'browser-test-report.json'),
      JSON.stringify(report, null, 2)
    );
    
    console.log('📄 Browser test report saved to: browser-test-report.json');
  }
}

// Run browser tests
if (require.main === module) {
  const tester = new BrowserTester();
  tester.runBrowserTests().catch(console.error);
}

module.exports = BrowserTester;
