import { createRxDatabase, addRxPlugin } from "rxdb";
import { getRxStorageDexie } from "rxdb/plugins/storage-dexie";
import { replicateCouchDB } from "rxdb/plugins/replication-couchdb";
import { getDeviceHeaders } from "./device";

export const initDb = async () => {
  const db = await createRxDatabase({
    name: "trovalo_client_cache",
    storage: getRxStorageDexie(),
  });

  await db.addCollections({
    boxes: {
      schema: {
        version: 0,
        primaryKey: "id",
        type: "object",
        properties: {
          id: { type: "string", maxLength: 100 },
          zone: { type: "string" },
          items: { type: "array", items: { type: "string" } },
          updatedAt: { type: "number" },
        },
        required: ["id", "zone", "items"],
      },
    },
  });

  const deviceHeaders = await getDeviceHeaders();

  const syncState = replicateCouchDB({
    collection: db.boxes,
    url: `${window.location.origin}/db/boxes`,
    live: true,
    pull: {},
    push: {},
    fetch: (url: RequestInfo | URL, options?: RequestInit) => {
      return fetch(url, {
        ...options,
        headers: {
          ...(options?.headers as Record<string, string>),
          ...deviceHeaders,
        },
      });
    },
  });

  return { db, syncState };
};
