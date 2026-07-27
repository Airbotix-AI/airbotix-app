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
import { LoginPage } from './LoginPage'

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

function renderLogin() {
  return render(
    <MemoryRouter initialEntries={['/learn/login']}>
      <Routes>
        <Route path="/learn/login" element={<LoginPage />} />
        <Route path="/learn" element={<div>LEARN HOME</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('trusted kid device login', () => {
  beforeEach(() => {
    api.mockReset()
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      value: memoryStorage,
    })
    window.localStorage.clear()
    window.localStorage.setItem('airbotix.trustedKidDevice.v1', 'trusted-hint')
    useAuthStore.getState().clearAll()
  })

  afterEach(cleanup)

  it('shows exactly the remembered child and hides family code + nickname', async () => {
    api.mockResolvedValue({
      kid: { nickname: 'Mia', avatar_id: 'nature-explorer' },
    })
    renderLogin()

    expect(await screen.findByText('Hi Mia!')).toBeInTheDocument()
    expect(screen.getByAltText(/Mia's avatar/)).toBeInTheDocument()
    expect(screen.queryByPlaceholderText('WANG')).not.toBeInTheDocument()
    expect(screen.queryByPlaceholderText('Mia')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Use a different account' }))
    expect(screen.getByPlaceholderText('WANG')).toBeInTheDocument()
    expect(window.localStorage.getItem('airbotix.trustedKidDevice.v1')).toBeNull()
  })

  it('still requires the remembered child PIN before opening Learn', async () => {
    api.mockImplementation(async (path: string) => {
      if (path === '/auth/kid-device/preview') {
        return { kid: { nickname: 'Mia', avatar_id: 'nature-explorer' } }
      }
      if (path === '/auth/kid-device/login') {
        return {
          access_token: 'kid.jwt',
          expires_in: 900,
          kid: { id: 'kid-1', nickname: 'Mia', age: 9, family_id: 'family-1' },
        }
      }
      throw new Error(`Unexpected ${path}`)
    })
    renderLogin()

    const pin = await screen.findByLabelText("Mia's PIN")
    fireEvent.change(pin, { target: { value: '1234' } })
    fireEvent.click(screen.getByRole('button', { name: 'Continue as Mia →' }))

    await waitFor(() => expect(screen.getByText('LEARN HOME')).toBeInTheDocument())
    expect(api).toHaveBeenCalledWith('/auth/kid-device/login', {
      method: 'POST',
      body: { device_hint: 'trusted-hint', pin: '1234' },
      skipAuthRefresh: true,
    })
    expect(useAuthStore.getState().tokens.kid).toBe('kid.jwt')
  })

  it('clears an invalid hint and falls back to the normal sign-in form', async () => {
    api.mockRejectedValue(new Error('revoked'))
    renderLogin()

    await waitFor(() => expect(screen.getByPlaceholderText('WANG')).toBeInTheDocument())
    expect(window.localStorage.getItem('airbotix.trustedKidDevice.v1')).toBeNull()
    expect(screen.queryByPlaceholderText('Mia')).not.toBeInTheDocument()
    fireEvent.change(screen.getByPlaceholderText('WANG'), { target: { value: 'TEST01' } })
    fireEvent.click(screen.getByRole('button', { name: 'Next →' }))
    expect(await screen.findByPlaceholderText('Mia')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('••••')).toBeInTheDocument()
  })
})
