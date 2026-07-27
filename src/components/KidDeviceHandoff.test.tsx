// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { api } = vi.hoisted(() => ({ api: vi.fn() }))

vi.mock('@/lib/api', () => ({
  api,
  ApiError: class ApiError extends Error {},
}))
vi.mock('qrcode.react', () => ({
  QRCodeSVG: ({ value }: { value: string }) => <div data-testid="qr-value">{value}</div>,
}))

import { KidDeviceHandoff } from './KidDeviceHandoff'

describe('KidDeviceHandoff', () => {
  beforeEach(() => {
    api.mockReset()
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: vi.fn().mockResolvedValue(undefined) },
    })
  })

  afterEach(cleanup)

  it('creates a one-use fragment link without kid identity or PII in the URL', async () => {
    api.mockResolvedValue({
      token: 'opaque_token_abcdefghijklmnopqrstuvwxyz123456',
      expires_at: new Date(Date.now() + 300_000).toISOString(),
      kid: { nickname: 'Mia', avatar_id: 'nature-explorer' },
    })
    render(
      <KidDeviceHandoff
        kidId="kid-secret-id"
        nickname="Mia"
        avatarId="nature-explorer"
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: /Open Mia on another device/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Create QR code' }))

    await waitFor(() => expect(screen.getByTestId('qr-value')).toBeInTheDocument())
    expect(api).toHaveBeenCalledWith('/auth/parent/kids/kid-secret-id/handoff', {
      method: 'POST',
      body: { remember_device: false },
      principal: 'user',
    })
    const qrUrl = screen.getByTestId('qr-value').textContent ?? ''
    expect(qrUrl).toContain('/learn/handoff#token=opaque_token_')
    expect(qrUrl).not.toContain('Mia')
    expect(qrUrl).not.toContain('kid-secret-id')
    expect(new URL(qrUrl).search).toBe('')
  })

  it('only requests a remembered device after the parent explicitly opts in', async () => {
    api.mockResolvedValue({
      token: 'opaque_token_abcdefghijklmnopqrstuvwxyz123456',
      expires_at: new Date(Date.now() + 300_000).toISOString(),
      kid: { nickname: 'Mia' },
    })
    render(<KidDeviceHandoff kidId="kid-1" nickname="Mia" />)

    fireEvent.click(screen.getByRole('button', { name: /Open Mia on another device/ }))
    fireEvent.click(
      screen.getByRole('checkbox', { name: /Remember Mia on that device for 30 days/ }),
    )
    fireEvent.click(screen.getByRole('button', { name: 'Create QR code' }))

    await waitFor(() =>
      expect(api).toHaveBeenCalledWith(
        '/auth/parent/kids/kid-1/handoff',
        expect.objectContaining({ body: { remember_device: true } }),
      ),
    )
  })
})
