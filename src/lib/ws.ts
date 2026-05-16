// Thin Socket.IO wrapper. JWT goes in the handshake auth payload.
// See platform-backend-api-spec.md §6 for the room model. The actual room
// subscriptions + event handlers are wired in feature hooks (TODO: see
// useFamilyAuditStream, useKidStream, etc. — not yet implemented).

import { io, type Socket } from 'socket.io-client';

import { useAuthStore } from '@/auth/authStore';

const WS_URL = import.meta.env.VITE_WS_URL ?? 'ws://localhost:3000/ws';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (socket && socket.connected) return socket;

  const token = useAuthStore.getState().accessToken;
  socket = io(WS_URL, {
    autoConnect: true,
    transports: ['websocket'],
    auth: { token: token ?? '' },
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
