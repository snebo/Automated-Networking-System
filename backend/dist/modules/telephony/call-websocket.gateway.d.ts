import { OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
export declare class CallWebSocketGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
    server: Server;
    private logger;
    private activeStreams;
    private callSubscribers;
    afterInit(server: Server): void;
    handleConnection(client: Socket): void;
    handleDisconnect(client: Socket): void;
    handleAudioStream(client: Socket, payload: any): void;
    handleSubscribeToCall(client: Socket, data: {
        callSid: string;
    }): void;
    handleUnsubscribeFromCall(client: Socket, data: {
        callSid: string;
    }): void;
    handleRegisterCallStream(client: Socket, data: {
        callSid: string;
    }): void;
    handleCallInitiated(data: any): void;
    handleCallEnded(data: any): void;
    handleDTMFSent(data: any): void;
    handleDTMFReceived(data: any): void;
    handleCallStatusUpdated(data: any): void;
    sendAudioToCall(callSid: string, audioData: Buffer): void;
    broadcastCallEvent(event: string, data: any): void;
    sendCallSpecificEvent(callSid: string, event: string, data: any): void;
    getActiveCallsCount(): number;
    getSubscribersForCall(callSid: string): number;
}
