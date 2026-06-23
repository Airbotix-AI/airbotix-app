import { afterEach, describe, expect, it, vi } from 'vitest';

// Mutable test state, hoisted so the vi.mock factories can read it.
const h = vi.hoisted(() => ({
  token: 'tok-1' as string,
  created: [] as Array<{ auth: { token: string }; disconnect: ReturnType<typeof vi.fn> }>,
}));

vi.mock('socket.io-client', () => ({
  io: vi.fn((_url: string, opts: { auth: { token: string } }) => {
    const sock = { auth: opts.auth, connected: false, disconnect: vi.fn(), on: vi.fn(), off: vi.fn() };
    h.created.push(sock);
    return sock;
  }),
}));
vi.mock('@/auth/authStore', () => ({ getToken: () => h.token }));

import { closeSocket, getSocket } from './ws';

describe('getSocket', () => {
  afterEach(() => {
    closeSocket();
    h.created.length = 0;
    h.token = 'tok-1';
  });

  it('reuses ONE socket across rapid calls while still connecting (no teardown storm)', () => {
    // Several subscribers calling getSocket during the connect window must all get
    // the same instance — never recreate a still-connecting socket out from under
    // listeners already bound to it.
    const a = getSocket('kid');
    const b = getSocket('kid');
    const c = getSocket('kid');
    expect(a).toBe(b);
    expect(b).toBe(c);
    expect(h.created).toHaveLength(1);
    expect(a && !a.connected).toBe(true); // still connecting, yet reused
    expect(h.created[0].disconnect).not.toHaveBeenCalled();
  });

  it('recreates the socket only when the token genuinely changes (new login)', () => {
    const a = getSocket('kid');
    h.token = 'tok-2';
    const b = getSocket('kid');
    expect(b).not.toBe(a);
    expect(h.created).toHaveLength(2);
    expect(h.created[0].disconnect).toHaveBeenCalled();
  });

  it('returns null when there is no token', () => {
    h.token = '';
    expect(getSocket('kid')).toBeNull();
    expect(h.created).toHaveLength(0);
  });
});
