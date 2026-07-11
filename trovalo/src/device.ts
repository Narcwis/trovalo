const LS_KEY = "trovalo_device_id";
const LS_FP_KEY = "trovalo_device_fingerprint";
const DB_NAME = "trovalo_device_store";
const DB_VERSION = 1;
const STORE_NAME = "device";

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

async function idbSet(key: string, value: string): Promise<void> {
  try {
    const store = await openDeviceStore();
    store.put(value, key);
  } catch {
  }
}

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
  const str = parts.join("|||");
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash + str.charCodeAt(i)) & 0xffffffff;
  }
  return `fp-${Math.abs(hash).toString(16).padStart(8, "0")}`;
}

export async function getDeviceId(): Promise<string> {
  let id = localStorage.getItem(LS_KEY);
  if (id) return id;

  id = await idbGet(LS_KEY);
  if (id) {
    try { localStorage.setItem(LS_KEY, id); } catch {}
    return id;
  }

  const storedFp = localStorage.getItem(LS_FP_KEY) || (await idbGet(LS_FP_KEY));
  const fp = computeFingerprint();
  id = generateId();

  try { localStorage.setItem(LS_KEY, id); } catch {}
  await idbSet(LS_KEY, id);
  try { localStorage.setItem(LS_FP_KEY, fp); } catch {}
  await idbSet(LS_FP_KEY, fp);

  return id;
}

export function getFingerprint(): string {
  let fp = localStorage.getItem(LS_FP_KEY);
  if (!fp) {
    fp = computeFingerprint();
    try { localStorage.setItem(LS_FP_KEY, fp); } catch {}
  }
  return fp;
}
