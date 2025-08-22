export default () => ({
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // Application settings
  app: {
    url: process.env.APP_URL || 'http://localhost:3000',
    host: process.env.HOST || 'localhost',
    enableCors: process.env.ENABLE_CORS === 'true',
    enableSwagger: process.env.ENABLE_SWAGGER !== 'false', // Default to true
  },
  
  telephony: {
    twilio: {
      accountSid: process.env.TWILIO_ACCOUNT_SID,
      authToken: process.env.TWILIO_AUTH_TOKEN,
      phoneNumber: process.env.TWILIO_PHONE_NUMBER,
      webhookUrl: process.env.TWILIO_WEBHOOK_URL || `${process.env.APP_URL || 'http://localhost:3000'}/telephony`,
      streamUrl: process.env.TWILIO_STREAM_URL || `ws://${process.env.HOST || 'localhost'}:${process.env.PORT || '3000'}/call-events`,
      // Additional Twilio settings
      machineDetection: process.env.TWILIO_MACHINE_DETECTION !== 'false', // Default to true
      machineDetectionTimeout: parseInt(process.env.TWILIO_MACHINE_DETECTION_TIMEOUT || '5000', 10),
      recordCalls: process.env.TWILIO_RECORD_CALLS !== 'false', // Default to true
      transcribeCalls: process.env.TWILIO_TRANSCRIBE_CALLS !== 'false', // Default to true
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
      provider: process.env.TTS_PROVIDER || 'openai',
      openai: {
        apiKey: process.env.OPENAI_API_KEY,
        model: 'tts-1',
        voice: 'fable', // alloy, echo, fable, onyx, nova, shimmer
        speed: 1.0,
      },
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