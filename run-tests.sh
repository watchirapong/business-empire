#!/bin/bash

# Business Empire App - Automated Test Runner
# This script runs comprehensive tests for your application

echo "🚀 Business Empire App - Automated Test Suite"
echo "=============================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if app is running
check_app_status() {
    print_status "Checking if application is running..."
    
    if curl -s -f http://localhost:3000/api/health > /dev/null 2>&1; then
        print_success "Application is running on localhost:3000"
        return 0
    else
        print_warning "Application not responding on localhost:3000"
        print_status "Checking if PM2 is running the app..."
        
        if pm2 list | grep -q "business-empire"; then
            print_status "PM2 process found, checking status..."
            pm2 status business-empire
        else
            print_error "No PM2 process found for business-empire"
            print_status "Starting application with PM2..."
            cd /root/projects/business-empire
            pm2 start server.js --name business-empire
            sleep 5
        fi
        return 1
    fi
}

# Run API tests
run_api_tests() {
    print_status "Running API tests..."
    cd /root/projects/business-empire
    
    if npm run test; then
        print_success "API tests completed successfully"
        return 0
    else
        print_error "API tests failed"
        return 1
    fi
}

# Run browser tests
run_browser_tests() {
    print_status "Running browser tests..."
    cd /root/projects/business-empire
    
    # Install playwright if not already installed
    if ! command -v playwright &> /dev/null; then
        print_status "Installing Playwright..."
        npm install -g playwright
        playwright install chromium
    fi
    
    if npm run test:browser; then
        print_success "Browser tests completed successfully"
        return 0
    else
        print_error "Browser tests failed"
        return 1
    fi
}

# Run performance tests
run_performance_tests() {
    print_status "Running performance tests..."
    
    # Test page load times
    echo "Testing page load performance..."
    
    # Homepage
    start_time=$(date +%s%N)
    curl -s http://localhost:3000/ > /dev/null
    end_time=$(date +%s%N)
    homepage_time=$(( (end_time - start_time) / 1000000 ))
    
    # Project Manager
    start_time=$(date +%s%N)
    curl -s http://localhost:3000/project-manager > /dev/null
    end_time=$(date +%s%N)
    pm_time=$(( (end_time - start_time) / 1000000 ))
    
    echo "Performance Results:"
    echo "  Homepage: ${homepage_time}ms"
    echo "  Project Manager: ${pm_time}ms"
    
    if [ $homepage_time -lt 2000 ] && [ $pm_time -lt 3000 ]; then
        print_success "Performance tests passed"
        return 0
    else
        print_warning "Performance tests show slow response times"
        return 1
    fi
}

# Generate comprehensive report
generate_report() {
    print_status "Generating comprehensive test report..."
    
    cd /root/projects/business-empire
    
    # Combine all test reports
    if [ -f "test-report.json" ] && [ -f "browser-test-report.json" ]; then
        echo "Combining test reports..."
        
        # Create combined report
        cat > combined-test-report.json << EOF
{
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "application": "Business Empire",
  "version": "1.0.0",
  "testSuites": {
    "api": $(cat test-report.json),
    "browser": $(cat browser-test-report.json)
  },
  "summary": {
    "totalTests": $(($(jq '.summary.total' test-report.json 2>/dev/null || echo 0) + $(jq '.summary.total' browser-test-report.json 2>/dev/null || echo 0))),
    "passedTests": $(($(jq '.summary.passed' test-report.json 2>/dev/null || echo 0) + $(jq '.summary.passed' browser-test-report.json 2>/dev/null || echo 0))),
    "failedTests": $(($(jq '.summary.failed' test-report.json 2>/dev/null || echo 0) + $(jq '.summary.failed' browser-test-report.json 2>/dev/null || echo 0)))
  }
}
EOF
        
        print_success "Combined test report generated: combined-test-report.json"
    fi
}

# Main execution
main() {
    echo "Starting automated test suite at $(date)"
    echo ""
    
    # Check app status
    if ! check_app_status; then
        print_error "Application is not running. Please start the application first."
        exit 1
    fi
    
    # Run tests
    api_result=0
    browser_result=0
    perf_result=0
    
    # API Tests
    if ! run_api_tests; then
        api_result=1
    fi
    
    echo ""
    
    # Browser Tests
    if ! run_browser_tests; then
        browser_result=1
    fi
    
    echo ""
    
    # Performance Tests
    if ! run_performance_tests; then
        perf_result=1
    fi
    
    echo ""
    
    # Generate report
    generate_report
    
    # Final summary
    echo "=============================================="
    echo "Test Suite Summary:"
    echo "  API Tests: $([ $api_result -eq 0 ] && echo "✅ PASSED" || echo "❌ FAILED")"
    echo "  Browser Tests: $([ $browser_result -eq 0 ] && echo "✅ PASSED" || echo "❌ FAILED")"
    echo "  Performance Tests: $([ $perf_result -eq 0 ] && echo "✅ PASSED" || echo "❌ FAILED")"
    echo "=============================================="
    
    # Exit with error if any tests failed
    if [ $api_result -ne 0 ] || [ $browser_result -ne 0 ] || [ $perf_result -ne 0 ]; then
        print_error "Some tests failed. Check the reports for details."
        exit 1
    else
        print_success "All tests passed! 🎉"
        exit 0
    fi
}

# Run main function
main "$@"
