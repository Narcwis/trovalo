import Dexie, { type Table } from "dexie";
import { supabase, type Box } from "./supabase";

class TrovaloCache extends Dexie {
  boxes!: Table<Box, string>;

  constructor() {
    super("trovalo_cache");
    this.version(3).stores({
      boxes: "id, side, level, updated_at, deleted_at",
    });
  }
}

export const cache = new TrovaloCache();

export type SyncStatus = "connecting" | "synced" | "offline" | "error";

const listeners = new Set<(status: SyncStatus) => void>();
let currentStatus: SyncStatus = "connecting";

function notify(status: SyncStatus) {
  currentStatus = status;
  for (const fn of listeners) {
    fn(status);
  }
}

export function onSyncStatus(fn: (status: SyncStatus) => void) {
  listeners.add(fn);
  fn(currentStatus);
  return () => listeners.delete(fn);
}

async function checkConnection(): Promise<"online" | "offline" | "error"> {
  if (!navigator.onLine) return "offline";
  try {
    const { error } = await supabase.from("boxes").select("id", {
      count: "exact",
      head: true,
    });
    return error ? "error" : "online";
  } catch {
    return navigator.onLine ? "error" : "offline";
  }
}

export async function initDb() {
  notify("connecting");

  const status = await checkConnection();

  if (status === "online") {
    const { data, error } = await supabase.from("boxes").select("*");
    if (!error && data) {
      const boxes = data as Box[];
      if (boxes.length > 0) {
        await cache.boxes.clear();
        await cache.boxes.bulkPut(boxes);
      }
    }
    notify("synced");
  } else {
    notify(status);
  }

  const channel = supabase
    .channel("boxes_changes")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "boxes" },
      async (payload) => {
        if (payload.eventType === "DELETE") {
          await cache.boxes.delete(payload.old.id);
        } else {
          await cache.boxes.put(payload.new as Box);
        }
      },
    )
    .subscribe((subStatus) => {
      if (subStatus === "SUBSCRIBED") notify("synced");
      else if (subStatus === "CLOSED") notify("offline");
      else if (subStatus === "CHANNEL_ERROR") notify("error");
    });

  const onOnline = async () => {
    notify("connecting");
    const s = await checkConnection();
    notify(s === "online" ? "synced" : s);
  };
  const onOffline = () => notify("offline");

  window.addEventListener("online", onOnline);
  window.addEventListener("offline", onOffline);

  return {
    cache,
    channel,
    getBoxes: async (): Promise<Box[]> => {
      const { data, error } = await supabase.from("boxes").select("*");
      if (error) throw error;
      return data as Box[];
    },
    upsertBox: async (box: Box) => {
      const { error } = await supabase.from("boxes").upsert(box, {
        onConflict: "id",
      });
      if (error) throw error;
      await cache.boxes.put(box);
    },
    softDeleteBox: async (id: string) => {
      const now = new Date().toISOString();
      const { error } = await supabase
        .from("boxes")
        .update({ deleted_at: now })
        .eq("id", id);
      if (error) throw error;
      await cache.boxes.update(id, { deleted_at: now });
    },
    restoreBox: async (id: string) => {
      const { error } = await supabase
        .from("boxes")
        .update({ deleted_at: null })
        .eq("id", id);
      if (error) throw error;
      await cache.boxes.update(id, { deleted_at: null });
    },
    hardDeleteBox: async (id: string) => {
      const { error } = await supabase.from("boxes").delete().eq("id", id);
      if (error) throw error;
      await cache.boxes.delete(id);
    },
    getCachedBoxes: () => cache.boxes.toArray(),
    cleanup: () => {
      channel.unsubscribe();
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    },
  };
}
