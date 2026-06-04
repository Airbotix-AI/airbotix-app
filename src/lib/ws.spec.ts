import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { io } from 'socket.io-client';

import { useAuthStore } from '@/auth/authStore';
import { closeSocket, getSocket, onWsEvent, sendWsEvent } from './ws';

vi.mock('socket.io-client', () => ({ io: vi.fn() }));
const mockedIo = vi.mocked(io);

type FakeSocket = {
  connected: boolean;
  on: ReturnType<typeof vi.fn>;
  off: ReturnType<typeof vi.fn>;
  emit: ReturnType<typeof vi.fn>;
  disconnect: ReturnType<typeof vi.fn>;
};

function fakeSocket(connected = false): FakeSocket {
  return { connected, on: vi.fn(), off: vi.fn(), emit: vi.fn(), disconnect: vi.fn() };
}

beforeEach(() => {
  closeSocket(); // reset module-level socket between tests
  useAuthStore.getState().clear();
  mockedIo.mockReset();
  mockedIo.mockImplementation(() => fakeSocket() as never);
});

afterEach(() => closeSocket());

describe('ws', () => {
  it('getSocket returns null and connects nothing without a token', () => {
    expect(getSocket()).toBeNull();
    expect(mockedIo).not.toHaveBeenCalled();
  });

  it('getSocket puts the JWT in the handshake auth on the /ws path', () => {
    useAuthStore.getState().setAccessToken('jwt');
    const s = getSocket();
    expect(s).not.toBeNull();
    expect(mockedIo).toHaveBeenCalledTimes(1);
    const opts = mockedIo.mock.calls[0][1];
    expect(opts).toMatchObject({ path: '/ws', auth: { token: 'jwt' }, transports: ['websocket'] });
  });

  it('reuses the live socket on subsequent calls', () => {
    useAuthStore.getState().setAccessToken('jwt');
    mockedIo.mockImplementation(() => fakeSocket(true) as never);
    const a = getSocket();
    const b = getSocket();
    expect(a).toBe(b);
    expect(mockedIo).toHaveBeenCalledTimes(1);
  });

  it('closeSocket disconnects and forces a fresh socket next time', () => {
    useAuthStore.getState().setAccessToken('jwt');
    const first = getSocket() as unknown as FakeSocket;
    closeSocket();
    expect(first.disconnect).toHaveBeenCalled();
    getSocket();
    expect(mockedIo).toHaveBeenCalledTimes(2);
  });

  it('onWsEvent subscribes and returns an unsubscribe that calls off', () => {
    useAuthStore.getState().setAccessToken('jwt');
    const handler = vi.fn();
    const unsub = onWsEvent('wallet.update', handler);
    const sock = mockedIo.mock.results[0].value as FakeSocket;
    expect(sock.on).toHaveBeenCalledWith('wallet.update', handler);
    unsub();
    expect(sock.off).toHaveBeenCalledWith('wallet.update', handler);
  });

  it('onWsEvent is a safe no-op without a token', () => {
    const unsub = onWsEvent('x', vi.fn());
    expect(mockedIo).not.toHaveBeenCalled();
    expect(() => unsub()).not.toThrow();
  });

  it('sendWsEvent emits through the socket', () => {
    useAuthStore.getState().setAccessToken('jwt');
    sendWsEvent('ping', { a: 1 });
    const sock = mockedIo.mock.results[0].value as FakeSocket;
    expect(sock.emit).toHaveBeenCalledWith('ping', { a: 1 });
  });
});
