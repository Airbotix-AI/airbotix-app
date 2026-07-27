const KID_DEVICE_HINT_KEY = 'airbotix.trustedKidDevice.v1'

export function loadKidDeviceHint(): string | null {
  try {
    return window.localStorage.getItem(KID_DEVICE_HINT_KEY)
  } catch {
    return null
  }
}

export function saveKidDeviceHint(deviceHint: string): void {
  try {
    window.localStorage.setItem(KID_DEVICE_HINT_KEY, deviceHint)
  } catch {
    // Private browsing and managed devices may block local storage. The kid is
    // still signed in; only the optional returning-device shortcut is skipped.
  }
}

export function clearKidDeviceHint(): void {
  try {
    window.localStorage.removeItem(KID_DEVICE_HINT_KEY)
  } catch {
    // No local hint means there is nothing else to clear.
  }
}
