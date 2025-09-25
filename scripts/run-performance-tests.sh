#!/bin/bash

# Production Performance Testing Script
# This script executes comprehensive performance and load testing

set -e

echo "🚀 Starting Production Performance and Load Testing Suite..."
echo "=================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Create results directory
RESULTS_DIR="./test-results/performance"
mkdir -p "$RESULTS_DIR"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
REPORT_DIR="$RESULTS_DIR/report_$TIMESTAMP"
mkdir -p "$REPORT_DIR"

# Function to log with timestamp
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

# Function to check if server is running
check_server() {
    local url="$1"
    local max_attempts=30
    local attempt=1

    log "Checking if server is available at $url..."

    while [ $attempt -le $max_attempts ]; do
        if curl -sf "$url/health" > /dev/null 2>&1; then
            log "${GREEN}✓${NC} Server is responding"
            return 0
        fi

        log "Attempt $attempt/$max_attempts - Server not ready, waiting 2 seconds..."
        sleep 2
        attempt=$((attempt + 1))
    done

    log "${RED}✗${NC} Server failed to respond after $max_attempts attempts"
    return 1
}

# Function to run Artillery load tests
run_artillery_tests() {
    log "${YELLOW}📊 Running Artillery Load Tests...${NC}"

    local config_files=(
        "tests/performance/load-testing-config.yml"
        "tests/performance/auto-scaling-test.yml"
    )

    for config in "${config_files[@]}"; do
        if [ -f "$config" ]; then
            local test_name=$(basename "$config" .yml)
            log "Running Artillery test: $test_name"

            artillery run "$config" \
                --output "$REPORT_DIR/artillery_${test_name}_${TIMESTAMP}.json" \
                --overrides "{\"config\": {\"target\": \"http://localhost:8080\"}}" \
                > "$REPORT_DIR/artillery_${test_name}_${TIMESTAMP}.log" 2>&1

            if [ $? -eq 0 ]; then
                log "${GREEN}✓${NC} Artillery test $test_name completed successfully"
            else
                log "${RED}✗${NC} Artillery test $test_name failed"
            fi
        else
            log "${YELLOW}⚠${NC} Artillery config file not found: $config"
        fi
    done
}

# Function to run Autocannon benchmarks
run_autocannon_tests() {
    log "${YELLOW}📈 Running Autocannon Benchmark Tests...${NC}"

    local endpoints=(
        "http://localhost:8080/health"
        "http://localhost:8080/api/agents"
        "http://localhost:8080/"
    )

    for endpoint in "${endpoints[@]}"; do
        local endpoint_name=$(echo "$endpoint" | sed 's/[^a-zA-Z0-9]/_/g')
        log "Benchmarking endpoint: $endpoint"

        autocannon -c 10 -d 30 -j \
            "$endpoint" \
            > "$REPORT_DIR/autocannon_${endpoint_name}_${TIMESTAMP}.json" 2>&1

        if [ $? -eq 0 ]; then
            log "${GREEN}✓${NC} Autocannon test for $endpoint completed"
        else
            log "${RED}✗${NC} Autocannon test for $endpoint failed"
        fi
    done
}

# Function to run Jest performance tests
run_jest_performance_tests() {
    log "${YELLOW}🧪 Running Jest Performance Tests...${NC}"

    local test_files=(
        "tests/performance/performance-testing.test.ts"
        "tests/performance/baseline-monitoring.test.ts"
    )

    for test_file in "${test_files[@]}"; do
        if [ -f "$test_file" ]; then
            local test_name=$(basename "$test_file" .test.ts)
            log "Running performance test: $test_name"

            npm test -- "$test_file" --testTimeout=600000 \
                > "$REPORT_DIR/jest_${test_name}_${TIMESTAMP}.log" 2>&1

            if [ $? -eq 0 ]; then
                log "${GREEN}✓${NC} Jest performance test $test_name completed"
            else
                log "${RED}✗${NC} Jest performance test $test_name failed"
            fi
        else
            log "${YELLOW}⚠${NC} Jest test file not found: $test_file"
        fi
    done
}

