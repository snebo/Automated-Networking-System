# 🏗️ Test IVR Setup Guide

## Overview
This guide helps you create your own controllable IVR system using Twilio Studio to test your AI navigation capabilities.

## 🎯 Test IVR Structure

```
📞 "Thank you for calling Test Medical Center"
├── 1️⃣ "Press 1 for Emergency Services"
│   ├── 1️⃣ "Press 1 to speak with ER doctor" → Human simulation
│   ├── 2️⃣ "Press 2 for ER status" → Info message
│   └── 0️⃣ "Press 0 to return to main menu"
├── 2️⃣ "Press 2 for Patient Information"  
│   ├── 1️⃣ "Press 1 for appointments" → Human simulation
│   ├── 2️⃣ "Press 2 for medical records" → Info message
│   └── 0️⃣ "Press 0 to return to main menu"
├── 3️⃣ "Press 3 for Billing Department" → Closed message
└── 9️⃣ "Press 9 to repeat this menu"
```

## 📋 Setup Instructions

### Step 1: Create Twilio Studio Flow

1. **Go to Twilio Console:**
   - Visit: https://console.twilio.com/us1/develop/studio/flows
   - Click **"Create New Flow"**

2. **Create Flow:**
   - **Name**: `Test Medical Center IVR`
   - **Template**: Start from scratch
   - Click **"Next"**

3. **Import Flow Definition:**
   - Click the **"Import from JSON"** button (top right)
   - Copy and paste the entire contents of `twilio-test-ivr-flow.json`
   - Click **"Import"**

4. **Publish Flow:**
   - Click **"Save"** (top right)
   - Click **"Publish"** (top right)
   - Note down your **Flow SID** (starts with `FW...`)

### Step 2: Configure Your Twilio Phone Number

1. **Go to Phone Numbers:**
   - Visit: https://console.twilio.com/us1/develop/phone-numbers/manage/incoming
   - Click on your Twilio number: `+12622355526`

2. **Update Webhook:**
   - In the **"Voice"** section:
   - Set **"A call comes in"** to: **"Studio Flow"**
   - Select your flow: **"Test Medical Center IVR"**
   - Click **"Save"**

### Step 3: Test the IVR Manually

1. **Call your Twilio number** from any phone
2. **Listen to the menu** and try different options:
   - Press `1` → `1` to reach "ER doctor"
   - Press `2` → `1` to reach "appointments" 
   - Press `3` for billing (closed message)
   - Press `9` to repeat menu

## 🤖 Testing with Your AI

### Test Command 1: Basic IVR Navigation
```bash
# Test AI navigating to ER doctor
curl -X POST http://localhost:3000/telephony/call \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "+12622355526",
    "goal": "Speak with ER doctor and get contact information",
    "targetPerson": "emergency room doctor", 
    "companyName": "Test Medical Center"
  }'
```

**Expected AI Path**: `1` (Emergency) → `1` (ER Doctor) → Conversation

### Test Command 2: Appointment Scheduling
```bash
# Test AI navigating to appointments
curl -X POST http://localhost:3000/telephony/call \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "+12622355526", 
    "goal": "Get appointment scheduling information",
    "targetPerson": "appointment scheduler",
    "companyName": "Test Medical Center"
  }'
```

**Expected AI Path**: `2` (Patient Info) → `1` (Appointments) → Conversation

## 📊 What to Watch For

### In Your Console Logs:
```
🎯 IVR MENU DETECTED! Found 4 options:
=====================================
1. Press [1] → Emergency Services
2. Press [2] → Patient Information  
3. Press [3] → Billing Department
4. Press [9] → repeat this menu
=====================================

🤖 AI DECISION MADE:
✅ Selected Option: 1
🧠 Reasoning: Goal is to reach ER doctor, Emergency Services is the correct path
💬 Response: "Selecting Emergency Services to reach ER doctor"
📊 Confidence: 95.0%
🎬 Next Action: press_key
```

### Expected Navigation Sequence:
1. **Main Menu Detected** → AI selects option based on goal
2. **Submenu Detected** → AI navigates to specific department  
3. **Human Detected** → AI asks goal-oriented question
4. **Response Captured** → AI saves contact information

## 🔧 IVR Flow Features

### ✅ **Perfect for Testing:**
- **Predictable menus** with clear options
- **Multi-level navigation** (main → sub-menus)
- **Human simulation** with realistic responses
- **Goal achievement** paths (ER doctor, appointments)
- **Error handling** (timeouts, invalid inputs)

### 🎭 **Simulated Humans:**
- **Dr. Martinez**: ER doctor with contact details
- **Sarah**: Appointment scheduler with department info
- **Realistic responses** with phone/email information

## 🧪 Advanced Testing Scenarios

### Scenario 1: Goal Achievement Test
**Goal**: "Get ER doctor contact information"  
**Expected Result**: AI navigates `1→1` and extracts Dr. Martinez's contact details

### Scenario 2: Department Navigation Test  
**Goal**: "Schedule appointment"  
**Expected Result**: AI navigates `2→1` and gets scheduling department info

### Scenario 3: Error Recovery Test
**Goal**: Make AI navigate to non-existent option  
**Expected Result**: AI adapts and finds alternative path

## 📞 Manual Testing Commands

```bash
# Call and manually test the IVR structure
curl -X POST http://localhost:3000/telephony/call \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "+12622355526",
    "manual": true
  }'
```

Then use manual DTMF sending:
```bash
# Send DTMF during call
curl -X POST http://localhost:3000/telephony/call/[CALL_SID]/dtmf \
  -H "Content-Type: application/json" \
  -d '{"digits": "1"}'
```

## 🎯 Success Metrics

Your AI testing is successful when:
- ✅ **IVR menus are detected** (4 options in main menu)
- ✅ **AI makes logical decisions** (selects correct path for goal)
- ✅ **Navigation completes successfully** (reaches target human)  
- ✅ **Information is extracted** (captures contact details)
- ✅ **Call ends gracefully** (polite closure)

## 🚀 Next Steps

Once basic navigation works:
1. **Test complex goals** (multi-department scenarios)
2. **Add error scenarios** (wrong numbers, timeouts)
3. **Scale testing** (multiple concurrent calls)
4. **Real business testing** (using learned patterns)

---

**🎉 You now have a complete, controllable IVR system for testing your AI navigation capabilities!**