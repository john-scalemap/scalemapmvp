// Artillery processor for load testing scenarios
module.exports = {
  setJWT: setJWT,
  generateTestData: generateTestData,
  validateResponse: validateResponse
};

// Set JWT token in context for authenticated requests
function setJWT(requestParams, context, ee, next) {
  // Add JWT token if available in context
  if (context.vars.authToken) {
    requestParams.headers = requestParams.headers || {};
    requestParams.headers['Authorization'] = `Bearer ${context.vars.authToken}`;
  }
  return next();
}

// Generate test data for various scenarios
function generateTestData(requestParams, context, ee, next) {
  const testData = {
    randomEmail: `loadtest${Math.floor(Math.random() * 10000)}@example.com`,
    randomPassword: 'LoadTest123!',
    randomFileName: `test-doc-${Math.floor(Math.random() * 1000)}.pdf`,
    randomAssessmentTitle: `Performance Test Assessment ${Math.floor(Math.random() * 1000)}`
  };

  // Merge test data into context
  Object.assign(context.vars, testData);
  return next();
}

// Validate response and capture performance metrics
function validateResponse(requestParams, response, context, ee, next) {
  const responseTime = Date.now() - context.startTime;

  // Custom metrics for monitoring
  ee.emit('customStat', 'response_time_ms', responseTime);

  if (response.statusCode >= 400) {
    ee.emit('customStat', 'error_responses', 1);
    console.error(`Error response: ${response.statusCode} - ${response.body}`);
  } else {
    ee.emit('customStat', 'successful_responses', 1);
  }

  // Track specific endpoint performance
  const endpoint = requestParams.url || 'unknown';
  ee.emit('customStat', `${endpoint.replace(/[^a-zA-Z0-9]/g, '_')}_response_time`, responseTime);

  return next();
}