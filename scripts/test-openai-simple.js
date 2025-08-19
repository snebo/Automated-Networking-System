#!/usr/bin/env node
require('dotenv').config({ path: '.env.development' });

const OpenAI = require('openai');

async function testOpenAIConnection() {
  console.log('🧪 Testing OpenAI Connection...\n');
  
  const apiKey = process.env.OPENAI_API_KEY;
  console.log(`🔑 API Key configured: ${apiKey ? 'Yes' : 'No'}`);
  
  if (!apiKey) {
    console.error('❌ No OpenAI API key found');
    return;
  }
  
  try {
    console.log('🔌 Initializing OpenAI client...');
    const openai = new OpenAI({ apiKey });
    
    console.log('📞 Making test API call...');
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "You are a helpful assistant." },
        { role: "user", content: "Respond with exactly: 'AI connection successful'" }
      ],
      max_tokens: 20,
      temperature: 0
    });

    const response = completion.choices[0].message.content;
    console.log(`✅ OpenAI Response: "${response}"`);
    
    if (response && response.includes('AI connection successful')) {
      console.log('🎉 OpenAI connection test PASSED!');
    } else {
      console.log('⚠️  Unexpected response format');
    }
    
  } catch (error) {
    console.error(`❌ OpenAI test failed: ${error.message}`);
    if (error.status) {
      console.error(`   Status: ${error.status}`);
    }
    if (error.error) {
      console.error(`   Error: ${JSON.stringify(error.error, null, 2)}`);
    }
  }
}

testOpenAIConnection().then(() => {
  console.log('\n✅ Test completed');
  process.exit(0);
}).catch(error => {
  console.error(`\n💥 Test error: ${error.message}`);
  process.exit(1);
});