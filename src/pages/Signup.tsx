import { type FormEvent, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function Signup() {
  const { signUp } = useAuth()
  const nav = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [accepted, setAccepted] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setErr(null)
    if (!accepted) {
      setErr('Please accept the parental consent terms')
      return
    }
    setBusy(true)
    try {
      await signUp(email, password)
      // The on_auth_user_created trigger has created family + parent + wallet by now.
      // On signup, Supabase may send a confirmation email; for V0 we proceed straight to setup.
      nav('/setup', { replace: true })
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Sign up failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="min-h-screen bg-cream text-charcoal flex flex-col items-center justify-center px-6">
      <form onSubmit={onSubmit} className="w-full max-w-sm space-y-4">
        <h1 className="text-3xl font-semibold tracking-tight mb-1">Create parent account</h1>
        <p className="text-sm opacity-70 mb-4">
          Kids in AI accounts are owned by a parent. Your child will use a profile inside your account.
        </p>
        <input
          className="w-full rounded-md border border-charcoal/40 px-3 py-2 bg-transparent"
          type="email"
          placeholder="Your email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          className="w-full rounded-md border border-charcoal/40 px-3 py-2 bg-transparent"
          type="password"
          placeholder="Password (8+ chars)"
          autoComplete="new-password"
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <label className="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            checked={accepted}
            onChange={(e) => setAccepted(e.target.checked)}
            className="mt-1"
          />
          <span>
            I am a parent or legal guardian of any child who will use this account, and I consent to my child interacting with AI under my supervision.
          </span>
        </label>
        {err && <p className="text-sm text-red-700">{err}</p>}
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-md bg-charcoal text-cream px-4 py-2 hover:opacity-80 disabled:opacity-50"
        >
          {busy ? 'Creating account…' : 'Create account'}
        </button>
        <p className="text-sm opacity-70 text-center">
          Already have an account? <Link to="/login" className="underline">Sign in</Link>
        </p>
      </form>
    </main>
  )
}
