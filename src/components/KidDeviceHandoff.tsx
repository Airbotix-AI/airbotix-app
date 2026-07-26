import { QRCodeSVG } from 'qrcode.react'
import { useState } from 'react'

import {
  createKidHandoff,
  revokeKidDevices,
} from '@/auth/useAuth'
import type { KidHandoffCreateResponse } from '@/auth/types'
import { ApiError } from '@/lib/api'
import { KidAvatar } from './KidAvatar'

interface KidDeviceHandoffProps {
  kidId: string
  nickname: string
  avatarId?: string | null
  disabled?: boolean
}

function handoffUrl(token: string): string {
  return `${window.location.origin}/learn/handoff#token=${encodeURIComponent(token)}`
}

export function KidDeviceHandoff({
  kidId,
  nickname,
  avatarId,
  disabled = false,
}: KidDeviceHandoffProps) {
  const [open, setOpen] = useState(false)
  const [rememberDevice, setRememberDevice] = useState(false)
  const [handoff, setHandoff] = useState<KidHandoffCreateResponse | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [revoked, setRevoked] = useState<number | null>(null)
  const url = handoff ? handoffUrl(handoff.token) : null

  const close = () => {
    setOpen(false)
    setHandoff(null)
    setError(null)
    setCopied(false)
  }

  const create = async () => {
    setBusy(true)
    setError(null)
    try {
      setHandoff(await createKidHandoff(kidId, rememberDevice))
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : 'Could not create the sign-in code.')
    } finally {
      setBusy(false)
    }
  }

  const copy = async () => {
    if (!url) return
    await navigator.clipboard?.writeText(url)
    setCopied(true)
  }

  const revoke = async () => {
    setBusy(true)
    setError(null)
    try {
      setRevoked(await revokeKidDevices(kidId))
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : 'Could not forget remembered devices.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <button
        type="button"
        className="btn-pill-secondary"
        disabled={disabled}
        onClick={() => setOpen(true)}
        aria-label={`Open ${nickname} on another device`}
      >
        Another device
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 p-4"
          role="presentation"
          onMouseDown={(event) => {
            if (event.currentTarget === event.target) close()
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby={`kid-handoff-${kidId}`}
            className="w-full max-w-md rounded-[28px] bg-canvas-pure p-6 shadow-2xl"
          >
            <div className="flex items-start gap-3">
              <KidAvatar avatarId={avatarId} nickname={nickname} size="md" />
              <div className="min-w-0 flex-1">
                <div className="eyebrow eyebrow-sky">Another device</div>
                <h2 id={`kid-handoff-${kidId}`} className="mt-1 text-[24px] font-bold text-ink">
                  Open {nickname}&apos;s kids page
                </h2>
              </div>
              <button type="button" className="btn-pill-ghost" onClick={close} aria-label="Close">
                ×
              </button>
            </div>

            {handoff && url ? (
              <div className="mt-5 text-center">
                <div className="inline-flex rounded-3xl border border-ink/10 bg-white p-3">
                  <QRCodeSVG
                    value={url}
                    size={208}
                    level="M"
                    aria-label={`QR code to open ${nickname}'s kids page`}
                  />
                </div>
                <p className="mt-4 text-[15px] font-semibold text-ink">
                  On the child&apos;s device, scan this QR code.
                </p>
                <p className="mt-1 text-[13px] text-slate2">
                  Check the avatar and name, then tap Continue. This link expires in 5 minutes and
                  works once.
                </p>
                <button type="button" onClick={copy} className="btn-pill-secondary mt-4">
                  {copied ? 'Link copied ✓' : 'Copy link'}
                </button>
              </div>
            ) : (
              <>
                <ol className="mt-5 space-y-2 text-[14px] text-ink-soft">
                  <li>1. Create a temporary QR code.</li>
                  <li>2. Open the camera on {nickname}&apos;s device and scan it.</li>
                  <li>3. Check the avatar and name, then tap Continue.</li>
                </ol>
                <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-2xl bg-wash-mint p-4">
                  <input
                    type="checkbox"
                    className="mt-1 h-4 w-4"
                    checked={rememberDevice}
                    onChange={(event) => setRememberDevice(event.target.checked)}
                  />
                  <span>
                    <span className="block text-[14px] font-bold text-ink">
                      Remember {nickname} on that device for 30 days
                    </span>
                    <span className="mt-1 block text-[12px] text-slate2">
                      Next time it shows only this child, but still asks for their PIN. Leave this
                      off for shared devices.
                    </span>
                  </span>
                </label>
                <button
                  type="button"
                  disabled={busy}
                  onClick={create}
                  className="btn-pill-primary mt-5 w-full"
                >
                  {busy ? 'Creating…' : 'Create QR code'}
                </button>
              </>
            )}

            <div className="mt-5 border-t border-ink/10 pt-4">
              <button
                type="button"
                disabled={busy}
                onClick={revoke}
                className="text-[12px] font-semibold text-slate2 underline hover:text-ink"
              >
                Forget all remembered devices for {nickname}
              </button>
              {revoked !== null && (
                <p className="mt-1 text-[12px] text-brand-mint" role="status">
                  {revoked === 0 ? 'No remembered devices were active.' : `${revoked} device(s) forgotten.`}
                </p>
              )}
            </div>

            {error && (
              <p className="field-error mt-4" role="alert">
                {error}
              </p>
            )}
          </section>
        </div>
      )}
    </>
  )
}
