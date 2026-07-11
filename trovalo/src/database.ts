import Dexie, { type Table } from "dexie";
import { supabase, type Box } from "./supabase";

class TrovaloCache extends Dexie {
  boxes!: Table<Box, string>;

  constructor() {
    super("trovalo_cache");
    this.version(1).stores({
      boxes: "id, zone, updated_at",
    });
  }
}

const cache = new TrovaloCache();

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

async function checkConnection(): Promise<boolean> {
  try {
    const { error } = await supabase.from("boxes").select("id", { count: "exact", head: true });
    return !error;
  } catch {
    return false;
  }
}

export async function initDb() {
  notify("connecting");

  const connected = await checkConnection();

  if (connected) {
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
    notify("offline");
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
    .subscribe((status) => {
      if (status === "SUBSCRIBED") notify("synced");
      else if (status === "CLOSED") notify("offline");
      else if (status === "CHANNEL_ERROR") notify("error");
    });

  const onOnline = async () => {
    const ok = await checkConnection();
    notify(ok ? "synced" : "offline");
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
    deleteBox: async (id: string) => {
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
