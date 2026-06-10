import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { getToken } from '@/auth/authStore';
import { BASE_URL, api } from '@/lib/api';

export interface LearningSession {
  id: string;
  studio: 'image' | 'music' | 'voice' | 'video' | 'chat' | 'mission' | null;
  started_at: string;
  stars_used: number;
  llm_calls: number;
  artifacts_count: number;
}

export interface SessionSummary {
  id: string;
  duration_minutes: number;
  stars_used: number;
  artifacts_count: number;
  llm_calls: number;
}

const HEARTBEAT_MS = 60_000;

/**
 * Best-effort session-end that survives page unload. `navigator.sendBeacon`
 * CAN'T carry the in-memory `Authorization: Bearer` header, so its DELETE would
 * be unauthenticated (401) and the session would never close. A `keepalive`
 * fetch outlives the page too AND lets us set the auth header — so it actually
 * works.
 */
function endSessionBeacon(sessionId: string): void {
  const token = getToken('kid');
  void fetch(`${BASE_URL}/learning-sessions/${sessionId}`, {
    method: 'DELETE',
    keepalive: true,
    credentials: 'include',
    headers: {
      'content-type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ reason: 'kid_exit' }),
  }).catch(() => undefined);
}

/**
 * Owns the whole Learning Session lifecycle for a studio: opens a session on
 * mount, heartbeats while alive, and ends it EXACTLY ONCE — via "Done for now"
 * (`endNow`, which also captures the exit summary), browser close (`pagehide`),
 * or unmount. A single `ended` flag coordinates all three paths so the session
 * is never double-deleted, the heartbeat never outlives it, and a session opened
 * just before unmount (incl. StrictMode's dev double-mount) is still closed
 * instead of orphaned until the server idle-times out.
 */
export function useStudioSession(studio: LearningSession['studio']) {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [summary, setSummary] = useState<SessionSummary | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const endedRef = useRef(false);
  const nav = useNavigate();

  useEffect(() => {
    let cancelled = false;
    let beat: ReturnType<typeof setInterval> | null = null;
    endedRef.current = false;
    sessionIdRef.current = null;

    api<LearningSession>('/learning-sessions', { method: 'POST', body: { studio } })
      .then((s) => {
        sessionIdRef.current = s.id;
        // Unmounted before the POST resolved → close the just-opened session now,
        // otherwise it leaks until the server idle-timeout fires.
        if (cancelled) {
          endedRef.current = true;
          void api(`/learning-sessions/${s.id}`, { method: 'DELETE', body: { reason: 'kid_exit' } }).catch(
            () => undefined,
          );
          return;
        }
        setSessionId(s.id);
        beat = setInterval(() => {
          if (sessionIdRef.current && !endedRef.current) {
            void api(`/learning-sessions/${sessionIdRef.current}/heartbeat`, {
              method: 'POST',
              body: {},
            }).catch(() => undefined);
          }
        }, HEARTBEAT_MS);
      })
      .catch(() => undefined);

    const endOnHide = () => {
      const id = sessionIdRef.current;
      if (id && !endedRef.current) {
        endedRef.current = true;
        endSessionBeacon(id);
      }
    };
    window.addEventListener('pagehide', endOnHide);

    return () => {
      cancelled = true;
      window.removeEventListener('pagehide', endOnHide);
      if (beat) clearInterval(beat);
      const id = sessionIdRef.current;
      if (id && !endedRef.current) {
        endedRef.current = true;
        void api(`/learning-sessions/${id}`, { method: 'DELETE', body: { reason: 'kid_exit' } }).catch(
          () => undefined,
        );
      }
    };
  }, [studio]);

  /**
   * "Done for now": end the session once and keep the summary for the exit
   * modal. Marks `ended` so the heartbeat stops and unmount won't delete it
   * again (a failed delete resets the flag so unmount can retry).
   */
  const endNow = useCallback(async () => {
    const id = sessionIdRef.current;
    if (!id || endedRef.current) {
      nav('/learn/create');
      return;
    }
    endedRef.current = true;
    try {
      const res = await api<SessionSummary>(`/learning-sessions/${id}`, {
        method: 'DELETE',
        body: { reason: 'kid_exit' },
      });
      setSummary(res);
    } catch {
      endedRef.current = false; // delete failed → let unmount retry
      nav('/learn/create');
    }
  }, [nav]);

  const dismiss = useCallback(() => {
    setSummary(null);
    nav('/learn/create');
  }, [nav]);

  return { sessionId, summary, endNow, dismiss };
}
