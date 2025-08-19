# 🔧 Audio Streaming Fix Guide

## The Problem
When you make a call, it connects but immediately hangs up after saying "IVR Navigation Agent connected. Starting audio analysis."

## Why This Happens
1. **Twilio Media Streams** require WebSocket connections that are more complex than initially implemented
2. **Deepgram API key** is configured but the service isn't connecting properly
3. The TwiML response doesn't keep the call alive properly

## Current Setup (Simplified Recording Approach)
I've updated the system to use Twilio's built-in recording and transcription first, which is simpler and will help us test:

```xml
<Response>
  <Say>IVR Navigation Agent connected. Please say something to test the speech recognition.</Say>
  <Record transcribe="true" transcribeCallback="your-url/webhook/transcription" />
  <Say>Thank you. Processing your audio.</Say>
</Response>
```

## Testing Steps

### 1. Start the Server
```bash
npm run start:dev
```

### 2. Make a Test Call
```bash
npm run test:call +12192983383
```

### 3. What Should Happen
1. Call connects
2. You hear: "IVR Navigation Agent connected. Please say something to test the speech recognition."
3. You hear a beep
4. **You speak something** (e.g., "For sales press 1, for support press 2")
5. After 10 seconds of silence or when you hang up, recording stops
6. Twilio sends the transcription to our webhook
7. You should see in logs:
   - 📝 TWILIO TRANSCRIPTION RECEIVED
   - 🎤 STT TRANSCRIPT RECEIVED
   - 🎯 IVR MENU DETECTED (if you said menu options)

## What's Actually Working

### ✅ Working:
- Twilio call initiation
- Webhook callbacks
- IVR detection logic
- Event system

### ❌ Not Working Yet:
- Real-time WebSocket streaming (needs more configuration)
- Deepgram real-time STT (needs WebSocket fix)

## Quick Fixes to Try

### Fix 1: Ensure Ngrok is Running
```bash
# Check if ngrok is running
curl https://brave-marmot-mistakenly.ngrok-free.app

# If not, restart it
ngrok http 3000
```

### Fix 2: Update APP_URL in .env.development
Make sure your .env.development has the correct ngrok URL:
```env
APP_URL=https://your-new-ngrok-url.ngrok-free.app
```

### Fix 3: Test with Simple TwiML First
The current setup uses recording which is simpler. If this works, we can move to streaming.

## Next Steps

Once basic recording/transcription works:

1. **Implement proper WebSocket for Twilio**
   - Use raw WebSocket instead of Socket.io
   - Handle Twilio's specific message format

2. **Fix Deepgram Integration**
   - Ensure API key is loaded properly
   - Test connection independently

3. **Add Real-time Streaming**
   - Implement bidirectional audio
   - Add TTS responses

## Debugging Commands

```bash
# Check if Redis is running
redis-cli ping

# Check server logs for errors
npm run start:dev 2>&1 | grep -E "error|warn"

# Test webhook directly
curl -X POST http://localhost:3000/telephony/webhook \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "CallSid=test123&CallStatus=in-progress"

# Check if Deepgram key is loaded
node -e "require('dotenv').config({path:'.env.development'}); console.log(process.env.DEEPGRAM_API_KEY ? 'Key found' : 'Key missing')"
```

## Manual Testing Without Calls

You can test the transcription → IVR detection pipeline manually:

```bash
curl -X POST http://localhost:3000/telephony/webhook/transcription \
  -H "Content-Type: application/json" \
  -d '{
    "CallSid": "test123",
    "TranscriptionText": "Thank you for calling. For sales press 1, for support press 2",
    "TranscriptionStatus": "completed"
  }'
```

You should see IVR detection logs in the console.

## Important Notes

1. **Twilio Trial Limitations**: 
   - Can only call verified numbers
   - Plays a trial message before your content
   - Limited to 10-minute calls

2. **Deepgram Requirements**:
   - Needs API key (you have one configured)
   - Requires WebSocket connection for real-time
   - Falls back to batch transcription if streaming fails

3. **Current Approach**:
   - Using Twilio's built-in transcription (simpler, more reliable)
   - IVR detection works on any transcribed text
   - Real-time streaming can be added later