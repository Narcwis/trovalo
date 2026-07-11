const LS_KEY = "trovalo_app_version";

export const APP_VERSION: string =
  (typeof import.meta !== "undefined" && import.meta.env.VITE_APP_VERSION) ||
  "";

let _latestVersion: string | null = null;

export function getLatestVersion(): string | null {
  return _latestVersion;
}

export async function checkForUpdate(): Promise<boolean> {
  if (!navigator.onLine) return false;

  const cached = localStorage.getItem(LS_KEY) || APP_VERSION;

  try {
    const base = import.meta.env.BASE_URL || "/";
    const url = `${base}version.json?t=${Date.now()}`;
    const res = await fetch(url);
    if (!res.ok) return false;
    const data = await res.json();
    _latestVersion = data.version;

    if (_latestVersion && _latestVersion !== cached) {
      localStorage.setItem(LS_KEY, _latestVersion);
      return true;
    }

    if (_latestVersion) {
      localStorage.setItem(LS_KEY, _latestVersion);
    }
    return false;
  } catch {
    return false;
  }
}
