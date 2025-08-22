#!/usr/bin/env node
require('dotenv').config({ path: '.env.development' });

const { ConfigService } = require('@nestjs/config');
const { EventEmitter2 } = require('@nestjs/event-emitter');
const { OpenAIService } = require('../dist/modules/conversation-engine/services/openai.service');
const { DecisionEngineService } = require('../dist/modules/conversation-engine/services/decision-engine.service');

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

async function testDoctorGoal() {
  console.log('🧪 Testing AI Engine with Doctor Appointment Goal...\n');
  
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
    
    // Test hospital/clinic scenario
    const mockCallSid = 'TEST_CALL_' + Date.now();
    const mockPhoneNumber = '+15551234567';
    
    // Start a session with doctor appointment goal
    console.log(`\n🏁 Starting test session for call: ${mockCallSid}`);
    decisionEngineService.startCallSession(
      mockCallSid, 
      mockPhoneNumber, 
      'I need to schedule an appointment with a cardiologist',
      'Memorial Hospital'
    );
    
    // Mock hospital IVR menu options
    const mockMenuOptions = [
      { key: '1', description: 'Scheduling appointments and consultations', confidence: 0.95 },
      { key: '2', description: 'Billing and insurance questions', confidence: 0.92 },
      { key: '3', description: 'Emergency department', confidence: 0.88 },
      { key: '4', description: 'Pharmacy refills and prescriptions', confidence: 0.90 },
      { key: '5', description: 'Patient information and records', confidence: 0.85 },
      { key: '0', description: 'Speak with the operator', confidence: 0.80 }
    ];
    
    const fullText = "Thank you for calling Memorial Hospital. To better assist you, please select from the following options: Press 1 for scheduling appointments and consultations, press 2 for billing and insurance questions, press 3 for emergency department, press 4 for pharmacy refills and prescriptions, press 5 for patient information and records, or press 0 to speak with an operator.";
    
    console.log(`\n🎯 Testing AI decision making for doctor appointment...`);
    console.log(`Goal: "I need to schedule an appointment with a cardiologist"`);
    console.log(`Company: "Memorial Hospital"`);
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
      
      // Expected: Should select option 1 for scheduling appointments
      if (decision.selectedOption === '1') {
        console.log(`\n🎊 SUCCESS: AI correctly selected appointment scheduling option!`);
      } else {
        console.log(`\n⚠️  UNEXPECTED: AI selected option ${decision.selectedOption} instead of 1 (appointment scheduling)`);
        console.log(`   This might still be valid depending on the reasoning.`);
      }
    } else {
      console.log(`\n❌ FAILED: No decision returned`);
    }
    
    // Test another scenario - finding specific department
    console.log(`\n\n🏥 Testing second scenario - finding specific doctor department...`);
    
    const mockCallSid2 = 'TEST_CALL_' + (Date.now() + 1);
    decisionEngineService.startCallSession(
      mockCallSid2, 
      mockPhoneNumber, 
      'I need to find the orthopedic surgery department',
      'City Medical Center'
    );
    
    const departmentMenuOptions = [
      { key: '1', description: 'Cardiology and heart services', confidence: 0.90 },
      { key: '2', description: 'Orthopedic surgery and sports medicine', confidence: 0.95 },
      { key: '3', description: 'Pediatrics and children services', confidence: 0.88 },
      { key: '4', description: 'Radiology and imaging', confidence: 0.85 },
      { key: '9', description: 'Directory and hospital information', confidence: 0.92 }
    ];
    
    const departmentText = "Welcome to City Medical Center. Please press 1 for cardiology and heart services, press 2 for orthopedic surgery and sports medicine, press 3 for pediatrics and children services, press 4 for radiology and imaging, or press 9 for directory and hospital information.";
    
    const decision2 = await decisionEngineService.makeManualDecision(
      mockCallSid2,
      departmentMenuOptions,
      departmentText
    );
    
    if (decision2) {
      console.log(`\n🎉 SECOND AI DECISION RESULT:`);
      console.log(`   ✅ Selected Option: ${decision2.selectedOption}`);
      console.log(`   🧠 Reasoning: ${decision2.reasoning}`);
      console.log(`   💬 Response: "${decision2.response}"`);
      console.log(`   📊 Confidence: ${(decision2.confidence * 100).toFixed(1)}%`);
      console.log(`   🎬 Next Action: ${decision2.nextAction}`);
      
      // Expected: Should select option 2 for orthopedic surgery
      if (decision2.selectedOption === '2') {
        console.log(`\n🎊 SUCCESS: AI correctly selected orthopedic surgery department!`);
      } else {
        console.log(`\n⚠️  UNEXPECTED: AI selected option ${decision2.selectedOption} instead of 2 (orthopedic surgery)`);
        console.log(`   This might still be valid depending on the reasoning.`);
      }
    }
    
    // Clean up sessions
    await decisionEngineService.handleCallCompleted(mockCallSid);
    await decisionEngineService.handleCallCompleted(mockCallSid2);
    
  } catch (error) {
    console.error(`\n💥 Test failed: ${error.message}`);
    console.error(error.stack);
    process.exit(1);
  }
}

testDoctorGoal().then(() => {
  console.log(`\n✅ Doctor appointment goal test completed!`);
  process.exit(0);
}).catch(error => {
  console.error(`\n💥 Test error: ${error.message}`);
  process.exit(1);
});