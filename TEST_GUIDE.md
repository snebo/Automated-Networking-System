# Full Flow Test Guide

This guide explains how to test the complete IVR navigation to human conversation system.

## 🧪 Available Tests

### 1. Mock Flow Test (Recommended for Development)
```bash
npm run test:mock-flow
```
**What it tests:**
- Database operations (clear/create/read)
- Business scraping and storage
- Script generation and assignment
- Human conversation simulation
- Question asking and response capture
- Data verification

**Duration:** ~15 seconds
**Phone calls:** None (fully mocked)
**Safe to run:** Always

### 2. Real Flow Test (Complete End-to-End)
```bash
npm run test:full-flow
```
**What it tests:**
- Everything from mock test PLUS:
- Real phone call to +12192983383
- Actual IVR navigation
- Live human conversation detection
- Real TTS question asking
- Actual response capture from human

**Duration:** ~90 seconds
**Phone calls:** 1 real call
**Use carefully:** Makes actual phone calls

## 📋 Test Flow Overview

Both tests follow the same logical flow:

1. **🧹 Clear Database** - Fresh start for consistent testing
2. **🏥 Search ER Hospitals** - Find/create Texas hospital data  
3. **📝 Generate Scripts** - Create ER doctor contact scripts
4. **📞 Human Conversation** - Test the conversation system
5. **🔍 Verify Results** - Check database storage

## 🚀 Quick Start

1. **Start the application:**
```bash
npm run start:dev
```

2. **Run mock test first:**
```bash
npm run test:mock-flow
```

3. **If mock test passes, try real test:**
```bash
npm run test:full-flow
```

## 📊 Expected Results

### Mock Test Success Output:
```
🧪 STARTING MOCK FULL FLOW TEST
=====================================
🧹 Step 1: Clearing database for fresh start...
   ✅ Database cleared successfully
🏥 Step 2: Creating mock ER hospitals in Texas...
   ✅ Created 3 mock hospitals
📝 Step 3: Generating contact script for ER doctors...
   ✅ Script generated successfully
🤖 Step 4: Testing human conversation simulation...
   🤝 Human detected in conversation
   🗣️ Question: "Hello, I read about you online..."
   📝 Response: "Sure, Dr. Martinez is our head..."
🔍 Step 5: Verifying mock test results...
   ✅ Results verified

✅ MOCK FULL FLOW TEST COMPLETED SUCCESSFULLY!
```

### Real Test Success Output:
```
🚀 STARTING FULL FLOW TEST
=====================================
📞 Target Phone: +12192983383
🎯 Goal: Find ER doctor contact information
📍 Location: Texas hospitals

🧹 Step 1: Clearing database for fresh start...
   ✅ Database cleared successfully
🏥 Step 2: Searching for ER hospitals in Texas...
   ✅ Found X hospitals
📝 Step 3: Generating contact script for ER doctors...
   ✅ Script generated successfully
📞 Step 4: Making real call to test number...
   📞 Call initiated: CA1234567890abcdef
   🤝 Human detected in conversation
   🗣️ Question asked: "Hello, I read about you online..."
   📝 Response captured: [actual human response]
🔍 Step 5: Verifying saved results...
   ✅ Results verified in database

✅ FULL FLOW TEST COMPLETED SUCCESSFULLY!
```

## 🛠️ Troubleshooting

### "Server not running" Error
```bash
# Start the application first
npm run start:dev
```

### Database Connection Issues
```bash
# Check your .env file has DATABASE_URL set
# Ensure PostgreSQL is running
```

### Test Timeout
- Mock test: Should complete in ~15 seconds
- Real test: May take up to 90 seconds for phone call

### Call Failures
- Check Twilio credentials in .env
- Verify target phone number is reachable
- Check network connectivity

## 📞 Test Phone Number

The real test calls: **+12192983383**
- This should be a test number that can receive calls
- Make sure it's safe to call before running real tests
- Consider using a test service or controlled number

## 🎯 What Each Test Validates

### Mock Test Validates:
✅ Database schema and operations  
✅ Business creation and management  
✅ Script generation system  
✅ Human conversation logic  
✅ Question formulation  
✅ Response storage  
✅ End-to-end data flow  

### Real Test Adds:
✅ Twilio integration  
✅ Actual IVR navigation  
✅ Real speech recognition  
✅ Live human detection  
✅ TTS question delivery  
✅ Actual phone conversation  

## 💡 Development Workflow

1. **Always run mock test first** - Fast feedback loop
2. **Fix any issues** before attempting real test
3. **Run real test sparingly** - Only when confident
4. **Check logs** for detailed execution information
5. **Verify database** after each test run

## 📝 Next Steps After Testing

After successful tests, you can:
- Review stored responses in database
- Analyze conversation effectiveness  
- Test with different hospital numbers
- Monitor system performance
- Expand to other business types