/**
 * Business Empire App - Test Configuration
 * Centralized configuration for all test suites
 */

module.exports = {
  // Application settings
  app: {
    baseUrl: process.env.TEST_BASE_URL || 'https://hamsterhub.fun',
    localUrl: 'http://localhost:3000',
    timeout: 30000, // 30 seconds
  },

  // Test settings
  test: {
    // Retry failed tests
    retries: 2,
    
    // Test timeout
    timeout: 60000, // 60 seconds
    
    // Parallel execution
    workers: 4,
    
    // Test data
    testUser: {
      id: 'test-user-123',
      username: 'testuser',
      email: 'test@example.com'
    },
    
    testProject: {
      name: 'Test Project',
      description: 'Automated test project',
      color: '#3498db'
    },
    
    testTask: {
      title: 'Test Task',
      description: 'Automated test task',
      priority: 'medium'
    }
  },

  // Browser settings
  browser: {
    headless: process.env.CI ? true : false,
    viewport: {
      width: 1280,
      height: 720
    },
    userAgent: 'Business Empire Test Suite',
    
    // Mobile viewports for responsive testing
    mobileViewports: [
      { width: 375, height: 667, name: 'iPhone SE' },
      { width: 414, height: 896, name: 'iPhone 11' },
      { width: 768, height: 1024, name: 'iPad' }
    ]
  },

  // API endpoints to test
  endpoints: {
    health: '/api/health',
    projects: '/api/projects',
    tasks: '/api/tasks',
    users: '/api/users/all',
    templates: '/api/project-templates',
    auth: '/api/auth/session'
  },

  // Pages to test
  pages: {
    homepage: '/',
    projectManager: '/project-manager',
    admin: '/admin',
    profile: '/profile'
  },

  // Performance thresholds
  performance: {
    maxPageLoadTime: 3000, // 3 seconds
    maxAPITime: 2000, // 2 seconds
    maxFirstContentfulPaint: 1500, // 1.5 seconds
    maxLargestContentfulPaint: 2500 // 2.5 seconds
  },

  // Test reports
  reports: {
    outputDir: './test-reports',
    formats: ['json', 'html'],
    includeScreenshots: true,
    includeVideos: false
  },

  // Environment-specific settings
  environments: {
    development: {
      baseUrl: 'http://localhost:3000',
      headless: false,
      slowMo: 100
    },
    
    staging: {
      baseUrl: 'https://staging.hamsterhub.fun',
      headless: true,
      slowMo: 0
    },
    
    production: {
      baseUrl: 'https://hamsterhub.fun',
      headless: true,
      slowMo: 0
    }
  },

  // Test categories
  categories: {
    smoke: ['health', 'homepage', 'project-manager'],
    regression: ['all'],
    performance: ['page-load', 'api-response'],
    accessibility: ['keyboard-navigation', 'screen-reader'],
    security: ['authentication', 'authorization']
  }
};
