#!/usr/bin/env node

console.log('🔍 Testing IVR Detection Patterns...\n');

// Sample IVR menu transcripts to test
const testTranscripts = [
  {
    text: "Thank you for calling ABC Corporation. For sales, press 1. For support, press 2. For billing, press 3.",
    expectedOptions: [
      { key: "1", description: "sales" },
      { key: "2", description: "support" }, 
      { key: "3", description: "billing" }
    ]
  },
  {
    text: "Please listen carefully as our menu options have changed. Press 1 for new customers. Press 2 for existing customers. Press 0 for the operator.",
    expectedOptions: [
      { key: "1", description: "new customers" },
      { key: "2", description: "existing customers" },
      { key: "0", description: "operator" }
    ]
  },
  {
    text: "For technical support, press 1. For billing questions, press 2. For our directory, dial 0.",
    expectedOptions: [
      { key: "1", description: "technical support" },
      { key: "2", description: "billing questions" },
      { key: "0", description: "directory" }
    ]
  },
  {
    text: "Hello, this is just a regular conversation without any menu options.",
    expectedOptions: []
  },
  {
    text: "To speak with sales, press 1. For customer service, press 2. To hear our hours, press 3. To repeat this menu, press 9.",
    expectedOptions: [
      { key: "1", description: "sales" },
      { key: "2", description: "customer service" },
      { key: "3", description: "hours" },
      { key: "9", description: "repeat this menu" }
    ]
  }
];

// IVR detection patterns (copied from service)
const ivrPatterns = [
  /press\s+(\d+|\*|\#)\s+for\s+(.+?)(?=\.|,|press|\s*$)/gi,
  /for\s+(.+?),?\s+press\s+(\d+|\*|\#)/gi,
  /(\d+|\*|\#)\s+for\s+(.+?)(?=\.|,|\d|\s*$)/gi,
  /to\s+(.+?),?\s+press\s+(\d+|\*|\#)/gi,
  /dial\s+(\d+|\*|\#)\s+for\s+(.+)/gi,
  /enter\s+(\d+|\*|\#)\s+for\s+(.+)/gi,
];

// Test function to detect IVR options
function testIVRDetection(transcript) {
  const text = transcript.toLowerCase();
  const options = [];
  
  // Check if this looks like an IVR menu
  const indicators = ['press', 'dial', 'enter', 'select', 'for', 'menu', 'options', 'department'];
  const indicatorCount = indicators.filter(indicator => text.includes(indicator)).length;
  const hasNumbers = /\b\d+\b/.test(text);
  
  if (indicatorCount < 2 && !(indicatorCount >= 1 && hasNumbers)) {
    return [];
  }
  
  // Extract menu options using patterns
  for (const pattern of ivrPatterns) {
    pattern.lastIndex = 0;
    let match;
    
    while ((match = pattern.exec(text)) !== null) {
      let key, description;
      
      if (pattern.source.includes('press\\s+(\\d+|\\*|\\#)\\s+for')) {
        key = match[1];
        description = match[2];
      } else if (pattern.source.includes('for\\s+(.+?),?\\s+press\\s+(\\d+|\\*|\\#)')) {
        key = match[2];
        description = match[1];
      } else if (pattern.source.includes('to\\s+(.+?),?\\s+press\\s+(\\d+|\\*|\\#)')) {
        key = match[2];
        description = match[1];
      } else {
        continue;
      }
      
      if (key && description) {
        const cleanDescription = description.trim().replace(/\s+/g, ' ').replace(/[,.]+$/, '');
        options.push({
          key: key.trim(),
          description: cleanDescription
        });
      }
    }
  }
  
  // Remove duplicates
  const seen = new Set();
  return options.filter(option => {
    const identifier = option.key + ':' + option.description;
    if (seen.has(identifier)) return false;
    seen.add(identifier);
    return true;
  });
}

// Run tests
let passedTests = 0;
let totalTests = testTranscripts.length;

console.log('Running IVR detection tests...\n');

testTranscripts.forEach((test, index) => {
  console.log(`Test ${index + 1}: "${test.text.substring(0, 60)}${test.text.length > 60 ? '...' : ''}"`);
  
  const detectedOptions = testIVRDetection(test.text);
  
  console.log(`  Detected ${detectedOptions.length} options:`);
  detectedOptions.forEach(option => {
    console.log(`    - Press ${option.key} for ${option.description}`);
  });
  
  // Check if detection matches expected
  const passed = detectedOptions.length === test.expectedOptions.length;
  
  if (passed) {
    console.log(`  ✅ PASS - Detected ${detectedOptions.length} options as expected`);
    passedTests++;
  } else {
    console.log(`  ❌ FAIL - Expected ${test.expectedOptions.length} options, got ${detectedOptions.length}`);
    console.log(`     Expected:`, test.expectedOptions);
  }
  
  console.log('');
});

// Results
console.log('='.repeat(50));
console.log(`📊 Test Results: ${passedTests}/${totalTests} tests passed`);

if (passedTests === totalTests) {
  console.log('🎉 All IVR detection tests passed!');
  process.exit(0);
} else {
  console.log('❌ Some tests failed. Check the patterns or expected results.');
  process.exit(1);
}