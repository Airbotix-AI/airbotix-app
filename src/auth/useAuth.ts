import { useQuery, useQueryClient } from '@tanstack/react-query';

import { api } from '@/lib/api';
import { closeSocket, getSocket } from '@/lib/ws';
import { surfacePrincipal, useAuthStore } from './authStore';
import type {
  AuthPrincipal,
  ClassCodeLoginResponse,
  KidLoginResponse,
  MeResponse,
  PrincipalKind,
  VerifyOtpResponse,
} from './types';

// Normalise the backend `/auth/me` shape into our discriminated AuthPrincipal.
function normaliseMe(raw: MeResponse): AuthPrincipal {
  if (raw.role === 'kid' && raw.kid) {
    return {
      kind: 'kid',
      sub: raw.kid.id,
      nickname: raw.kid.nickname,
      age: raw.kid.age,
      family_id: raw.kid.family_id,
    };
  }
  if (!raw.user) {
    throw new Error('Malformed /auth/me response');
  }
  return {
    kind: 'user',
    sub: raw.user.id,
    email: raw.user.email,
    display_name: raw.user.display_name,
    role: raw.user.role,
    family_id: raw.user.family_id,
  };
}

// `/auth/me` is fetched per principal kind so the parent and kid sessions are
// cached independently. Defaults to the surface you're on (`/learn/*` = kid),
// which is correct for every page since the two surfaces are route-segregated;
// ProtectedRoute/RootPage pass an explicit kind.
export function useMe(kind: PrincipalKind = surfacePrincipal()) {
  const token = useAuthStore((s) => s.tokens[kind]);
  return useQuery<AuthPrincipal>({
    queryKey: ['auth', 'me', kind],
    queryFn: async () => normaliseMe(await api<MeResponse>('/auth/me', { principal: kind })),
    enabled: token !== null,
    staleTime: 60_000,
  });
}

// ── Parent OTP flow ─────────────────────────────────────────────────────────

export async function requestOtp(email: string): Promise<void> {
  await api<void>('/auth/request-otp', {
    method: 'POST',
    body: { email, role_hint: 'parent' },
    skipAuthRefresh: true,
  });
}

export async function verifyOtp(email: string, code: string): Promise<VerifyOtpResponse> {
  const res = await api<VerifyOtpResponse>('/auth/verify-otp', {
    method: 'POST',
    body: { email, code },
    skipAuthRefresh: true,
  });
  useAuthStore.getState().setToken('user', res.access_token);
  useAuthStore.getState().setBootstrapped(true);
  // No portal WS consumer today, so the parent login does not open a socket.
  return res;
}

// ── Kid family-code login ───────────────────────────────────────────────────

export async function kidLogin(
  familyCode: string,
  nickname: string,
  pin: string,
): Promise<KidLoginResponse> {
  const res = await api<KidLoginResponse>('/auth/kid-login', {
    method: 'POST',
    body: { family_code: familyCode, nickname, pin },
    skipAuthRefresh: true,
  });
  useAuthStore.getState().setToken('kid', res.access_token);
  useAuthStore.getState().setBootstrapped(true);
  // Trigger WS connect with the new kid token
  setTimeout(() => getSocket('kid'), 0);
  return res;
}

// ── Kid one-shot class-code login ───────────────────────────────────────────

export async function classCodeLogin(
  classCode: string,
  displayNickname?: string,
): Promise<ClassCodeLoginResponse> {
  const res = await api<ClassCodeLoginResponse>('/auth/class-code-login', {
    method: 'POST',
    body: { class_code: classCode, display_nickname: displayNickname },
    skipAuthRefresh: true,
  });
  useAuthStore.getState().setToken('kid', res.access_token);
  useAuthStore.getState().setBootstrapped(true);
  // Trigger WS connect with the new kid token
  setTimeout(() => getSocket('kid'), 0);
  return res;
}

// ── Logout ──────────────────────────────────────────────────────────────────

// Logs out a single principal so the other session stays alive. Defaults to the
// current surface's principal.
export function useLogout() {
  const qc = useQueryClient();
  return async (kind: PrincipalKind, everywhere = false) => {
    try {
      await api<void>(everywhere ? '/auth/logout-everywhere' : '/auth/logout', {
        method: 'POST',
        principal: kind,
      });
    } catch {
      // ignore — clearing client state regardless
    }
    useAuthStore.getState().clearToken(kind);
    closeSocket(kind);
    qc.removeQueries({ queryKey: ['auth', 'me', kind] });
  };
}
