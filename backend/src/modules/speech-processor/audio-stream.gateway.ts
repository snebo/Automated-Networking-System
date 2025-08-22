import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { SpeechProcessorService } from './speech-processor.service';
import { DeepgramService } from './services/deepgram.service';

@WebSocketGateway({
  namespace: '/media-stream',
  cors: {
    origin: '*',
  },
})
export class AudioStreamGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(AudioStreamGateway.name);
  private twilioConnections = new Map<string, any>();

  constructor(
    private readonly speechProcessor: SpeechProcessorService,
    private readonly deepgramService: DeepgramService,
  ) {}

  afterInit() {
    this.logger.log('Audio Stream WebSocket Gateway initialized');
  }

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
    
    // Find and clean up any Twilio connections
    for (const [callSid, connection] of this.twilioConnections.entries()) {
      if (connection.socketId === client.id) {
        this.speechProcessor.stopAudioStream(callSid);
        this.twilioConnections.delete(callSid);
        break;
      }
    }
  }

  @SubscribeMessage('connected')
  handleTwilioConnected(client: Socket, payload: any) {
    this.logger.log('Twilio Media Stream connected:', payload);
    
    const { streamSid, callSid } = payload;
    
    this.twilioConnections.set(callSid, {
      streamSid,
      socketId: client.id,
      connected: true,
      startTime: new Date(),
    });

    this.speechProcessor.startAudioStream(callSid, streamSid);
    
    // Start Deepgram STT session for this call
    this.deepgramService.startSTTSession(callSid);
  }

  @SubscribeMessage('start')
  handleStreamStart(client: Socket, payload: any) {
    this.logger.log('Media stream started:', payload);
  }

  @SubscribeMessage('media')
  handleMedia(client: Socket, payload: any) {
    const { streamSid, payload: mediaPayload } = payload;
    
    // Find the call SID for this stream
    let callSid: string | null = null;
    for (const [cSid, connection] of this.twilioConnections.entries()) {
      if (connection.streamSid === streamSid && connection.socketId === client.id) {
        callSid = cSid;
        break;
      }
    }

    if (!callSid) {
      this.logger.warn(`No call SID found for stream ${streamSid}`);
      return;
    }

    // Decode base64 audio data
    const audioData = Buffer.from(mediaPayload, 'base64');
    
    // Process the audio chunk
    this.speechProcessor.processAudioChunk(callSid, audioData);
    
    // Send to Deepgram for STT
    this.deepgramService.processAudioChunk(callSid, audioData);
  }

  @SubscribeMessage('stop')
  handleStreamStop(client: Socket, payload: any) {
    this.logger.log('Media stream stopped:', payload);
    
    const { streamSid } = payload;
    
    // Find and stop the corresponding call
    for (const [callSid, connection] of this.twilioConnections.entries()) {
      if (connection.streamSid === streamSid && connection.socketId === client.id) {
        this.speechProcessor.stopAudioStream(callSid);
        this.deepgramService.stopSTTSession(callSid);
        this.twilioConnections.delete(callSid);
        break;
      }
    }
  }

  // Method to send audio back to Twilio (for TTS responses)
  sendAudioToTwilio(callSid: string, audioData: Buffer) {
    const connection = this.twilioConnections.get(callSid);
    if (connection) {
      const client = this.server.sockets.sockets.get(connection.socketId);
      if (client) {
        client.emit('media', {
          streamSid: connection.streamSid,
          payload: audioData.toString('base64'),
        });
      }
    }
  }

  getTwilioConnections() {
    return Array.from(this.twilioConnections.entries()).map(([callSid, connection]) => ({
      callSid,
      streamSid: connection.streamSid,
      connected: connection.connected,
      startTime: connection.startTime,
    }));
  }
}