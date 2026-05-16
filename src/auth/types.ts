// What backend /auth/me returns, and what client code branches on.
// Discriminated by `kind` — parent gets 'user', kid (PIN or class-code) gets 'kid'.

export type Role = 'parent' | 'teacher' | 'admin' | 'super_admin';

export interface UserPrincipal {
  kind: 'user';
  sub: string;
  email: string;
  display_name: string | null;
  role: Role;
  family_id: string | null;
}

export interface KidPrincipal {
  kind: 'kid';
  sub: string;
  nickname: string;
  age?: number;
  family_id: string | null;
  class_id?: string;
  is_ephemeral?: boolean;
}

export type AuthPrincipal = UserPrincipal | KidPrincipal;

export type PrincipalKind = 'user' | 'kid';

// Response shapes from platform-backend (auth-system-prd.md §4).

export interface MeResponse {
  role: Role | 'kid';
  user?: { id: string; email: string; display_name: string | null; role: Role; family_id: string | null };
  family?: { id: string; name: string; region: string } | null;
  kid_profiles?: Array<{ id: string; nickname: string; age: number }>;
  kid?: { id: string; nickname: string; age?: number; family_id: string | null };
}

export interface VerifyOtpResponse {
  access_token: string;
  expires_in: number;
  user: {
    id: string;
    email: string;
    display_name: string | null;
    role: Role;
    family_id: string | null;
    is_new_user: boolean;
  };
}

export interface KidLoginResponse {
  access_token: string;
  expires_in: number;
  kid: {
    id: string;
    nickname: string;
    age: number;
    family_id: string | null;
  };
}

export interface ClassCodeLoginResponse {
  access_token: string;
  expires_in: number;
  kid: {
    id: string;
    nickname: string;
    class_id: string;
    is_ephemeral: boolean;
  };
}
