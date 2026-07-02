import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { pollClassLoginRequest } from '@/auth/useAuth';
import { useAuthStore } from '@/auth/authStore';
import type { StoredClassLoginRequest } from '@/auth/types';
import { ApiError, refreshAccessToken } from '@/lib/api';
import { getSocket } from '@/lib/ws';

const POLL_MS = 3000;

type WaitState = 'waiting' | 'denied' | 'expired' | 'error';

// Post-request waiting screen (auth-system-prd §5.3): polls until the teacher
// decides. `approved` navigates into /learn; `consumed` means another tab (or a
// pre-reload poll) already took the tokens — the refresh cookie is set, so a
// silent /auth/refresh recovers the session.
export function ClassLoginWaiting({
  request,
  onExit,
}: {
  request: StoredClassLoginRequest;
  onExit: () => void;
}) {
  const nav = useNavigate();
  const [state, setState] = useState<WaitState>('waiting');
  // The poll loop must stop permanently once we hit a terminal state or unmount.
  const stopped = useRef(false);

  useEffect(() => {
    stopped.current = false;

    const enterLearn = () => {
      stopped.current = true;
      nav('/learn', { replace: true });
    };

    const tick = async () => {
      if (stopped.current) return;
      try {
        const res = await pollClassLoginRequest(request.request_id, request.secret);
        if (stopped.current) return;
        if (res.status === 'approved') {
          enterLearn();
        } else if (res.status === 'consumed') {
          const token = await refreshAccessToken('kid');
          if (stopped.current) return;
          if (token) {
            useAuthStore.getState().setBootstrapped(true);
            setTimeout(() => getSocket('kid'), 0);
            enterLearn();
          } else {
            stopped.current = true;
            setState('expired');
          }
        } else if (res.status === 'denied' || res.status === 'expired') {
          stopped.current = true;
          setState(res.status);
        }
        // 'pending' → keep waiting.
      } catch (e) {
        if (stopped.current) return;
        if (e instanceof ApiError && e.status === 401) {
          // Unknown request / bad secret — treat like an expired request.
          stopped.current = true;
          setState('expired');
        } else {
          // Transient network trouble: show a soft banner but keep polling.
          setState('error');
        }
      }
    };

    void tick();
    const timer = setInterval(() => void tick(), POLL_MS);
    return () => {
      stopped.current = true;
      clearInterval(timer);
    };
  }, [request.request_id, request.secret, nav]);

  if (state === 'denied') {
    return (
      <StatusCard emoji="🙅" title="Not right now">
        Your teacher said not this time — go check with them.
        <RetryButton onClick={onExit} label="Back" />
      </StatusCard>
    );
  }
  if (state === 'expired') {
    return (
      <StatusCard emoji="⏰" title="That took too long">
        Your request ran out of time. Ask your teacher, then try again.
        <RetryButton onClick={onExit} label="Try again" />
      </StatusCard>
    );
  }

  return (
    <div className="mt-8 text-center" data-testid="class-login-waiting">
      <div className="text-[64px] leading-none" aria-hidden>
        ✋
      </div>
      <h2 className="mt-4 text-[22px] font-extrabold text-ink">
        Ask your teacher to let you in!
      </h2>
      <p className="mt-2 text-[14px] text-slate2">
        We told <span className="font-semibold">{request.class_name}</span>'s teacher you're here.
        Hang tight<AnimatedDots />
      </p>
      {state === 'error' && (
        <div className="mt-4 rounded-2xl bg-wash-coral border border-brand-coral/30 px-4 py-3 text-[13px] font-medium text-ink">
          Having trouble reaching the internet — still trying…
        </div>
      )}
      <button type="button" onClick={onExit} className="btn-pill-ghost mt-8">
        Cancel
      </button>
    </div>
  );
}

function StatusCard({
  emoji,
  title,
  children,
}: {
  emoji: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mt-8 text-center">
      <div className="text-[64px] leading-none" aria-hidden>
        {emoji}
      </div>
      <h2 className="mt-4 text-[22px] font-extrabold text-ink">{title}</h2>
      <p className="mt-2 text-[14px] text-slate2">{children}</p>
    </div>
  );
}

function RetryButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <span className="mt-6 block">
      <button type="button" onClick={onClick} className="btn-pill-primary">
        {label}
      </button>
    </span>
  );
}

function AnimatedDots() {
  return (
    <span className="inline-block w-6 text-left" aria-hidden>
      <span className="animate-pulse">…</span>
    </span>
  );
}
