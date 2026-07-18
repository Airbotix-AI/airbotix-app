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
  // Unclaimed walk-in workshop kid (auth-system-prd §5.2): drives the restricted
  // Learn surface (current class + kid code only) until a parent claims them.
  is_ephemeral?: boolean;
  // The kid's own claim code — present only while unclaimed.
  claim_code?: string;
}

export type AuthPrincipal = UserPrincipal | KidPrincipal;

export type PrincipalKind = 'user' | 'kid';

// Response shapes from platform-backend (auth-system-prd.md §4).

export interface MeResponse {
  role: Role | 'kid';
  user?: { id: string; email: string; display_name: string | null; role: Role; family_id: string | null };
  family?: { id: string; name: string; region: string } | null;
  kid_profiles?: Array<{ id: string; nickname: string; age: number }>;
  kid?: {
    id: string;
    nickname: string;
    age?: number;
    family_id: string | null;
    is_ephemeral?: boolean;
    claim_code?: string;
  };
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

// Class login with teacher approval (auth-system-prd §5.3) — an enrolled kid
// requests to sign into their REAL account with the class code + their name,
// then polls until the teacher approves from teacher-console.

export interface ClassLoginRequestCreateResponse {
  request_id: string;
  secret: string; // returned exactly once; kept in sessionStorage for polling
  status: 'pending';
  expires_at: string;
  class_name: string;
}

export type ClassLoginPollResponse =
  | { status: 'pending' | 'denied' | 'expired' | 'consumed' }
  | {
      status: 'approved';
      access_token: string;
      expires_in: number;
      kid: {
        id: string;
        nickname: string;
        age: number;
        family_id: string | null;
        class_id: string;
      };
    };

// What the waiting screen persists so a reload can resume polling.
export interface StoredClassLoginRequest {
  request_id: string;
  secret: string;
  expires_at: string;
  class_name: string;
}
