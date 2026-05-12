import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { useAuth } from '../contexts/AuthContext'

type Family = {
  ok: boolean
  family: { id: string; timezone: string } | null
  kid_profiles: Array<{ id: string; nickname: string; age_band: string }>
  wallet: { balance: number; daily_used: number; daily_limit: number; paused: boolean } | null
}

export default function KidPicker() {
  const { signOut } = useAuth()
  const nav = useNavigate()
  const [data, setData] = useState<Family | null>(null)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    api<Family>('/api/families/me')
      .then((d) => {
        if (d.kid_profiles.length === 0) {
          nav('/setup', { replace: true })
        } else {
          setData(d)
        }
      })
      .catch((e: Error) => setErr(e.message))
  }, [nav])

  if (err) return (
    <main className="min-h-screen flex items-center justify-center bg-cream">
      <p className="text-red-700">{err}</p>
    </main>
  )
  if (!data) return (
    <main className="min-h-screen flex items-center justify-center bg-cream">
      <p className="opacity-60">Loading family…</p>
    </main>
  )

  return (
    <main className="min-h-screen bg-cream text-charcoal px-6 py-10">
      <header className="max-w-3xl mx-auto flex items-center justify-between mb-10">
        <h1 className="text-2xl font-semibold tracking-tight">Who's creating today?</h1>
        <div className="flex items-center gap-4 text-sm">
          {data.wallet && (
            <span className="opacity-70">⭐ {data.wallet.balance}</span>
          )}
          <button onClick={() => signOut().then(() => nav('/login'))} className="underline opacity-60">
            Sign out
          </button>
        </div>
      </header>

      <section className="max-w-3xl mx-auto grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {data.kid_profiles.map((kid) => (
          <Link
            key={kid.id}
            to={`/kid/${kid.id}/home`}
            className="aspect-square rounded-2xl border border-charcoal/20 bg-white/40 flex flex-col items-center justify-center hover:bg-white/70 transition"
          >
            <div className="text-4xl mb-2">🧑‍🎨</div>
            <p className="font-medium">{kid.nickname}</p>
            <p className="text-xs opacity-60">{kid.age_band}</p>
          </Link>
        ))}
        <Link
          to="/setup"
          className="aspect-square rounded-2xl border border-dashed border-charcoal/40 flex flex-col items-center justify-center text-charcoal/60 hover:text-charcoal hover:border-charcoal/70 transition"
        >
          <div className="text-3xl mb-2">+</div>
          <p className="text-sm">Add another kid</p>
        </Link>
      </section>
    </main>
  )
}
