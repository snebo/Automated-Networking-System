export default () => ({
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  
  telephony: {
    twilio: {
      accountSid: process.env.TWILIO_ACCOUNT_SID,
      authToken: process.env.TWILIO_AUTH_TOKEN,
      phoneNumber: process.env.TWILIO_PHONE_NUMBER,
      webhookUrl: process.env.TWILIO_WEBHOOK_URL,
    },
  },
  
  speech: {
    stt: {
      provider: process.env.STT_PROVIDER || 'deepgram',
      deepgram: {
        apiKey: process.env.DEEPGRAM_API_KEY,
        model: 'nova-2-phonecall',
        language: 'en-US',
        punctuate: true,
        diarize: false,
        smartFormat: true,
      },
    },
    tts: {
      provider: process.env.TTS_PROVIDER || 'elevenlabs',
      elevenlabs: {
        apiKey: process.env.ELEVENLABS_API_KEY,
        voiceId: process.env.VOICE_ID,
        modelId: 'eleven_monolingual_v1',
        voiceSettings: {
          stability: 0.5,
          similarityBoost: 0.75,
        },
      },
    },
  },
  
  ai: {
    provider: process.env.AI_PROVIDER || 'openai',
    openai: {
      apiKey: process.env.OPENAI_API_KEY,
      model: 'gpt-4-turbo-preview',
      temperature: 0.7,
      maxTokens: 500,
    },
  },
  
  database: {
    url: process.env.DATABASE_URL,
  },
  
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
  },
  
  logging: {
    level: process.env.LOG_LEVEL || 'info',
  },
});