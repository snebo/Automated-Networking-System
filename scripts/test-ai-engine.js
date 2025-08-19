#!/usr/bin/env node
require('dotenv').config({ path: '.env.development' });

const { ConfigService } = require('@nestjs/config');
const { EventEmitter2 } = require('@nestjs/event-emitter');
const { OpenAIService } = require('../dist/modules/ai-engine/services/openai.service');
const { DecisionEngineService } = require('../dist/modules/ai-engine/services/decision-engine.service');

// Mock ConfigService
class MockConfigService {
  get(key, defaultValue = null) {
    const env = process.env;
    
    // Map configuration keys to environment variables
    const keyMap = {
      'ai.openai.apiKey': env.OPENAI_API_KEY,
      'ai.openai.model': env.OPENAI_MODEL || 'gpt-4o-mini',
    };
    
    return keyMap[key] || defaultValue;
  }
}

async function testAIEngine() {
  console.log('🧪 Testing AI Decision Engine...\n');
  
  try {
    console.log('🔧 Creating services...');
    const configService = new MockConfigService();
    const eventEmitter = new EventEmitter2();
    
    const openaiService = new OpenAIService(configService);
    const decisionEngineService = new DecisionEngineService(openaiService, eventEmitter);
    
    console.log('✅ Services initialized successfully');
    console.log(`📊 OpenAI Available: ${openaiService.isAvailable()}`);
    
    if (!openaiService.isAvailable()) {
      console.error('❌ OpenAI service not available - check API key configuration');
      return;
    }
    
    // Test mock IVR menu detection
    const mockCallSid = 'TEST_CALL_' + Date.now();
    const mockPhoneNumber = '+15551234567';
    
    // Start a session
    console.log(`\n🏁 Starting test session for call: ${mockCallSid}`);
    decisionEngineService.startCallSession(
      mockCallSid, 
      mockPhoneNumber, 
      'I need technical support for my internet connection',
      'Comcast Business'
    );
    
    // Mock IVR menu options
    const mockMenuOptions = [
      { key: '1', description: 'Sales and new orders', confidence: 0.95 },
      { key: '2', description: 'Technical support and troubleshooting', confidence: 0.98 },
      { key: '3', description: 'Billing and account information', confidence: 0.92 },
      { key: '4', description: 'Report service outage', confidence: 0.89 },
      { key: '0', description: 'Speak to an operator', confidence: 0.85 }
    ];
    
    const fullText = "Thank you for calling Comcast Business. To help you better, please listen to the following options: Press 1 for sales and new orders, press 2 for technical support and troubleshooting, press 3 for billing and account information, press 4 to report a service outage, or press 0 to speak with an operator.";
    
    console.log(`\n🎯 Testing AI decision making...`);
    console.log(`Goal: "I need technical support for my internet connection"`);
    console.log(`Available options: ${mockMenuOptions.length}`);
    
    const decision = await decisionEngineService.makeManualDecision(
      mockCallSid,
      mockMenuOptions,
      fullText
    );
    
    if (decision) {
      console.log(`\n🎉 AI DECISION RESULT:`);
      console.log(`   ✅ Selected Option: ${decision.selectedOption}`);
      console.log(`   🧠 Reasoning: ${decision.reasoning}`);
      console.log(`   💬 Response: "${decision.response}"`);
      console.log(`   📊 Confidence: ${(decision.confidence * 100).toFixed(1)}%`);
      console.log(`   🎬 Next Action: ${decision.nextAction}`);
      
      // Expected: Should select option 2 for technical support
      if (decision.selectedOption === '2') {
        console.log(`\n🎊 SUCCESS: AI correctly selected technical support option!`);
      } else {
        console.log(`\n⚠️  UNEXPECTED: AI selected option ${decision.selectedOption} instead of 2 (technical support)`);
        console.log(`   This might still be valid depending on the reasoning.`);
      }
    } else {
      console.log(`\n❌ FAILED: No decision returned`);
    }
    
    // Clean up session
    await decisionEngineService.handleCallCompleted(mockCallSid);
    
  } catch (error) {
    console.error(`\n💥 Test failed: ${error.message}`);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  testAIEngine().then(() => {
    console.log(`\n✅ AI Engine test completed!`);
    process.exit(0);
  }).catch(error => {
    console.error(`\n💥 Test error: ${error.message}`);
    process.exit(1);
  });
}

module.exports = { testAIEngine };