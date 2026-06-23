// Thin Socket.IO wrapper. JWT goes in the handshake auth payload.
// See platform-backend-api-spec.md §6 for the room model.
//
// One socket per principal kind so a parent and a kid signed in at the same time
// each get their own authenticated connection. Today only the kid (Learn) surface
// uses WS, so callers pass 'kid'; the per-kind map keeps it correct under dual
// sessions and ready for a future portal socket.

import { io, type Socket } from 'socket.io-client';

import { getToken } from '@/auth/authStore';
import type { PrincipalKind } from '@/auth/types';
import { sameHostInDev } from '@/lib/devHost';

// Origin ONLY (scheme+host+port) — the gateway path ('/ws') must be the socket.io
// `path` option, NOT a URL suffix: socket.io parses a path as a NAMESPACE, which
// breaks the handshake. VITE_WS_URL commonly carries a `/ws` suffix (the prod env
// + examples do), so strip any path defensively here rather than trusting the env.
// In dev, follow the page's host so a LAN device connects to the dev machine.
function wsOrigin(configuredUrl: string): string {
  try {
    return new URL(configuredUrl).origin;
  } catch {
    return configuredUrl;
  }
}
const WS_URL = wsOrigin(sameHostInDev(import.meta.env.VITE_WS_URL ?? 'ws://localhost:3030'));
const WS_PATH = '/ws';

const sockets: Record<PrincipalKind, Socket | null> = { user: null, kid: null };

export function getSocket(kind: PrincipalKind = 'kid'): Socket | null {
  const token = getToken(kind);
  if (!token) return null;

  const existing = sockets[kind];
  if (existing) {
    // Reuse the socket whenever the token is unchanged — INCLUDING while it is
    // still mid-handshake (not yet `connected`) or auto-reconnecting. Tearing a
    // connecting socket down here is what caused a connect/disconnect storm when
    // several subscribers (e.g. IncidentBanner + the playground Asset Viewer) each
    // called getSocket during the connect window, leaving their listeners bound to
    // a discarded instance. Only a genuine token change (a new login) replaces it.
    const existingToken = (existing.auth as { token?: string } | undefined)?.token;
    if (existingToken === token) return existing;
    existing.disconnect();
    sockets[kind] = null;
  }

  const socket = io(WS_URL, {
    path: WS_PATH,
    autoConnect: true,
    transports: ['websocket'],
    auth: { token },
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
  });
  sockets[kind] = socket;

  return socket;
}

// Close one principal's socket, or all of them when no kind is given.
export function closeSocket(kind?: PrincipalKind): void {
  const kinds: PrincipalKind[] = kind ? [kind] : ['user', 'kid'];
  for (const k of kinds) {
    const socket = sockets[k];
    if (socket) {
      socket.disconnect();
      sockets[k] = null;
    }
  }
}

export function onWsEvent<T = unknown>(
  event: string,
  handler: (payload: T) => void,
  kind: PrincipalKind = 'kid',
): () => void {
  const sock = getSocket(kind);
  if (!sock) return () => undefined;
  sock.on(event, handler);
  return () => {
    sock.off(event, handler);
  };
}

export function sendWsEvent(event: string, payload?: unknown, kind: PrincipalKind = 'kid'): void {
  const sock = getSocket(kind);
  if (!sock) return;
  sock.emit(event, payload);
}
