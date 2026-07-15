import Dexie, { type Table } from "dexie";
import { supabase, type Box } from "./supabase";

export type SyncOpType = "upsert" | "softDelete" | "hardDelete" | "restore";

export interface SyncOp {
  id: string;
  type: SyncOpType;
  boxId: string;
  data?: Box;
  created_at: number;
  retries: number;
}

class SyncQueueDB extends Dexie {
  queue!: Table<SyncOp, string>;

  constructor() {
    super("trovalo_sync_queue");
    this.version(1).stores({
      queue: "id, boxId, type, created_at",
    });
  }
}

const db = new SyncQueueDB();
const listeners = new Set<(count: number) => void>();

export function onPendingCount(fn: (count: number) => void) {
  listeners.add(fn);
  db.queue.count().then(fn);
  return () => listeners.delete(fn);
}

function notifyCount() {
  db.queue.count().then((c) => {
    for (const fn of listeners) fn(c);
  });
}

function opId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export async function enqueue(
  type: SyncOpType,
  boxId: string,
  data?: Box,
): Promise<void> {
  await db.queue.put({ id: opId(), type, boxId, data, created_at: Date.now(), retries: 0 });
  notifyCount();
}

export async function processQueue(): Promise<void> {
  const items = await db.queue.orderBy("created_at").toArray();
  if (items.length === 0) return;

  for (const item of items) {
    try {
      switch (item.type) {
        case "upsert": {
          if (!item.data) break;
          const { error } = await supabase
            .from("boxes")
            .upsert(item.data, { onConflict: "id" });
          if (error) throw error;
          break;
        }
        case "softDelete": {
          const { error } = await supabase
            .from("boxes")
            .update({ deleted_at: new Date().toISOString() })
            .eq("id", item.boxId);
          if (error) throw error;
          break;
        }
        case "hardDelete": {
          const { error } = await supabase
            .from("boxes")
            .delete()
            .eq("id", item.boxId);
          if (error) throw error;
          break;
        }
        case "restore": {
          const { error } = await supabase
            .from("boxes")
            .update({ deleted_at: null })
            .eq("id", item.boxId);
          if (error) throw error;
          break;
        }
      }
      await db.queue.delete(item.id);
    } catch {
      // Increment retry count, give up after 10 tries
      if (item.retries >= 10) {
        await db.queue.delete(item.id);
        console.warn("Sync queue: giving up on", item.boxId, "after 10 retries");
      } else {
        await db.queue.update(item.id, { retries: item.retries + 1 });
      }
    }
  }

  notifyCount();
}

export async function pendingCount(): Promise<number> {
  return db.queue.count();
}