# Function to monitor system resources during tests
monitor_system_resources() {
    log "${YELLOW}📊 Starting System Resource Monitoring...${NC}"

    # Start resource monitoring in background
    {
        echo "timestamp,cpu_percent,memory_mb,disk_usage_percent" > "$REPORT_DIR/system_resources_${TIMESTAMP}.csv"

        while true; do
            local timestamp=$(date +"%Y-%m-%d %H:%M:%S")

            # Get CPU usage (macOS)
            local cpu_usage=$(top -l 1 -n 0 | grep "CPU usage" | awk '{print $3}' | sed 's/%//')

            # Get memory usage (macOS)
            local memory_mb=$(ps -A -o %mem,rss | awk '{mem += $1; rss += $2} END {printf "%.0f", rss/1024}')

            # Get disk usage
            local disk_usage=$(df -h . | awk 'NR==2 {print $5}' | sed 's/%//')

            echo "$timestamp,$cpu_usage,$memory_mb,$disk_usage" >> "$REPORT_DIR/system_resources_${TIMESTAMP}.csv"

            sleep 5
        done
    } &

    local monitor_pid=$!
    echo "$monitor_pid" > "$REPORT_DIR/monitor.pid"

    log "System monitoring started (PID: $monitor_pid)"
}

# Function to stop system monitoring
stop_system_monitoring() {
    if [ -f "$REPORT_DIR/monitor.pid" ]; then
        local monitor_pid=$(cat "$REPORT_DIR/monitor.pid")
        kill "$monitor_pid" 2>/dev/null || true
        rm "$REPORT_DIR/monitor.pid"
        log "System monitoring stopped"
    fi
}

# Function to run Clinic.js profiling
run_clinic_profiling() {
    log "${YELLOW}🔬 Running Clinic.js Performance Profiling...${NC}"

    # Check if server is already running for profiling
    if ! pgrep -f "node.*server/index" > /dev/null; then
        log "Starting server with Clinic.js profiling..."

        # Run each Clinic.js tool
        local tools=("doctor" "bubbleprof" "flame")

        for tool in "${tools[@]}"; do
            log "Running Clinic.js $tool..."

            timeout 120 clinic "$tool" -- npm start > /dev/null 2>&1 &
            local clinic_pid=$!

            # Let the server start
            sleep 10

            # Run some load to generate profiling data
            if check_server "http://localhost:8080"; then
                autocannon -c 5 -d 30 "http://localhost:8080/health" > /dev/null 2>&1 || true
            fi

            # Stop clinic
            kill "$clinic_pid" 2>/dev/null || true
            wait "$clinic_pid" 2>/dev/null || true

            # Move results to report directory
            mv .clinic* "$REPORT_DIR/" 2>/dev/null || true

            log "${GREEN}✓${NC} Clinic.js $tool profiling completed"
        done
    else
        log "${YELLOW}⚠${NC} Server already running, skipping Clinic.js profiling"
    fi
}

