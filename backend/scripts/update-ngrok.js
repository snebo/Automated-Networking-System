#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const ngrokUrl = process.argv[2];

if (!ngrokUrl || !ngrokUrl.startsWith('http')) {
  console.log('❌ Please provide a valid ngrok URL');
  console.log('Usage: node scripts/update-ngrok.js <ngrok-url>');
  console.log('Example: node scripts/update-ngrok.js https://abc123.ngrok.io');
  process.exit(1);
}

// Update environment file with ngrok URL
function updateEnvWithNgrok(ngrokUrl) {
  const envFile = path.join(__dirname, '..', '.env.development');
  
  if (!fs.existsSync(envFile)) {
    console.log('❌ .env.development file not found');
    process.exit(1);
  }
  
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
  
  console.log('\n📋 Twilio Configuration:');
  console.log(`   Webhook URL: ${ngrokUrl}/telephony/webhook`);
  console.log(`   WebSocket URL: wss://${domain}/call-events`);
  
  console.log('\n🔧 Next steps:');
  console.log('1. Go to Twilio Console > Phone Numbers > Manage > Active Numbers');
  console.log(`2. Click on your phone number: ${process.env.TWILIO_PHONE_NUMBER || '+12622355526'}`);
  console.log(`3. Set Voice Webhook URL to: ${ngrokUrl}/telephony/webhook`);
  console.log('4. Set HTTP method to: POST');
  console.log('5. Save the configuration');
  console.log('6. Test with: npm run test:call');
}

updateEnvWithNgrok(ngrokUrl);