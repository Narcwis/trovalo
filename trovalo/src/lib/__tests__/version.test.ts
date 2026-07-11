import { describe, it, expect, vi, beforeEach } from "vitest";
import { checkForUpdate } from "../../version";

const BASE_URL = "/trovalo/";
const ORIGINAL_LOCAL_STORAGE = globalThis.localStorage;

beforeEach(() => {
  vi.stubGlobal("localStorage", {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
    length: 0,
    key: vi.fn(),
  });
  vi.stubGlobal("navigator", { onLine: true });
  vi.stubGlobal("fetch", vi.fn());
});

describe("checkForUpdate", () => {
  it("returns false when offline", async () => {
    vi.stubGlobal("navigator", { onLine: false });
    expect(await checkForUpdate()).toBe(false);
  });

  it("returns false when version.json fetch fails", async () => {
    vi.mocked(fetch).mockRejectedValue(new Error("network error"));
    expect(await checkForUpdate()).toBe(false);
  });

  it("returns false when server returns non-ok", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({}),
    } as Response);
    expect(await checkForUpdate()).toBe(false);
  });

  it("returns true when remote version differs from cached", async () => {
    localStorage.getItem = vi
      .fn()
      .mockImplementation((key: string) =>
        key === "trovalo_app_version" ? "old-version" : null,
      );
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ version: "new-version" }),
    } as Response);
    expect(await checkForUpdate()).toBe(true);
  });

  it("returns false when remote version matches cached", async () => {
    localStorage.getItem = vi
      .fn()
      .mockImplementation((key: string) =>
        key === "trovalo_app_version" ? "same-version" : null,
      );
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ version: "same-version" }),
    } as Response);
    expect(await checkForUpdate()).toBe(false);
  });

  it("caches the fetched version", async () => {
    const setItem = vi.fn();
    localStorage.getItem = vi.fn().mockReturnValue(null);
    localStorage.setItem = setItem;
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ version: "v2" }),
    } as Response);
    await checkForUpdate();
    expect(setItem).toHaveBeenCalledWith("trovalo_app_version", "v2");
  });
});
