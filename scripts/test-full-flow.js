#!/usr/bin/env node

/**
 * Complete End-to-End Test Script
 * Tests the full IVR navigation to human conversation flow
 * 
 * Flow:
 * 1. Clear database (fresh start)
 * 2. Search for ER hospitals in Texas
 * 3. Generate contact script for ER doctors
 * 4. Make actual call to +12192983383
 * 5. Navigate IVR system
 * 6. Detect human interaction
 * 7. Ask for ER doctor contact information
 * 8. Save response to database
 * 9. Verify stored results
 */

const axios = require('axios');
const { PrismaClient } = require('@prisma/client');

const BASE_URL = 'http://localhost:3000';
const TEST_PHONE = '+12192983383';
const prisma = new PrismaClient();

class FullFlowTester {
  constructor() {
    this.testResults = {
      startTime: new Date(),
      steps: [],
      errors: [],
      success: false
    };
  }

  async runTest() {
    console.log('\n🚀 STARTING FULL FLOW TEST');
    console.log('=====================================');
    console.log(`📞 Target Phone: ${TEST_PHONE}`);
    console.log(`🎯 Goal: Find ER doctor contact information`);
    console.log(`📍 Location: Texas hospitals\n`);

    try {
      await this.step1_ClearDatabase();
      await this.step2_SearchERHospitals();
      await this.step3_GenerateContactScript();
      await this.step4_MakeRealCall();
      await this.step5_VerifyResults();
      
      this.testResults.success = true;
      console.log('\n✅ FULL FLOW TEST COMPLETED SUCCESSFULLY!');
      this.printSummary();

    } catch (error) {
      console.error('\n❌ FULL FLOW TEST FAILED!');
      console.error(`Error: ${error.message}`);
      this.testResults.errors.push(error.message);
      this.printSummary();
      process.exit(1);
    } finally {
      await prisma.$disconnect();
    }
  }

  async step1_ClearDatabase() {
    console.log('🧹 Step 1: Clearing database for fresh start...');
    
    try {
      // Clear all tables in reverse dependency order
      await prisma.informationEntity.deleteMany({});
      await prisma.extractedInformation.deleteMany({});
      await prisma.transcript.deleteMany({});
      await prisma.callEvent.deleteMany({});
      await prisma.ivrMap.deleteMany({});
      await prisma.callSession.deleteMany({});
      await prisma.business.deleteMany({});
      await prisma.phoneNumber.deleteMany({});
      // Keep scripts as they're reusable
      
      console.log('   ✅ Database cleared successfully');
      this.testResults.steps.push('Database cleared');
      
    } catch (error) {
      throw new Error(`Database clear failed: ${error.message}`);
    }
  }

  async step2_SearchERHospitals() {
    console.log('\n🏥 Step 2: Searching for ER hospitals in Texas...');
    
    try {
      const searchRequest = {
        businessType: 'hospitals',
        location: 'Texas',
        targetPerson: 'er doctor',
        specificGoal: 'Find emergency room doctors contact information',
        onlyBusinessListings: true,
        minRating: 3.0,
        maxResults: 10
      };

      console.log('   📋 Search parameters:', JSON.stringify(searchRequest, null, 2));

      const response = await axios.post(`${BASE_URL}/scraper/scrape-integrated`, searchRequest);
      
      if (response.data.businesses && response.data.businesses.length > 0) {
        console.log(`   ✅ Found ${response.data.businesses.length} hospitals`);
        console.log('   📊 Sample businesses:');
        response.data.businesses.slice(0, 3).forEach((business, index) => {
          console.log(`      ${index + 1}. ${business.name} - ${business.addressFormatted || 'No address'}`);
        });
        
        this.testResults.steps.push(`Found ${response.data.businesses.length} hospitals`);
        this.businessData = response.data;
      } else {
        throw new Error('No hospitals found in search results');
      }

    } catch (error) {
      if (error.response) {
        throw new Error(`Search failed: ${error.response.status} - ${error.response.data.message || 'Unknown error'}`);
      } else {
        throw new Error(`Search request failed: ${error.message}`);
      }
    }
  }

