import { Link, useParams } from 'react-router-dom'

export default function KidHome() {
  const { kidId } = useParams<{ kidId: string }>()
  return (
    <main className="min-h-screen bg-cream text-charcoal px-6 py-10">
      <Link to="/picker" className="text-sm opacity-60 underline">← back to picker</Link>
      <h1 className="text-3xl font-semibold tracking-tight mt-6 mb-2">Hi! 👋</h1>
      <p className="opacity-70">Kid home for {kidId}. Mission picker coming next phase.</p>
    </main>
  )
}
