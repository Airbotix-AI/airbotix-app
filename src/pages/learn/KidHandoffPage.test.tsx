// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { api } = vi.hoisted(() => ({ api: vi.fn() }))
vi.mock('@/lib/api', () => ({
  api,
  ApiError: class ApiError extends Error {},
}))
vi.mock('@/lib/ws', () => ({ getSocket: vi.fn(), closeSocket: vi.fn() }))

import { useAuthStore } from '@/auth/authStore'
import { KidHandoffPage } from './KidHandoffPage'

const storageValues = new Map<string, string>()
const memoryStorage: Storage = {
  get length() {
    return storageValues.size
  },
  clear: () => storageValues.clear(),
  getItem: (key) => storageValues.get(key) ?? null,
  key: (index) => [...storageValues.keys()][index] ?? null,
  removeItem: (key) => storageValues.delete(key),
  setItem: (key, value) => storageValues.set(key, value),
}

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/learn/handoff']}>
      <Routes>
        <Route path="/learn/handoff" element={<KidHandoffPage />} />
        <Route path="/learn" element={<div>LEARN HOME</div>} />
        <Route path="/learn/login" element={<div>LOGIN</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('KidHandoffPage', () => {
  beforeEach(() => {
    api.mockReset()
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      value: memoryStorage,
    })
    window.localStorage.clear()
    useAuthStore.getState().clearAll()
    window.history.replaceState(null, '', '/learn/handoff#token=opaque-token')
  })

  afterEach(cleanup)

  it('shows avatar + nickname before a one-tap kid login', async () => {
    api.mockImplementation(async (path: string) => {
      if (path === '/auth/kid-handoff/preview') {
        return { kid: { nickname: 'Mia', avatar_id: 'nature-explorer' } }
      }
      if (path === '/auth/kid-handoff/redeem') {
        return {
          access_token: 'kid.jwt',
          expires_in: 900,
          device_hint: 'trusted-device-hint',
          kid: {
            id: 'kid-1',
            nickname: 'Mia',
            avatar_id: 'nature-explorer',
            age: 9,
            family_id: 'family-1',
          },
        }
      }
      throw new Error(`Unexpected ${path}`)
    })
    renderPage()

    expect(await screen.findByText('Mia')).toBeInTheDocument()
    expect(screen.getByAltText(/Mia's avatar/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Continue as Mia →' }))

    await waitFor(() => expect(screen.getByText('LEARN HOME')).toBeInTheDocument())
    expect(api).toHaveBeenCalledWith('/auth/kid-handoff/preview', {
      method: 'POST',
      body: { token: 'opaque-token' },
      skipAuthRefresh: true,
    })
    expect(api).toHaveBeenCalledWith('/auth/kid-handoff/redeem', {
      method: 'POST',
      body: { token: 'opaque-token' },
      skipAuthRefresh: true,
    })
    expect(window.localStorage.getItem('airbotix.trustedKidDevice.v1')).toBe(
      'trusted-device-hint',
    )
    expect(useAuthStore.getState().tokens.kid).toBe('kid.jwt')
    expect(window.location.hash).toBe('')
  })

  it('does not redeem an expired link and offers the normal login fallback', async () => {
    api.mockRejectedValue(new Error('expired'))
    renderPage()

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'This sign-in link is no longer valid.',
    )
    expect(screen.getByRole('link', { name: /Use another sign-in method/ })).toBeInTheDocument()
    expect(api).toHaveBeenCalledTimes(1)
  })
})
