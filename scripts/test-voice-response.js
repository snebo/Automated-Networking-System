#!/usr/bin/env node

// Load environment variables
require('dotenv').config({ path: '.env.development' });

const { NestFactory } = require('@nestjs/core');

async function testVoiceResponse() {
  console.log('🎙️ Testing AI Voice Response with Fable Voice...\n');
  
  try {
    const { AppModule } = require('../dist/app.module');
    const { OpenAITTSService } = require('../dist/modules/speech-processor/services/openai-tts.service');

    const app = await NestFactory.createApplicationContext(AppModule, {
      logger: ['error', 'warn'],
    });

    const ttsService = app.get(OpenAITTSService);
    
    if (!ttsService.isAvailable()) {
      console.log('❌ TTS service not available');
      await app.close();
      process.exit(1);
    }

    // Test IVR response
    const testMessage = "I have detected an IVR menu. I will now select option 1 for sales and navigate the system for you.";
    
    console.log('🔊 Generating voice response...');
    console.log(`📝 Text: "${testMessage}"`);
    
    const audioBuffer = await ttsService.generateSpeech(testMessage);
    
    console.log(`✅ Generated ${(audioBuffer.length / 1024).toFixed(1)}KB of audio`);
    console.log('🎭 Voice: Fable (natural, conversational)');
    console.log('💡 Ready for integration into call flow!\n');

    await app.close();
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

testVoiceResponse();