  async step3_GenerateContactScript() {
    console.log('\n📝 Step 3: Generating contact script for ER doctors...');
    
    try {
      // The script should already be generated from the integrated scraper
      // But let's verify we have businesses with scripts
      const businessesResponse = await axios.get(`${BASE_URL}/scraper/businesses/with-scripts`);
      
      if (businessesResponse.data.businesses && businessesResponse.data.businesses.length > 0) {
        const businessWithScript = businessesResponse.data.businesses[0];
        console.log('   ✅ Script generated successfully');
        console.log(`   📋 Script: ${businessWithScript.assignedScript?.name || 'Auto-generated script'}`);
        console.log(`   🎯 Goal: ${businessWithScript.assignedScript?.goal || businessWithScript.customGoal || 'Find ER doctor contact'}`);
        
        this.testResults.steps.push('Script generated for ER doctor inquiry');
        this.selectedBusiness = businessWithScript;
      } else {
        throw new Error('No businesses with scripts found after scraping');
      }

    } catch (error) {
      if (error.response) {
        throw new Error(`Script verification failed: ${error.response.status} - ${error.response.data.message || 'Unknown error'}`);
      } else {
        throw new Error(`Script verification request failed: ${error.message}`);
      }
    }
  }

  async step4_MakeRealCall() {
    console.log('\n📞 Step 4: Making real call to test number...');
    console.log(`   🎯 Calling: ${TEST_PHONE}`);
    console.log(`   📍 Goal: Find ER doctor contact information`);
    
    try {
      // Initiate the actual call
      const callRequest = {
        phoneNumber: TEST_PHONE,
        goal: 'Find emergency room doctor contact information at this facility',
        targetPerson: 'er doctor',
        companyName: 'Hospital Test Call'
      };

      console.log('   🔄 Initiating call...');
      const callResponse = await axios.post(`${BASE_URL}/telephony/call`, callRequest);
      
      if (callResponse.data.callSid) {
        this.callSid = callResponse.data.callSid;
        console.log(`   📞 Call initiated: ${this.callSid}`);
        console.log('   ⏳ Waiting for call to complete (90 seconds max)...');
        
        // Wait for call to complete and save response
        await this.waitForCallCompletion();
        
        this.testResults.steps.push(`Call completed: ${this.callSid}`);
      } else {
        throw new Error('Call initiation failed - no call SID returned');
      }

    } catch (error) {
      if (error.response) {
        throw new Error(`Call failed: ${error.response.status} - ${error.response.data.message || 'Unknown error'}`);
      } else {
        throw new Error(`Call request failed: ${error.message}`);
      }
    }
  }

  async waitForCallCompletion() {
    const maxWaitTime = 90000; // 90 seconds
    const pollInterval = 3000; // 3 seconds
    const startTime = Date.now();

    return new Promise((resolve, reject) => {
      const pollStatus = async () => {
        try {
          // Check if we've exceeded max wait time
          if (Date.now() - startTime > maxWaitTime) {
            reject(new Error('Call timeout - exceeded 90 seconds'));
            return;
          }

          // Check call status
          const statusResponse = await axios.get(`${BASE_URL}/telephony/call/${this.callSid}`);
          const callData = statusResponse.data;

          console.log(`   📊 Call status: ${callData.status || 'unknown'}`);

          // Check if call is completed
          if (callData.status === 'completed' || callData.status === 'failed' || callData.status === 'busy' || callData.status === 'no-answer') {
            console.log(`   ✅ Call finished with status: ${callData.status}`);
            
            // Wait a bit more for transcript processing
            setTimeout(() => {
              resolve();
            }, 5000);
            return;
          }

          // Check conversation status
          try {
            const conversationResponse = await axios.get(`${BASE_URL}/conversation/conversation-status/${this.callSid}`);
            const conversation = conversationResponse.data;

            if (conversation.hasReachedHuman) {
              console.log('   🤝 Human detected in conversation');
            }
            if (conversation.hasAskedQuestion) {
              console.log(`   🗣️ Question asked: "${conversation.questionAsked}"`);
            }
            if (conversation.humanResponse) {
              console.log(`   📝 Response captured: "${conversation.humanResponse}"`);
              // Give time for database save
              setTimeout(() => {
                resolve();
              }, 2000);
              return;
            }
          } catch (convError) {
            // Conversation endpoint might not have data yet, continue polling
          }

          // Continue polling
          setTimeout(pollStatus, pollInterval);

        } catch (error) {
          reject(new Error(`Status polling failed: ${error.message}`));
        }
      };

      pollStatus();
    });
  }

