import { OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { SpeechProcessorService } from './speech-processor.service';
import { DeepgramService } from './services/deepgram.service';
export declare class AudioStreamGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
    private readonly speechProcessor;
    private readonly deepgramService;
    server: Server;
    private readonly logger;
    private twilioConnections;
    constructor(speechProcessor: SpeechProcessorService, deepgramService: DeepgramService);
    afterInit(): void;
    handleConnection(client: Socket): void;
    handleDisconnect(client: Socket): void;
    handleTwilioConnected(client: Socket, payload: any): void;
    handleStreamStart(client: Socket, payload: any): void;
    handleMedia(client: Socket, payload: any): void;
    handleStreamStop(client: Socket, payload: any): void;
    sendAudioToTwilio(callSid: string, audioData: Buffer): void;
    getTwilioConnections(): {
        callSid: string;
        streamSid: any;
        connected: any;
        startTime: any;
    }[];
}
