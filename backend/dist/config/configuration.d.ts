declare const _default: () => {
    port: number;
    nodeEnv: string;
    app: {
        url: string;
        host: string;
        enableCors: boolean;
        enableSwagger: boolean;
    };
    telephony: {
        twilio: {
            accountSid: string | undefined;
            authToken: string | undefined;
            phoneNumber: string | undefined;
            webhookUrl: string;
            streamUrl: string;
            machineDetection: boolean;
            machineDetectionTimeout: number;
            recordCalls: boolean;
            transcribeCalls: boolean;
        };
    };
    speech: {
        stt: {
            provider: string;
            deepgram: {
                apiKey: string | undefined;
                model: string;
                language: string;
                punctuate: boolean;
                diarize: boolean;
                smartFormat: boolean;
            };
        };
        tts: {
            provider: string;
            openai: {
                apiKey: string | undefined;
                model: string;
                voice: string;
                speed: number;
            };
            elevenlabs: {
                apiKey: string | undefined;
                voiceId: string | undefined;
                modelId: string;
                voiceSettings: {
                    stability: number;
                    similarityBoost: number;
                };
            };
        };
    };
    ai: {
        provider: string;
        openai: {
            apiKey: string | undefined;
            model: string;
            temperature: number;
            maxTokens: number;
        };
    };
    database: {
        url: string | undefined;
    };
    redis: {
        host: string;
        port: number;
    };
    logging: {
        level: string;
    };
};
export default _default;
