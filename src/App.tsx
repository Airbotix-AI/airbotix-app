import { useState } from 'react'

export default function App() {
  const [count, setCount] = useState(0)

  return (
    <main className="min-h-screen bg-cream text-charcoal flex flex-col items-center justify-center px-6">
      <h1 className="text-5xl font-semibold tracking-tight">Kids in AI · Creative</h1>
      <p className="mt-4 text-lg opacity-70">A safe, parent-monitored space for kids 6-11 to make with AI.</p>
      <button
        onClick={() => setCount((c) => c + 1)}
        className="mt-10 rounded-md bg-charcoal text-cream px-6 py-3 hover:opacity-80 transition"
      >
        clicks: {count}
      </button>
      <p className="mt-12 text-sm opacity-50">V0 scaffold — see CLAUDE.md for project context.</p>
    </main>
  )
}
