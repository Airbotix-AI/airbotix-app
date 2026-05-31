import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { api } from '@/lib/api';

export interface LearningSession {
  id: string;
  studio: 'image' | 'music' | 'voice' | 'video' | 'chat' | 'mission' | null;
  started_at: string;
  stars_used: number;
  llm_calls: number;
  artifacts_count: number;
}

/**
 * Open a learning session when a studio mounts. Heartbeat every 60s while
 * mounted. End on unmount or browser pagehide. Returns the session id +
 * a `endNow(reason)` callback so studio can show summary screen.
 */
export function useStudioSession(studio: LearningSession['studio']) {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const sessionIdRef = useRef<string | null>(null);

  useEffect(() => {
    let mounted = true;
    let beat: ReturnType<typeof setInterval> | null = null;

    api<LearningSession>('/learning-sessions', {
      method: 'POST',
      body: { studio },
    })
      .then((s) => {
        if (!mounted) return;
        sessionIdRef.current = s.id;
        setSessionId(s.id);
        beat = setInterval(() => {
          if (sessionIdRef.current) {
            api(`/learning-sessions/${sessionIdRef.current}/heartbeat`, {
              method: 'POST',
              body: {},
            }).catch(() => undefined);
          }
        }, 60_000);
      })
      .catch(() => undefined);

    const endOnHide = () => {
      if (sessionIdRef.current) {
        // Use sendBeacon for unload reliability if available; otherwise fall back
        const url = `${import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3030'}/learning-sessions/${sessionIdRef.current}`;
        try {
          navigator.sendBeacon?.(
            url,
            new Blob([JSON.stringify({ reason: 'kid_exit' })], { type: 'application/json' }),
          );
        } catch {
          // best-effort
        }
      }
    };
    window.addEventListener('pagehide', endOnHide);

    return () => {
      mounted = false;
      window.removeEventListener('pagehide', endOnHide);
      if (beat) clearInterval(beat);
      if (sessionIdRef.current) {
        api(`/learning-sessions/${sessionIdRef.current}`, {
          method: 'DELETE',
          body: { reason: 'kid_exit' },
        }).catch(() => undefined);
      }
    };
  }, [studio]);

  return { sessionId };
}

export interface SessionSummary {
  id: string;
  duration_minutes: number;
  stars_used: number;
  artifacts_count: number;
  llm_calls: number;
}

/**
 * Exit-aware session summary modal. Triggered when kid clicks "Done for now"
 * or the unmount path captures one. Stores last summary in component state.
 */
export function useExitSummary() {
  const [summary, setSummary] = useState<SessionSummary | null>(null);
  const nav = useNavigate();

  const endNow = async (sessionId: string | null) => {
    if (!sessionId) {
      nav('/learn/create');
      return;
    }
    try {
      const res = await api<SessionSummary>(`/learning-sessions/${sessionId}`, {
        method: 'DELETE',
        body: { reason: 'kid_exit' },
      });
      setSummary(res);
    } catch {
      nav('/learn/create');
    }
  };

  const dismiss = () => {
    setSummary(null);
    nav('/learn/create');
  };

  return { summary, endNow, dismiss };
}
