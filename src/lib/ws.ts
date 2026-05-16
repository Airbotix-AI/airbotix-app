// Thin Socket.IO wrapper. JWT goes in the handshake auth payload.
// See platform-backend-api-spec.md §6 for the room model.

import { io, type Socket } from 'socket.io-client';

import { useAuthStore } from '@/auth/authStore';

const WS_URL = import.meta.env.VITE_WS_URL ?? 'ws://localhost:3030/ws';

let socket: Socket | null = null;

export function getSocket(): Socket | null {
  const token = useAuthStore.getState().accessToken;
  if (!token) return null;

  if (socket && socket.connected) return socket;
  if (socket) {
    // Token may have changed — recreate
    socket.disconnect();
    socket = null;
  }

  socket = io(WS_URL, {
    autoConnect: true,
    transports: ['websocket'],
    auth: { token },
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
  });

  return socket;
}

export function closeSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

export function onWsEvent<T = unknown>(event: string, handler: (payload: T) => void): () => void {
  const sock = getSocket();
  if (!sock) return () => undefined;
  sock.on(event, handler);
  return () => {
    sock.off(event, handler);
  };
}

export function sendWsEvent(event: string, payload?: unknown): void {
  const sock = getSocket();
  if (!sock) return;
  sock.emit(event, payload);
}
