import { type FormEvent, useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function Login() {
  const { signIn } = useAuth()
  const nav = useNavigate()
  const loc = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setErr(null)
    setBusy(true)
    try {
      await signIn(email, password)
      const dest = (loc.state as { from?: string } | null)?.from ?? '/picker'
      nav(dest, { replace: true })
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Sign in failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="min-h-screen bg-cream text-charcoal flex flex-col items-center justify-center px-6">
      <form onSubmit={onSubmit} className="w-full max-w-sm space-y-4">
        <h1 className="text-3xl font-semibold tracking-tight mb-6">Welcome back</h1>
        <input
          className="w-full rounded-md border border-charcoal/40 px-3 py-2 bg-transparent"
          type="email"
          placeholder="Parent email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          className="w-full rounded-md border border-charcoal/40 px-3 py-2 bg-transparent"
          type="password"
          placeholder="Password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        {err && <p className="text-sm text-red-700">{err}</p>}
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-md bg-charcoal text-cream px-4 py-2 hover:opacity-80 disabled:opacity-50"
        >
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
        <p className="text-sm opacity-70 text-center">
          No account? <Link to="/signup" className="underline">Sign up</Link>
        </p>
      </form>
    </main>
  )
}
