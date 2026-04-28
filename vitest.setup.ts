/**
 * Vitest setup: install a working in-memory localStorage and sessionStorage.
 *
 * Background: vitest 4.x with jsdom 28 ships a non-functional `localStorage`
 * stub (`typeof localStorage === "object"` but `localStorage.setItem` is not
 * a function). The vitest CLI emits a warning:
 *   "Warning: `--localstorage-file` was provided without a valid path".
 *
 * The storage layer in this project (src/storage/settings.ts) gates on a
 * runtime probe (`localStorage.setItem("__test__", "__test__")`) which throws
 * against the stub, so all save/load roundtrips silently no-op. This file
 * replaces both `globalThis.localStorage` and `window.localStorage` with a
 * minimal `Storage`-shaped Map-backed implementation that behaves like the
 * browser API.
 *
 * Reference: vitest issue tracker discusses this regression around
 *            vitest 4.0 / jsdom 24+ default storage handling.
 */

interface MapBackedStorage extends Storage {
  readonly _store: Map<string, string>;
}

function createMapBackedStorage(): MapBackedStorage {
  const store = new Map<string, string>();
  return {
    _store: store,
    get length(): number {
      return store.size;
    },
    key(index: number): string | null {
      return Array.from(store.keys())[index] ?? null;
    },
    getItem(key: string): string | null {
      return store.has(key) ? (store.get(key) as string) : null;
    },
    setItem(key: string, value: string): void {
      store.set(key, String(value));
    },
    removeItem(key: string): void {
      store.delete(key);
    },
    clear(): void {
      store.clear();
    },
  };
}

const localStorageImpl = createMapBackedStorage();
const sessionStorageImpl = createMapBackedStorage();

Object.defineProperty(globalThis, "localStorage", {
  configurable: true,
  writable: true,
  value: localStorageImpl,
});
Object.defineProperty(globalThis, "sessionStorage", {
  configurable: true,
  writable: true,
  value: sessionStorageImpl,
});

if (typeof window !== "undefined") {
  Object.defineProperty(window, "localStorage", {
    configurable: true,
    writable: true,
    value: localStorageImpl,
  });
  Object.defineProperty(window, "sessionStorage", {
    configurable: true,
    writable: true,
    value: sessionStorageImpl,
  });
}
