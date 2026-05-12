import { type FormEvent, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'

type KidProfile = { id: string; nickname: string; age_band: string }

export default function Setup() {
  const nav = useNavigate()
  const [nickname, setNickname] = useState('')
  const [ageBand, setAgeBand] = useState<'6-8' | '9-11' | '12-14' | '15-17'>('9-11')
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function addKid(e: FormEvent) {
    e.preventDefault()
    setErr(null)
    setBusy(true)
    try {
      await api<{ ok: boolean; kid_profile: KidProfile }>('/api/kid-profiles', {
        method: 'POST',
        json: { nickname, age_band: ageBand },
      })
      nav('/picker', { replace: true })
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Failed to add kid')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="min-h-screen bg-cream text-charcoal flex flex-col items-center justify-center px-6">
      <form onSubmit={addKid} className="w-full max-w-sm space-y-4">
        <h1 className="text-3xl font-semibold tracking-tight mb-1">Add your first kid</h1>
        <p className="text-sm opacity-70 mb-4">
          You can add more later. Don't include their real name — pick a fun nickname.
        </p>
        <input
          className="w-full rounded-md border border-charcoal/40 px-3 py-2 bg-transparent"
          type="text"
          placeholder="Nickname (e.g. Stardust)"
          value={nickname}
          maxLength={40}
          onChange={(e) => setNickname(e.target.value)}
          required
        />
        <select
          className="w-full rounded-md border border-charcoal/40 px-3 py-2 bg-cream"
          value={ageBand}
          onChange={(e) => setAgeBand(e.target.value as typeof ageBand)}
        >
          <option value="6-8">6-8 years</option>
          <option value="9-11">9-11 years</option>
          <option value="12-14">12-14 years</option>
          <option value="15-17">15-17 years</option>
        </select>
        {err && <p className="text-sm text-red-700">{err}</p>}
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-md bg-charcoal text-cream px-4 py-2 hover:opacity-80 disabled:opacity-50"
        >
          {busy ? 'Adding…' : 'Add kid'}
        </button>
      </form>
    </main>
  )
}
