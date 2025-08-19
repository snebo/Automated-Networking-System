# 🧪 IVR Audio Testing Guide

## What is Deepgram?

**Deepgram** is a Speech-to-Text (STT) service that converts audio to text in real-time. It's what allows our IVR agent to "hear" and understand what's being said during phone calls.

### How it works in our system:
1. Twilio sends audio chunks from the phone call to our server
2. We forward these audio chunks to Deepgram
3. Deepgram converts the audio to text (transcription)
4. We analyze the text to detect IVR menu options
5. Our agent can then make decisions based on what it "heard"

## Do you need a Deepgram API key?

**YES** - For real-world testing with actual phone calls, you need a Deepgram API key.

### Getting a Deepgram API Key (FREE):
1. Go to https://console.deepgram.com/signup
2. Sign up for a free account (you get $200 in free credits)
3. Go to API Keys section
4. Create a new API key
5. Add it to your `.env.development` file:
```env
DEEPGRAM_API_KEY=your_api_key_here
```

## Testing Audio Streaming in Real-Time

### Method 1: Test with Real Phone Calls (Requires Deepgram API)

1. **Add your Deepgram API key** to `.env.development`:
```bash
DEEPGRAM_API_KEY=your_api_key_here
```

2. **Start the server with verbose logging**:
```bash
npm run start:dev
```

3. **Make a test call**:
```bash
npm run test:call +1234567890
```

4. **Watch the console logs** - You'll see:
   - 🔊 DEEPGRAM FINAL TRANSCRIPT - Shows what was heard
   - 🎯 IVR MENU DETECTED - Shows detected menu options
   - Press [1] → sales - Shows each detected option

### Method 2: Monitor with WebSocket Dashboard (Visual)

Create this simple HTML file to monitor in real-time:

```html
<!DOCTYPE html>
<html>
<head>
    <title>IVR Monitor</title>
    <script src="https://cdn.socket.io/4.6.0/socket.io.min.js"></script>
</head>
<body>
    <h1>IVR Real-Time Monitor</h1>
    <div id="status">Disconnected</div>
    <div id="transcripts"></div>
    <div id="ivr-options"></div>
    
    <script>
        const socket = io('http://localhost:3000/call-events');
        
        socket.on('connect', () => {
            document.getElementById('status').innerText = '✅ Connected';
        });
        
        socket.on('stt.transcript', (data) => {
            const div = document.createElement('div');
            div.innerHTML = `<strong>${data.isFinal ? 'FINAL' : 'Interim'}:</strong> ${data.transcript}`;
            document.getElementById('transcripts').appendChild(div);
        });
        
        socket.on('ivr.menu_detected', (data) => {
            const div = document.createElement('div');
            div.innerHTML = '<h3>IVR Menu Detected!</h3>';
            data.options.forEach(opt => {
                div.innerHTML += `<p>Press ${opt.key} for ${opt.description}</p>`;
            });
            document.getElementById('ivr-options').appendChild(div);
        });
    </script>
</body>
</html>
```

Save this as `monitor.html` and open it in your browser while testing.

### Method 3: Test Without Real Calls (Simulation)

Use our test scripts:

```bash
# Test IVR pattern detection
node scripts/test-ivr-detection.js

# Test audio streaming pipeline (no Deepgram needed)
node scripts/test-audio-stream.js
```

## What You'll See in the Logs

When everything is working correctly with a real IVR call:

```
🔊 DEEPGRAM FINAL TRANSCRIPT:
   Call: CA123456789
   Text: "Thank you for calling ABC Company. For sales press 1, for support press 2"
   Confidence: 98.5%

🎤 STT TRANSCRIPT RECEIVED for call CA123456789:
   📝 Text: "Thank you for calling ABC Company. For sales press 1, for support press 2"
   📊 Confidence: 98.5%

🎯 IVR MENU DETECTED! Found 2 options:
   =====================================
   1. Press [1] → sales
      Confidence: 85.0%
   2. Press [2] → support
      Confidence: 85.0%
   =====================================
```

## Testing Checklist

### Prerequisites:
- [ ] Redis server running (`redis-server`)
- [ ] Ngrok tunnel active (if testing with real calls)
- [ ] Twilio webhook URL updated
- [ ] Deepgram API key configured (for real calls)

### Test Steps:
1. [ ] Start server: `npm run start:dev`
2. [ ] Check server started: Look for "Application is running on: http://localhost:3000"
3. [ ] Run simulation test: `node scripts/test-audio-stream.js`
4. [ ] If using Deepgram, make real call: `npm run test:call +1234567890`
5. [ ] Watch console for IVR detection logs

## Troubleshooting

### No transcripts appearing?
- Check Deepgram API key is set
- Verify ngrok tunnel is working
- Ensure Twilio webhooks are configured

### IVR not detected?
- Check the transcript text in logs
- May need to adjust detection patterns
- Some IVR systems speak too fast/unclear

### Can't hear anything on call?
- Check Twilio trial account limitations
- Verify phone number is in verified list
- Check webhook URL is accessible

## Do You Need Anything Outside VS Code?

For full testing, you need:

1. **Terminal/Console** - To see real-time logs
2. **Ngrok** - Already installed, for Twilio webhooks
3. **Redis** - Already running for queue management
4. **Deepgram Account** - Free signup for API key
5. **Phone** - To answer test calls and hear the IVR

Optional but helpful:
- **Browser** - To view the monitoring dashboard
- **Postman/cURL** - To test API endpoints directly

## Quick Test Commands

```bash
# Start everything
redis-server &                    # Start Redis in background
npm run start:dev                 # Start server with logging

# In another terminal
npm run test:call +1234567890    # Make test call

# Or test without calls
node scripts/test-audio-stream.js # Test audio pipeline
node scripts/test-ivr-detection.js # Test IVR patterns
```

## What Happens During a Real Call

1. You initiate call → Twilio calls the number
2. Recipient answers → Twilio starts streaming audio to our server
3. Audio chunks arrive via WebSocket → We forward to Deepgram
4. Deepgram sends back text transcripts → We log them
5. IVR detector analyzes text → Logs detected menu options
6. Agent can make decisions → Send DTMF tones or take actions

The entire process happens in real-time, with transcripts appearing within 1-2 seconds of speech!