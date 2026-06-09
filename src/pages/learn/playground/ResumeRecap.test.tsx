// @vitest-environment jsdom
import { fireEvent, render, screen, cleanup } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { ResumeRecap } from './ResumeRecap'

afterEach(cleanup)

describe('ResumeRecap (resume welcome-back card, D-PAP-19,22)', () => {
  it('shows the summary, learned concepts, and the next step', () => {
    render(
      <ResumeRecap
        context={{
          summary: 'a jumping game with a red square',
          concepts: ['gravity', 'keyboard input'],
          next: 'add a score',
        }}
        onContinue={() => {}}
      />,
    )
    expect(screen.getByText('a jumping game with a red square')).toBeTruthy()
    expect(screen.getByText('gravity')).toBeTruthy()
    expect(screen.getByText('keyboard input')).toBeTruthy()
    expect(screen.getByText('add a score')).toBeTruthy()
  })

  it('renders without concepts/next (summary-only context)', () => {
    render(<ResumeRecap context={{ summary: 'just a summary' }} onContinue={() => {}} />)
    expect(screen.getByText('just a summary')).toBeTruthy()
    // No "Next we were going to" line when there is no next.
    expect(screen.queryByText(/Next we were going to/)).toBeNull()
  })

  it('fires onContinue when "Keep building" is tapped', () => {
    const onContinue = vi.fn()
    render(<ResumeRecap context={{ summary: 's' }} onContinue={onContinue} />)
    fireEvent.click(screen.getByRole('button', { name: /Keep building/ }))
    expect(onContinue).toHaveBeenCalledTimes(1)
  })
})
