import {
  WebSocketGateway,
  SubscribeMessage,
  WebSocketServer,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class CallWebSocketGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer() server: Server;
  private logger: Logger = new Logger('CallWebSocketGateway');
  private activeStreams = new Map<string, Socket>();

  afterInit(server: Server) {
    this.logger.log('WebSocket Gateway initialized');
  }

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
    this.activeStreams.delete(client.id);
  }

  @SubscribeMessage('audio-stream')
  handleAudioStream(client: Socket, payload: any) {
    // Handle incoming audio stream from Twilio
    const { callSid, audio, sequenceNumber } = payload;
    
    // Emit to speech-to-text service subscribers
    this.server.emit('audio-chunk', {
      callSid,
      audio,
      sequenceNumber,
      timestamp: new Date(),
    });
  }

  @SubscribeMessage('register-call')
  handleRegisterCall(client: Socket, callSid: string) {
    this.activeStreams.set(callSid, client);
    client.join(`call-${callSid}`);
    this.logger.log(`Registered stream for call: ${callSid}`);
  }

  sendAudioToCall(callSid: string, audioData: Buffer) {
    const client = this.activeStreams.get(callSid);
    if (client) {
      client.emit('play-audio', audioData);
    }
  }

  broadcastCallEvent(event: string, data: any) {
    this.server.emit(event, data);
  }
}