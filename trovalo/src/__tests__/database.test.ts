import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../supabase", () => {
  const mocks: Record<string, any> = {};
  const chain = (methods: string[]) => {
    const obj: any = {};
    for (const key of methods) {
      if (key === "then") {
        obj[key] = vi.fn((resolve: any) => resolve({ data: [], error: null }));
      } else {
        obj[key] = vi.fn(() => obj);
      }
    }
    return obj;
  };
  const builder = chain(["select", "insert", "upsert", "update", "delete", "eq", "order", "single", "then"]);
  mocks.from = vi.fn(() => builder);
  mocks.channel = vi.fn(() => ({
    on: vi.fn(() => ({
      subscribe: vi.fn((cb?: any) => { if (cb) cb("SUBSCRIBED"); }),
    })),
  }));
  return { supabase: mocks };
});

import { initDb } from "../database";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("initDb", () => {
  it("returns api object", async () => {
    const api = await initDb();
    expect(api).toHaveProperty("cache");
    expect(api).toHaveProperty("channel");
    expect(api).toHaveProperty("upsertBox");
    expect(api).toHaveProperty("softDeleteBox");
    expect(api).toHaveProperty("restoreBox");
    expect(api).toHaveProperty("hardDeleteBox");
    expect(api).toHaveProperty("getCachedBoxes");
    expect(api).toHaveProperty("cleanup");
  });

  it("fetches boxes on init", async () => {
    await initDb();
    const { supabase } = await import("../supabase");
    expect(supabase.from).toHaveBeenCalledWith("boxes");
  });

  it("subscribes to realtime changes", async () => {
    await initDb();
    const { supabase } = await import("../supabase");
    expect(supabase.channel).toHaveBeenCalledWith("boxes_changes");
  });
});
