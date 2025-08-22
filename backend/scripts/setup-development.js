#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🚀 Setting up IVR Solution Development Environment...\n');

// Check if ngrok is installed
function checkNgrok() {
  try {
    execSync('ngrok version', { stdio: 'ignore' });
    console.log('✅ ngrok is installed');
    return true;
  } catch (error) {
    console.log('❌ ngrok is not installed');
    console.log('📦 Install ngrok: npm install -g ngrok');
    return false;
  }
}

// Check if environment file exists
function checkEnvFile() {
  const envFile = path.join(__dirname, '..', '.env.development');
  if (fs.existsSync(envFile)) {
    console.log('✅ .env.development file exists');
    return true;
  } else {
    console.log('❌ .env.development file not found');
    return false;
  }
}

// Update environment file with ngrok URL
function updateEnvWithNgrok(ngrokUrl) {
  const envFile = path.join(__dirname, '..', '.env.development');
  let content = fs.readFileSync(envFile, 'utf8');
  
  // Extract domain from ngrok URL
  const domain = ngrokUrl.replace(/https?:\/\//, '');
  
  // Update the environment variables
  content = content.replace(/APP_URL=.*/, `APP_URL=${ngrokUrl}`);
  content = content.replace(/HOST=.*/, `HOST=${domain}`);
  content = content.replace(/TWILIO_WEBHOOK_URL=.*/, `TWILIO_WEBHOOK_URL=${ngrokUrl}/telephony`);
  content = content.replace(/TWILIO_STREAM_URL=.*/, `TWILIO_STREAM_URL=wss://${domain}/call-events`);
  
  fs.writeFileSync(envFile, content);
  console.log(`✅ Updated .env.development with ngrok URL: ${ngrokUrl}`);
}

// Main setup function
function setup() {
  console.log('🔍 Checking prerequisites...\n');
  
  const hasNgrok = checkNgrok();
  const hasEnv = checkEnvFile();
  
  if (!hasNgrok) {
    console.log('\n❌ Please install ngrok first: npm install -g ngrok');
    process.exit(1);
  }
  
  if (!hasEnv) {
    console.log('\n❌ Please ensure .env.development file exists with Twilio credentials');
    process.exit(1);
  }
  
  console.log('\n✅ Prerequisites check passed!');
  console.log('\n📋 Next steps:');
  console.log('1. Start your NestJS application: npm run start:dev');
  console.log('2. In another terminal, start ngrok: ngrok http 3000');
  console.log('3. Copy the ngrok HTTPS URL and run: node scripts/update-ngrok.js <ngrok-url>');
  console.log('4. Update your Twilio webhook URL in the Twilio console');
  console.log('5. Test the integration!');
}

// Check if ngrok URL is provided as argument for update
if (process.argv[2] && process.argv[2].startsWith('http')) {
  updateEnvWithNgrok(process.argv[2]);
} else {
  setup();
}