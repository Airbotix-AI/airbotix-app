// Node 20 exposes an experimental `localStorage` getter that resolves to
// undefined unless the process is started with --localstorage-file. That getter
// can shadow jsdom's Storage in Vitest workers, so install a per-worker in-memory
// implementation only when the environment did not provide one.
if (typeof globalThis.localStorage === 'undefined') {
  const values = new Map<string, string>()
  const storage: Storage = {
    get length() {
      return values.size
    },
    clear: () => values.clear(),
    getItem: (key) => values.get(key) ?? null,
    key: (index) => [...values.keys()][index] ?? null,
    removeItem: (key) => {
      values.delete(key)
    },
    setItem: (key, value) => {
      values.set(key, String(value))
    },
  }
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: storage,
  })
}