  async step5_VerifyResults() {
    console.log('\n🔍 Step 5: Verifying saved results...');
    
    try {
      // Check call session was created
      const callSession = await prisma.callSession.findUnique({
        where: { callSid: this.callSid },
        include: {
          transcript: true,
          extractedInformation: true
        }
      });

      if (callSession) {
        console.log('   ✅ Call session saved to database');
        console.log(`   📞 Call SID: ${callSession.callSid}`);
        console.log(`   📊 Status: ${callSession.status}`);
        console.log(`   ⏱️ Duration: ${callSession.duration || 'N/A'} seconds`);

        // Check transcripts
        if (callSession.transcript && callSession.transcript.length > 0) {
          console.log(`   📝 Found ${callSession.transcript.length} transcript entries`);
          
          const humanTranscripts = callSession.transcript.filter(t => t.speaker === 'human');
          if (humanTranscripts.length > 0) {
            console.log('   🗣️ Human responses captured:');
            humanTranscripts.forEach((transcript, index) => {
              console.log(`      ${index + 1}. "${transcript.text}" (confidence: ${(transcript.confidence * 100).toFixed(1)}%)`);
            });
          }
        }

        // Check extracted information
        if (callSession.extractedInformation && callSession.extractedInformation.length > 0) {
          console.log(`   🧠 Found ${callSession.extractedInformation.length} information extraction entries`);
        }

        this.testResults.steps.push('Results verified in database');
        this.callResults = callSession;
      } else {
        throw new Error(`Call session ${this.callSid} not found in database`);
      }

      // Check businesses were saved
      const businessCount = await prisma.business.count();
      console.log(`   🏢 Total businesses in database: ${businessCount}`);

    } catch (error) {
      throw new Error(`Results verification failed: ${error.message}`);
    }
  }

  printSummary() {
    const duration = Date.now() - this.testResults.startTime.getTime();
    
    console.log('\n📊 TEST SUMMARY');
    console.log('================');
    console.log(`🕐 Total Duration: ${Math.round(duration / 1000)} seconds`);
    console.log(`✅ Success: ${this.testResults.success}`);
    console.log(`📝 Steps Completed: ${this.testResults.steps.length}`);
    
    if (this.testResults.steps.length > 0) {
      console.log('\n📋 Completed Steps:');
      this.testResults.steps.forEach((step, index) => {
        console.log(`   ${index + 1}. ${step}`);
      });
    }

    if (this.testResults.errors.length > 0) {
      console.log('\n❌ Errors:');
      this.testResults.errors.forEach((error, index) => {
        console.log(`   ${index + 1}. ${error}`);
      });
    }

    if (this.callSid) {
      console.log(`\n📞 Call Details:`);
      console.log(`   Call SID: ${this.callSid}`);
      console.log(`   Phone: ${TEST_PHONE}`);
      console.log(`   Goal: Find ER doctor contact information`);
    }

    console.log('\n💡 Next Steps:');
    console.log('   - Check call recordings if available');
    console.log('   - Review extracted information for accuracy');
    console.log('   - Test with different hospital numbers');
    console.log('   - Monitor system performance');
  }
}

// Run the test
async function main() {
  // Check if server is running
  try {
    await axios.get(`${BASE_URL}/telephony/calls`);
  } catch (error) {
    console.error('❌ Server not running! Please start the application first:');
    console.error('   npm run start:dev');
    process.exit(1);
  }

  const tester = new FullFlowTester();
  await tester.runTest();
}

// Handle process termination gracefully
process.on('SIGINT', async () => {
  console.log('\n\n⚠️ Test interrupted by user');
  await prisma.$disconnect();
  process.exit(0);
});

process.on('unhandledRejection', async (error) => {
  console.error('\n❌ Unhandled error:', error);
  await prisma.$disconnect();
  process.exit(1);
});

// Run the test
if (require.main === module) {
  main().catch(async (error) => {
    console.error('❌ Test failed:', error);
    await prisma.$disconnect();
    process.exit(1);
  });
}

module.exports = { FullFlowTester };