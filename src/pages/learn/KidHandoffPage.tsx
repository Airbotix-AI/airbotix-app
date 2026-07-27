import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { saveKidDeviceHint } from '@/auth/kidDeviceHint'
import type { KidDeviceIdentity } from '@/auth/types'
import { previewKidHandoff, redeemKidHandoff } from '@/auth/useAuth'
import { AuthIdentityLayout } from '@/components/auth/AuthIdentityLayout'
import { KidAvatar } from '@/components/KidAvatar'
import { ApiError } from '@/lib/api'

function tokenFromFragment(): string | null {
  return new URLSearchParams(window.location.hash.slice(1)).get('token')
}

export function KidHandoffPage() {
  const nav = useNavigate()
  const [token] = useState(tokenFromFragment)
  const [kid, setKid] = useState<KidDeviceIdentity | null>(null)
  const [loading, setLoading] = useState(true)
  const [continuing, setContinuing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let current = true
    if (!token) {
      setError('This sign-in link is missing or invalid.')
      setLoading(false)
      return
    }
    previewKidHandoff(token)
      .then((response) => {
        if (current) setKid(response.kid)
      })
      .catch((cause) => {
        if (current) {
          setError(cause instanceof ApiError ? cause.message : 'This sign-in link is no longer valid.')
        }
      })
      .finally(() => {
        if (current) setLoading(false)
      })
    return () => {
      current = false
    }
  }, [token])

  const continueAsKid = async () => {
    if (!token || !kid) return
    setContinuing(true)
    setError(null)
    try {
      const response = await redeemKidHandoff(token)
      if (response.device_hint) saveKidDeviceHint(response.device_hint)
      window.history.replaceState(null, '', '/learn/handoff')
      nav('/learn', { replace: true })
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : 'Could not continue. Ask your parent for a new QR code.')
      setContinuing(false)
    }
  }

  return (
    <AuthIdentityLayout activeRole="kid">
      <div>
        <span className="sticker-sky">Parent approved</span>
      </div>
      <h1 className="hero-display mt-6">Is this you?</h1>

      {loading ? (
        <p className="lead-text mt-5">Checking your sign-in code…</p>
      ) : kid ? (
        <div className="mt-6 text-center">
          <div className="flex justify-center">
            <KidAvatar avatarId={kid.avatar_id} nickname={kid.nickname} size="xl" />
          </div>
          <div className="mt-4 text-[30px] font-bold text-ink">{kid.nickname}</div>
          <p className="lead-text mt-2">
            Check the picture and name. If they are yours, continue to your kids page.
          </p>
          <button
            type="button"
            disabled={continuing}
            onClick={continueAsKid}
            className="btn-pill-primary mt-6 w-full"
          >
            {continuing ? 'Opening…' : `Continue as ${kid.nickname} →`}
          </button>
        </div>
      ) : null}

      {error && (
        <div className="mt-6 rounded-2xl border border-brand-coral/30 bg-wash-coral px-4 py-3">
          <p className="text-[13px] font-medium text-ink" role="alert">
            {error}
          </p>
          <p className="mt-2 text-[12px] text-slate2">
            Ask your parent to create a new QR code, or use your family code and PIN.
          </p>
          <Link to="/learn/login" className="btn-pill-secondary mt-4">
            Use another sign-in method
          </Link>
        </div>
      )}
    </AuthIdentityLayout>
  )
}
