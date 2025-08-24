import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { Server, Socket } from 'socket.io';
import { CallProgressService } from './call-progress.service';

@Injectable()
@WebSocketGateway({
  cors: {
    origin: '*',
  },
  namespace: '/call-progress',
})
export class CallProgressGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(CallProgressGateway.name);
  private connectedClients = new Set<Socket>();

  constructor(private readonly callProgressService: CallProgressService) {}

  handleConnection(client: Socket) {
    this.connectedClients.add(client);
    this.logger.log(`Client connected: ${client.id}`);
    
    // Send current call progress to newly connected client
    const allProgress = this.callProgressService.getAllCallsProgress();
    client.emit('all-calls-progress', allProgress);
  }

  handleDisconnect(client: Socket) {
    this.connectedClients.delete(client);
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('subscribe-to-call')
  handleSubscribeToCall(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { callSid: string },
  ) {
    const { callSid } = data;
    client.join(`call:${callSid}`);
    
    // Send current progress for this call
    const progress = this.callProgressService.getCallProgress(callSid);
    client.emit('call-progress', { callSid, progress });
    
    return { status: 'subscribed', callSid };
  }

  @SubscribeMessage('unsubscribe-from-call')
  handleUnsubscribeFromCall(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { callSid: string },
  ) {
    const { callSid } = data;
    client.leave(`call:${callSid}`);
    return { status: 'unsubscribed', callSid };
  }

  @SubscribeMessage('get-all-calls')
  handleGetAllCalls(@ConnectedSocket() client: Socket) {
    const allProgress = this.callProgressService.getAllCallsProgress();
    return { calls: allProgress };
  }

  @OnEvent('call.progress')
  handleCallProgress(event: any) {
    // Emit to all clients subscribed to this specific call
    this.server.to(`call:${event.callSid}`).emit('call-progress', event);
  }

  // Broadcast to all connected clients
  broadcastToAll(event: string, data: any) {
    this.server.emit(event, data);
  }

  // Send to specific call subscribers
  sendToCallSubscribers(callSid: string, event: string, data: any) {
    this.server.to(`call:${callSid}`).emit(event, data);
  }
}