import { io, Socket } from 'socket.io-client';

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001';

let socket: Socket | null = null;

export const getSocket = (): Socket => {
  if (!socket) {
    socket = io(SOCKET_URL, {
      transports: ['websocket'],
      autoConnect: true,
    });
  }
  return socket;
};

export const subscribeToCallUpdates = (callId: string, callback: (data: unknown) => void) => {
  const socket = getSocket();
  socket.on(`call:${callId}:update`, callback);
  
  return () => {
    socket.off(`call:${callId}:update`, callback);
  };
};

export const subscribeToTranscriptUpdates = (callId: string, callback: (data: unknown) => void) => {
  const socket = getSocket();
  socket.on(`call:${callId}:transcript`, callback);
  
  return () => {
    socket.off(`call:${callId}:transcript`, callback);
  };
};