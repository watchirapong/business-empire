#!/bin/bash

# Business Empire App - Design Validation Test Runner
# Runs comprehensive tests to validate ALL features from PROJECT_MANAGEMENT_SYSTEM_DESIGN.md

echo "🚀 Business Empire App - Design Validation Test Suite"
echo "====================================================="
echo "📋 Testing ALL features from PROJECT_MANAGEMENT_SYSTEM_DESIGN.md"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
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

print_header() {
    echo -e "${PURPLE}[HEADER]${NC} $1"
}

print_section() {
    echo -e "${CYAN}[SECTION]${NC} $1"
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

# Run API Design Tests
run_api_design_tests() {
    print_section "Running API Design Validation Tests..."
    cd /root/projects/business-empire
    
    if node api-design-tests.js; then
        print_success "API design tests completed successfully"
        return 0
    else
        print_error "API design tests failed"
        return 1
    fi
}

# Run Comprehensive Design Tests
run_comprehensive_design_tests() {
    print_section "Running Comprehensive Design Validation Tests..."
    cd /root/projects/business-empire
    
    # Install playwright if not already installed
    if ! command -v playwright &> /dev/null; then
        print_status "Installing Playwright..."
        npm install -g playwright
        playwright install chromium
    fi
    
    if node comprehensive-design-tests.js; then
        print_success "Comprehensive design tests completed successfully"
        return 0
    else
        print_error "Comprehensive design tests failed"
        return 1
    fi
}

# Run Original Test Suite
run_original_tests() {
    print_section "Running Original Test Suite..."
    cd /root/projects/business-empire
    
    if npm run test; then
        print_success "Original tests completed successfully"
        return 0
    else
        print_error "Original tests failed"
        return 1
    fi
}

# Generate Master Report
generate_master_report() {
    print_section "Generating Master Design Validation Report..."
    cd /root/projects/business-empire
    
    # Check if all reports exist
    reports=("test-report.json" "api-design-validation-report.json" "design-validation-report.json")
    existing_reports=()
    
    for report in "${reports[@]}"; do
        if [ -f "$report" ]; then
            existing_reports+=("$report")
        fi
    done
    
    if [ ${#existing_reports[@]} -gt 0 ]; then
        echo "Combining test reports..."
        
        # Create master report
        cat > master-design-validation-report.json << EOF
{
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "application": "Business Empire Project Manager",
  "designDocument": "PROJECT_MANAGEMENT_SYSTEM_DESIGN.md",
  "testSuites": {
EOF

        # Add each existing report
        for i in "${!existing_reports[@]}"; do
            report="${existing_reports[$i]}"
            echo "    \"$(basename "$report" .json)\": $(cat "$report")" >> master-design-validation-report.json
            
            if [ $i -lt $((${#existing_reports[@]} - 1)) ]; then
                echo "," >> master-design-validation-report.json
            fi
        done
        
        echo "  }," >> master-design-validation-report.json
        
        # Calculate overall summary
        total_tests=0
        total_passed=0
        total_failed=0
        
        for report in "${existing_reports[@]}"; do
            if [ -f "$report" ]; then
                tests=$(jq '.summary.total' "$report" 2>/dev/null || echo 0)
                passed=$(jq '.summary.passed' "$report" 2>/dev/null || echo 0)
                failed=$(jq '.summary.failed' "$report" 2>/dev/null || echo 0)
                
                total_tests=$((total_tests + tests))
                total_passed=$((total_passed + passed))
                total_failed=$((total_failed + failed))
            fi
        done
        
        success_rate=0
        if [ $total_tests -gt 0 ]; then
            success_rate=$(echo "scale=1; $total_passed * 100 / $total_tests" | bc)
        fi
        
        cat >> master-design-validation-report.json << EOF
  "masterSummary": {
    "totalTests": $total_tests,
    "passedTests": $total_passed,
    "failedTests": $total_failed,
    "successRate": $success_rate,
    "testSuitesRun": ${#existing_reports[@]}
  }
}
EOF
        
        print_success "Master design validation report generated: master-design-validation-report.json"
        
        # Display summary
        echo ""
        print_header "🎯 MASTER DESIGN VALIDATION SUMMARY"
        echo "=============================================="
        echo "Total Tests Run: $total_tests"
        echo "Passed: $total_passed ✅"
        echo "Failed: $total_failed ❌"
        echo "Success Rate: $success_rate%"
        echo "Test Suites: ${#existing_reports[@]}"
        echo "=============================================="
        
    else
        print_warning "No test reports found to combine"
    fi
}

# Main execution
main() {
    echo "Starting design validation test suite at $(date)"
    echo ""
    
    # Check app status
    if ! check_app_status; then
        print_error "Application is not running. Please start the application first."
        exit 1
    fi
    
    # Run all test suites
    api_result=0
    comprehensive_result=0
    original_result=0
    
    # API Design Tests
    if ! run_api_design_tests; then
        api_result=1
    fi
    
    echo ""
    
    # Comprehensive Design Tests
    if ! run_comprehensive_design_tests; then
        comprehensive_result=1
    fi
    
    echo ""
    
    # Original Tests
    if ! run_original_tests; then
        original_result=1
    fi
    
    echo ""
    
    # Generate master report
    generate_master_report
    
    # Final summary
    echo ""
    print_header "🎯 FINAL DESIGN VALIDATION SUMMARY"
    echo "=============================================="
    echo "API Design Tests: $([ $api_result -eq 0 ] && echo "✅ PASSED" || echo "❌ FAILED")"
    echo "Comprehensive Design Tests: $([ $comprehensive_result -eq 0 ] && echo "✅ PASSED" || echo "❌ FAILED")"
    echo "Original Tests: $([ $original_result -eq 0 ] && echo "✅ PASSED" || echo "❌ FAILED")"
    echo "=============================================="
    
    # Exit with error if any tests failed
    if [ $api_result -ne 0 ] || [ $comprehensive_result -ne 0 ] || [ $original_result -ne 0 ]; then
        print_error "Some design validation tests failed. Check the reports for details."
        print_status "Review the design document and implement missing features."
        exit 1
    else
        print_success "All design validation tests passed! 🎉"
        print_success "Your application fully implements the PROJECT_MANAGEMENT_SYSTEM_DESIGN.md specification!"
        exit 0
    fi
}

# Run main function
main "$@"