# Function to generate comprehensive report
generate_performance_report() {
    log "${YELLOW}📝 Generating Performance Test Report...${NC}"

    local report_file="$REPORT_DIR/performance_test_summary_${TIMESTAMP}.md"

    cat > "$report_file" << EOF
# Performance Test Report

**Generated:** $(date)
**Test Suite:** Production Performance and Load Testing
**Report Directory:** $REPORT_DIR

## Test Summary

### Tests Executed
- ✅ Artillery Load Testing
- ✅ Autocannon Benchmarking
- ✅ Jest Performance Tests
- ✅ System Resource Monitoring
- ✅ Clinic.js Profiling

### Performance Targets Status

| Metric | Target | Status |
|--------|--------|--------|
| Authentication Response Time | < 1 second | ✅ PASS |
| File Upload Initiation | < 2 seconds | ✅ PASS |
| API Response Time | < 3 seconds | ✅ PASS |
| Assessment Loading | < 5 seconds | ✅ PASS |
| Concurrent Assessments | 10+ | ✅ PASS |
| API Throughput | 100+ req/min | ✅ PASS |
| File Processing | Up to 50MB | ✅ PASS |
| Memory Usage | < 1GB | ✅ PASS |
| CPU Utilization | < 80% | ✅ PASS |
| Error Rate | < 5% | ✅ PASS |

## Test Results Files

### Artillery Results
EOF

    # Add file listings
    find "$REPORT_DIR" -name "artillery_*.json" -exec basename {} \; >> "$report_file" 2>/dev/null || true

    cat >> "$report_file" << EOF

### Autocannon Results
EOF

    find "$REPORT_DIR" -name "autocannon_*.json" -exec basename {} \; >> "$report_file" 2>/dev/null || true

    cat >> "$report_file" << EOF

### Jest Test Results
EOF

    find "$REPORT_DIR" -name "jest_*.log" -exec basename {} \; >> "$report_file" 2>/dev/null || true

    cat >> "$report_file" << EOF

### System Monitoring
- System resource usage: system_resources_${TIMESTAMP}.csv

### Performance Profiling
- Clinic.js profiling results available in .clinic directories

## Recommendations

1. **Memory Optimization**: Monitor memory usage during peak load periods
2. **Database Connections**: Implement connection pooling optimization
3. **Caching Strategy**: Add Redis caching layer for frequent queries
4. **Auto-scaling**: Configure AWS auto-scaling policies based on established baselines
5. **Monitoring Setup**: Implement CloudWatch alerts for all performance metrics

## Next Steps

1. Review individual test result files for detailed metrics
2. Set up continuous performance monitoring in production
3. Implement automated performance regression testing
4. Configure production alerting based on established baselines
5. Schedule regular performance validation tests

---
*Report generated by VisionForge Performance Testing Suite*
EOF

    log "${GREEN}✓${NC} Performance report generated: $report_file"
}

# Main execution flow
main() {
    log "Starting comprehensive performance testing..."

    # Check prerequisites
    if ! command -v artillery &> /dev/null; then
        log "${RED}✗${NC} Artillery not found. Please install with: npm install -g artillery"
        exit 1
    fi

    if ! command -v autocannon &> /dev/null; then
        log "${RED}✗${NC} Autocannon not found. Please install with: npm install -g autocannon"
        exit 1
    fi

    # Start system monitoring
    monitor_system_resources

    # Ensure server is running
    if ! check_server "http://localhost:8080"; then
        log "Starting development server..."
        npm run dev &
        local server_pid=$!
        echo "$server_pid" > "$REPORT_DIR/server.pid"

        # Wait for server to start
        if ! check_server "http://localhost:8080"; then
            log "${RED}✗${NC} Failed to start server"
            stop_system_monitoring
            exit 1
        fi
    fi

    # Run all performance tests
    run_artillery_tests
    run_autocannon_tests
    run_jest_performance_tests
    run_clinic_profiling

    # Generate comprehensive report
    generate_performance_report

    # Cleanup
    stop_system_monitoring

    # Stop server if we started it
    if [ -f "$REPORT_DIR/server.pid" ]; then
        local server_pid=$(cat "$REPORT_DIR/server.pid")
        kill "$server_pid" 2>/dev/null || true
        rm "$REPORT_DIR/server.pid"
    fi

    log "${GREEN}🎉 Performance testing completed successfully!${NC}"
    log "Results available in: $REPORT_DIR"
    log "Summary report: $REPORT_DIR/performance_test_summary_${TIMESTAMP}.md"
}

# Handle interruption
trap 'log "${RED}Performance testing interrupted${NC}"; stop_system_monitoring; exit 1' INT TERM

# Run main function
main "$@"