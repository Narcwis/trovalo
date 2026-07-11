const LS_KEY = "trovalo_device_id";
const LS_FP_KEY = "trovalo_device_fingerprint";
const DB_NAME = "trovalo_device_store";
const DB_VERSION = 1;
const STORE_NAME = "device";

/**
 * Open an IndexedDB store for redundant device ID storage.
 * iOS Safari can wipe localStorage but sometimes leaves IndexedDB intact, and vice versa.
 */
function openDeviceStore(): Promise<IDBObjectStore> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    req.onsuccess = () => {
      const db = req.result;
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      resolve(store);
    };
    req.onerror = () => reject(req.error);
  });
}

/**
 * Write a value to IndexedDB.
 */
async function idbSet(key: string, value: string): Promise<void> {
  try {
    const store = await openDeviceStore();
    store.put(value, key);
  } catch {
    // IndexedDB might be unavailable (private browsing, storage quota)
  }
}

/**
 * Read a value from IndexedDB.
 */
async function idbGet(key: string): Promise<string | null> {
  try {
    const store = await openDeviceStore();
    return new Promise((resolve) => {
      const req = store.get(key);
      req.onsuccess = () => resolve(req.result ?? null);
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

/**
 * Generate a UUID v4 string.
 */
function generateId(): string {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Compute a simple browser fingerprint hash from semi-stable characteristics.
 * This is NOT cryptographically secure — it's a fallback helper to
 * probabilistically recognize a device after storage wipe.
 */
function computeFingerprint(): string {
  const parts: string[] = [
    navigator.userAgent || "",
    navigator.language || "",
    Intl.DateTimeFormat().resolvedOptions().timeZone || "",
    screen.width.toString(),
    screen.height.toString(),
    screen.colorDepth.toString(),
    (navigator as any).deviceMemory?.toString() || "",
    navigator.hardwareConcurrency?.toString() || "",
    navigator.platform || "",
  ];

  // Simple hash: djb2
  const str = parts.join("|||");
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash + str.charCodeAt(i)) & 0xffffffff;
  }
  return `fp-${Math.abs(hash).toString(16).padStart(8, "0")}`;
}

/**
 * Get or create the persistent device identity.
 *
 * Strategy (defense-in-depth against iOS storage wipes):
 * 1. Read from localStorage (fast, but can be wiped by iOS)
 * 2. If missing, read from IndexedDB (sometimes survives when localStorage doesn't)
 * 3. If both are missing, compute a fingerprint hash as probabilistic fallback
 * 4. Regenerate a fresh UUID, store it in both backends
 */
export async function getDeviceId(): Promise<string> {
  // Fast path: localStorage
  let id = localStorage.getItem(LS_KEY);
  if (id) return id;

  // Recovery path: IndexedDB
  id = await idbGet(LS_KEY);
  if (id) {
    // Restore to localStorage so subsequent loads are fast
    try {
      localStorage.setItem(LS_KEY, id);
    } catch {
      // localStorage may be full or unavailable
    }
    return id;
  }

  // Last resort: check stored fingerprint
  const storedFp = localStorage.getItem(LS_FP_KEY) || (await idbGet(LS_FP_KEY));
  const fp = computeFingerprint();

  // Generate a brand new ID
  id = generateId();

  // Store in both backends
  try {
    localStorage.setItem(LS_KEY, id);
  } catch {
    // ignore
  }
  await idbSet(LS_KEY, id);

  // Store current fingerprint for future recovery
  try {
    localStorage.setItem(LS_FP_KEY, fp);
  } catch {
    // ignore
  }
  await idbSet(LS_FP_KEY, fp);

  return id;
}

/**
 * Get the current browser fingerprint.
 */
export function getFingerprint(): string {
  let fp = localStorage.getItem(LS_FP_KEY);
  if (!fp) {
    fp = computeFingerprint();
    try {
      localStorage.setItem(LS_FP_KEY, fp);
    } catch {
      // ignore
    }
  }
  return fp;
}

/**
 * Register or re-associate the device with the server.
 * This gives the server a way to recognize devices even after a full client wipe,
 * by matching the fingerprint against previously registered fingerprints.
 */
export async function registerDeviceWithServer(): Promise<{
  allowed: boolean;
}> {
  const deviceId = await getDeviceId();
  const fp = getFingerprint();

  try {
    const res = await fetch("/api/device/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ device_id: deviceId, fingerprint: fp }),
    });
    const data = await res.json();
    return { allowed: data.allowed ?? false };
  } catch {
    // Server unreachable (offline) — assume allowed for offline-first mode
    return { allowed: true };
  }
}

/**
 * Returns headers that should be attached to all requests
 * so the server can identify and authorize the device.
 */
export async function getDeviceHeaders(): Promise<Record<string, string>> {
  const deviceId = await getDeviceId();
  return {
    "x-device-id": deviceId,
  };
}
