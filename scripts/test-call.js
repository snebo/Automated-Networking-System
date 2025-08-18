#!/usr/bin/env node

const axios = require('axios');

// Test configuration
const APP_URL = process.env.APP_URL || 'http://localhost:3000';
const TEST_PHONE_NUMBER = process.argv[2] || process.env.TEST_PHONE_NUMBER;

if (!TEST_PHONE_NUMBER) {
  console.log('❌ Please provide a test phone number');
  console.log('Usage: node scripts/test-call.js +1234567890');
  console.log('Or set TEST_PHONE_NUMBER environment variable');
  process.exit(1);
}

async function testCall() {
  console.log('📞 Testing Twilio Integration...\n');
  
  try {
    // Test 1: Check if server is running
    console.log('1️⃣ Checking if server is running...');
    await axios.get(`${APP_URL}/telephony/calls`);
    console.log('✅ Server is running');
    
    // Test 2: Initiate a test call
    console.log(`\n2️⃣ Initiating test call to ${TEST_PHONE_NUMBER}...`);
    const response = await axios.post(`${APP_URL}/telephony/call`, {
      phoneNumber: TEST_PHONE_NUMBER,
      scriptId: 'test-script-' + Date.now()
    });
    
    const callSid = response.data.callSid;
    console.log(`✅ Call initiated successfully! Call SID: ${callSid}`);
    
    // Test 3: Check call status
    console.log('\n3️⃣ Checking call status...');
    setTimeout(async () => {
      try {
        const statusResponse = await axios.get(`${APP_URL}/telephony/call/${callSid}`);
        console.log(`✅ Call status: ${statusResponse.data.status}`);
        console.log('📱 Answer the call to test the full flow!');
        
        // Test 4: Send DTMF after delay (uncomment to test)
        // setTimeout(async () => {
        //   try {
        //     await axios.post(`${APP_URL}/telephony/call/${callSid}/dtmf`, {
        //       digits: '123#'
        //     });
        //     console.log('✅ DTMF sent successfully');
        //   } catch (error) {
        //     console.log('❌ DTMF test failed:', error.response?.data || error.message);
        //   }
        // }, 10000);
        
      } catch (error) {
        console.log('❌ Status check failed:', error.response?.data || error.message);
      }
    }, 2000);
    
  } catch (error) {
    console.log('❌ Test failed:', error.response?.data || error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('💡 Make sure your NestJS server is running: npm run start:dev');
    }
  }
}

testCall();