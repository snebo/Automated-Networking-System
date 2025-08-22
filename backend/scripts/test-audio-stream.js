#!/usr/bin/env node

const { io } = require('socket.io-client');
const crypto = require('crypto');

// Test configuration
const APP_URL = process.env.APP_URL || 'http://localhost:3000';
const TEST_CALL_SID = 'test-call-' + Date.now();
const TEST_STREAM_SID = 'test-stream-' + Date.now();

console.log('🎤 Testing Audio Stream WebSocket Integration...\n');

// Simulate Twilio WebSocket connection
const socket = io(`${APP_URL}/media-stream`, {
  transports: ['websocket'],
});

let audioChunkCount = 0;
let testComplete = false;

// Generate fake audio data (8kHz, mulaw, mono - Twilio format)
function generateFakeAudioChunk() {
  // Create a buffer with fake mulaw audio data
  const buffer = Buffer.alloc(160); // 20ms of 8kHz audio
  for (let i = 0; i < buffer.length; i++) {
    // Generate a simple sine wave encoded as mulaw
    buffer[i] = Math.floor(Math.sin(i * 0.1) * 127) + 128;
  }
  return buffer.toString('base64');
}

// Simulate IVR menu audio content
const simulateIVRMenu = [
  "Thank you for calling ABC Corporation.",
  "Please listen carefully as our menu options have changed.",
  "For sales, press 1.",
  "For customer support, press 2.", 
  "For billing questions, press 3.",
  "For our directory, press 0."
];

socket.on('connect', () => {
  console.log('✅ WebSocket connected to audio stream gateway');
  
  // Step 1: Simulate Twilio connection handshake
  console.log('\n1️⃣ Simulating Twilio Media Stream connection...');
  socket.emit('connected', {
    streamSid: TEST_STREAM_SID,
    callSid: TEST_CALL_SID,
  });
  
  // Step 2: Start streaming audio
  setTimeout(() => {
    console.log('2️⃣ Starting media stream...');
    socket.emit('start', {
      streamSid: TEST_STREAM_SID,
      callSid: TEST_CALL_SID,
    });
    
    // Step 3: Send audio chunks with IVR content simulation
    console.log('3️⃣ Streaming audio chunks (simulating IVR menu)...');
    
    const audioInterval = setInterval(() => {
      if (audioChunkCount >= 100 || testComplete) { // ~2 seconds of audio
        clearInterval(audioInterval);
        
        // Step 4: Stop stream
        console.log('4️⃣ Stopping media stream...');
        socket.emit('stop', {
          streamSid: TEST_STREAM_SID,
          callSid: TEST_CALL_SID,
        });
        
        setTimeout(() => {
          console.log('\n✅ Audio streaming test completed!');
          console.log(`📊 Sent ${audioChunkCount} audio chunks`);
          console.log('📝 Check your server logs for STT and IVR detection results');
          
          testComplete = true;
          socket.disconnect();
          process.exit(0);
        }, 1000);
        
        return;
      }
      
      // Send audio chunk
      socket.emit('media', {
        streamSid: TEST_STREAM_SID,
        payload: generateFakeAudioChunk(),
      });
      
      audioChunkCount++;
      
      // Show progress
      if (audioChunkCount % 20 === 0) {
        console.log(`   📡 Sent ${audioChunkCount} audio chunks...`);
      }
      
    }, 20); // 20ms intervals (50 chunks per second)
    
  }, 1000);
  
});

socket.on('disconnect', () => {
  console.log('🔌 WebSocket disconnected');
});

socket.on('connect_error', (error) => {
  console.log('❌ WebSocket connection failed:', error.message);
  
  if (error.message.includes('ECONNREFUSED')) {
    console.log('💡 Make sure your NestJS server is running: npm run start:dev');
  }
  
  process.exit(1);
});

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n⏹️  Test interrupted by user');
  if (!testComplete) {
    socket.emit('stop', {
      streamSid: TEST_STREAM_SID,
      callSid: TEST_CALL_SID,
    });
  }
  socket.disconnect();
  process.exit(0);
});

// Timeout after 30 seconds
setTimeout(() => {
  if (!testComplete) {
    console.log('\n⏰ Test timed out after 30 seconds');
    socket.disconnect();
    process.exit(1);
  }
}, 30000);