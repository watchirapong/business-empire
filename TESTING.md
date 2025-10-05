# 🧪 Business Empire App - Automated Testing Guide

This guide explains how to use MCP (Model Context Protocol) and automated testing for your Business Empire application.

## 🚀 Quick Start

### 1. Run All Tests
```bash
cd /root/projects/business-empire
./run-tests.sh
```

### 2. Run Individual Test Suites
```bash
# API Tests only
npm run test

# Browser Tests only  
npm run test:browser

# All tests
npm run test:all
```

## 📋 Test Suites Overview

### 🔌 API Tests (`test-suite.js`)
Tests all backend API endpoints and functionality:
- ✅ Application Health Check
- ✅ Project Manager Page Load
- ✅ User Authentication
- ✅ Project Creation API
- ❌ Task Creation API (currently failing - needs debugging)
- ✅ User Management API
- ✅ Core API Endpoints

### 🌐 Browser Tests (`browser-tests.js`)
Uses Playwright to test the frontend UI:
- ✅ Homepage Load
- ✅ Project Manager Navigation
- ✅ Project Manager UI Elements
- ✅ Task Creation Form
- ✅ User Selector Component
- ✅ Responsive Design

## 🛠️ MCP Configuration

Your MCP setup in `~/.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-playwright"],
      "env": {
        "PLAYWRIGHT_BROWSERS_PATH": "0"
      }
    },
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/root/projects/business-empire"]
    }
  }
}
```

## 📊 Test Reports

After running tests, you'll get detailed reports:

- `test-report.json` - API test results
- `browser-test-report.json` - Browser test results  
- `combined-test-report.json` - Combined results
- `combined-test-report.json` - Full comprehensive report

## 🔧 Configuration

Edit `test.config.js` to customize:
- Test URLs and timeouts
- Browser settings
- Performance thresholds
- Test data
- Report formats

## 🎯 Current Test Results

**Overall Success Rate: 80%** ✅

### ✅ Passing Tests (8/10):
- Application Health
- Project Manager Page Load
- User Authentication
- Project Creation API
- User Management API
- API Endpoint: /api/tasks
- API Endpoint: /api/users/all
- API Endpoint: /api/project-templates

### ❌ Failing Tests (2/10):
- Task Creation API - Needs debugging (this is the issue you reported!)
- API Endpoint: /api/projects - GET request failing

## 🐛 Debugging Failed Tests

### Task Creation API Issue
The test shows that task creation is failing. This matches your original issue! The debugging we added should help identify the problem.

To debug:
1. Check browser console when creating tasks
2. Check PM2 logs: `pm2 logs business-empire`
3. Test the API directly: `curl -X POST http://localhost:3000/api/tasks`

### Projects API Issue
The GET request to `/api/projects` is failing. This might be due to authentication requirements.

## 🚀 Continuous Integration

### GitHub Actions
The `.github/workflows/test.yml` file sets up:
- Automatic testing on push/PR
- Daily scheduled tests
- Test report artifacts
- PR comments with results

### Local Development
```bash
# Watch mode - runs tests when files change
npm run test:watch

# Run tests before deployment
npm run test:all
```

## 📱 Testing Different Environments

```bash
# Development
TEST_BASE_URL=http://localhost:3000 npm run test

# Staging  
TEST_BASE_URL=https://staging.hamsterhub.fun npm run test

# Production
TEST_BASE_URL=https://hamsterhub.fun npm run test
```

## 🎨 Custom Test Scenarios

### Add New API Tests
Edit `test-suite.js` and add new test methods:

```javascript
async testNewFeature() {
  console.log('🔍 Testing New Feature...');
  
  try {
    const response = await fetch(`${this.baseUrl}/api/new-feature`);
    const works = response.ok;
    
    this.recordTest('New Feature', works,
      works ? 'New feature works' : 'New feature failed');
      
  } catch (error) {
    this.recordTest('New Feature', false, `Error: ${error.message}`);
  }
}
```

### Add New Browser Tests
Edit `browser-tests.js` and add new test methods:

```javascript
async testNewUIFeature() {
  console.log('🔍 Testing New UI Feature...');
  
  try {
    await this.page.goto(`${this.baseUrl}/new-page`);
    const hasFeature = await this.page.locator('[data-testid="new-feature"]').count() > 0;
    
    this.recordTest('New UI Feature', hasFeature,
      hasFeature ? 'UI feature is present' : 'UI feature is missing');
      
  } catch (error) {
    this.recordTest('New UI Feature', false, `Error: ${error.message}`);
  }
}
```

## 🔍 Performance Testing

The test suite includes performance monitoring:
- Page load times
- API response times
- First Contentful Paint
- Largest Contentful Paint

Thresholds are configurable in `test.config.js`.

## 🛡️ Security Testing

Basic security tests included:
- Authentication endpoints
- Authorization checks
- Input validation
- CORS headers

## 📈 Monitoring & Alerts

Set up monitoring with:
- Test result notifications
- Performance regression alerts
- Uptime monitoring
- Error tracking

## 🎯 Next Steps

1. **Fix Task Creation Issue**: Use the debugging we added to identify why task creation fails
2. **Fix Projects API**: Investigate why GET /api/projects fails
3. **Add More Tests**: Expand test coverage for new features
4. **Set up Monitoring**: Configure alerts for test failures
5. **Performance Optimization**: Use test results to optimize slow endpoints

## 📞 Support

If you need help with testing:
1. Check the test reports for detailed error messages
2. Review the debugging output in browser console
3. Check PM2 logs for server-side errors
4. Use the MCP tools to inspect the application state

---

**Happy Testing! 🎉**

Your Business Empire app now has comprehensive automated testing that will help you catch issues early and ensure reliable deployments.
