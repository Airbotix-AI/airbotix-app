import { useQuery, useQueryClient } from '@tanstack/react-query';

import { api } from '@/lib/api';
import { closeSocket } from '@/lib/ws';
import { useAuthStore } from './authStore';
import type {
  AuthPrincipal,
  ClassCodeLoginResponse,
  KidLoginResponse,
  MeResponse,
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

export function useMe() {
  const accessToken = useAuthStore((s) => s.accessToken);
  return useQuery<AuthPrincipal>({
    queryKey: ['auth', 'me'],
    queryFn: async () => normaliseMe(await api<MeResponse>('/auth/me')),
    enabled: accessToken !== null,
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
  useAuthStore.getState().setAccessToken(res.access_token);
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
  useAuthStore.getState().setAccessToken(res.access_token);
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
  useAuthStore.getState().setAccessToken(res.access_token);
  return res;
}

// ── Logout ──────────────────────────────────────────────────────────────────

export function useLogout() {
  const qc = useQueryClient();
  return async (everywhere = false) => {
    try {
      await api<void>(everywhere ? '/auth/logout-everywhere' : '/auth/logout', {
        method: 'POST',
      });
    } catch {
      // ignore — clearing client state regardless
    }
    useAuthStore.getState().clear();
    closeSocket();
    qc.clear();
  };
}
