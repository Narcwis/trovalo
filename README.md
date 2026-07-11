Here is a comprehensive, production-ready development specification file. You can save this as `SPECIFICATION.md` or `README.md` and drop it directly into your local Home Assistant add-on repository directory. It contains all architectural details, configuration structures, constraints, and complete code snippets necessary for an LLM agent or developer to build **Trovalo** from scratch.

---

# # Development Specification: Trovalo

`Trovalo` is an offline-first, local-syncing garage inventory management application built explicitly to run as a **Home Assistant OS (HAOS) Local Add-on**. It targets an environment completely devoid of internet, Wi-Fi, or cellular connectivity (the garage), allowing multiple family members using different platforms (Android and iOS) to audit and trace physical boxes seamlessly.

---

## ## 1. Critical System Constraints & Design Principles

* **Zero Garage Connectivity:** The application **must not** rely on real-time network requests to read or write data. All updates take place against a localized device database.
* **Local-First Sync (CouchDB Protocol):** Data replication must be fully automatic. When devices return to the home Wi-Fi range, the client engine must silently reconcile states with the HAOS backend container without requiring custom merge or API routing code.
* **Minimal Server Resource Footprint:** The backend container should run on a low-powered mini PC. Avoid heavy servers or persistent Node runtimes executing server-side rendering (SSR). The frontend must be served as pure static files via a lightweight asset pipeline.
* **Cross-Platform PWA Delivery:** To eliminate Apple Developer certificate pricing and weekly sideloading maintenance on iOS, the application will deploy strictly as a Progressive Web App (PWA) installable via mobile browsers.

---

## ## 2. Feature Requirements

### ### A. The "Traffic Light" Sync Banner

A highly visible bar must remain pinned to the top of the viewport to manage behavioral synchronization constraints for non-technical users:

* 🟢 **Green (Synced & Ready):** Active network connection to the HAOS host detected; local database completely matches the server state. **Safe to leave the house.**
* 🟡 **Yellow (Offline / Unsynced Changes):** Device is out of range (in the garage) or local writes haven't reached the server yet. Data remains safely isolated in local storage. **Do not force-quit the browser session.**
* 🔴 **Red (Connection Error):** The server is unreachable despite active network states, or a synchronization conflict occurred.

### ### B. QR Code & Box Identification Logic

* **Abstraction Layer:** The QR codes printed onto physical storage boxes must hold simple, immutable uniquely identifiable anchors (e.g., UUID strings like `box-8f73b2`). They **must not** contain item lists or text arrays, preventing labels from expiring when box contents change.
* **Interactive Scanning Workflow:** Utilizing the device's native camera, scanning an anchor queries the local database:
* If found, load the modification route for that container.
* If missing, transition immediately into a creation workflow to assign it a physical location zone and define structural items.



### ### C. Storage Topography & Schema

Instead of overly complex absolute visual maps, boxes map to structured textual zones or physical shelves (e.g., `Zone A`, `Shelf 2`, `Rack B`). This ensures rapid, accessible data rendering for parents.

---

## ## 3. Technical Stack Configuration

* **Frontend Ecosystem:** Vite + React + TypeScript
* **PWA Worker Pipeline:** `vite-plugin-pwa`
* **Client Engine DB:** RxDB paired with a Dexie (IndexedDB) browser-local backend.
* **Container Core / Sync Target:** Node Express API executing an embedded, file-persisted `express-pouchdb` interface mapping to the HAOS `/data` layer.

---

## ## 4. Structural Implementation Blueprint

### ### A. Home Assistant Add-on Manifests

Place these configuration sheets inside the root of your local repository directory structure:

#### #### `config.yaml`

```yaml
name: "Trovalo"
description: "Offline-first local-syncing garage inventory manager"
version: "1.0.0"
slug: "trovalo"
init: false
arch:
  - amd64
ports:
  8080/tcp: 8080
map:
  - share:rw
options: {}
schema: {}

```

#### #### `Dockerfile`

```dockerfile
FROM node:20-alpine

# HAOS specific persistent storage layer
ENV DB_PATH=/data/trovalo_db
WORKDIR /app

# Install dependency configurations
COPY package*.json ./
RUN npm install

# Copy source repository structure and run static build compilation
COPY . .
RUN npm run build

EXPOSE 8080
CMD ["node", "server.js"]

```

---

### ### B. Server Backend Framework

#### #### `server.js`

```javascript
import express from 'express';
import PouchDB from 'pouchdb';
import expressPouchDB from 'express-pouchdb';
import path from 'path';
import fs from 'fs';

const dbDir = process.env.DB_PATH || './db';
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const app = express();

// Instantiate CouchDB routing layer over persistent disk layout
const PouchWithLevel = PouchDB.defaults({ prefix: `${dbDir}/` });
app.use('/db', expressPouchDB(PouchWithLevel));

// Serve production UI assets compiled via Vite
app.use(express.static('dist'));

// Route all fallback operations back to the SPA pipeline
app.get('*', (req, res) => {
  res.sendFile(path.resolve('dist/index.html'));
});

app.listen(8080, () => {
  console.log('Trovalo host pipeline running smoothly on port 8080');
});

```

---

### ### C. Core Application Architecture

#### #### `vite.config.ts`

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        cleanupOutdatedCaches: true,
      },
      manifest: {
        name: 'Trovalo',
        short_name: 'Trovalo',
        description: 'Garage Inventory Manager',
        theme_color: '#4F46E5',
        background_color: '#ffffff',
        display: 'standalone',
        icons: [
          {
            src: 'icon-192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'icon-512.png',
            sizes: '512x512',
            type: 'image/png',
          }
        ]
      }
    })
  ]
});

```

#### #### `src/database.ts`

```typescript
import { createRxDatabase, addRxPlugin } from 'rxdb';
import { getRxStorageDexie } from 'rxdb/plugins/storage-dexie';
import { RxDBReplicationCouchDBPlugin } from 'rxdb/plugins/replication-couchdb';

addRxPlugin(RxDBReplicationCouchDBPlugin);

export const initDb = async () => {
  const db = await createRxDatabase({
    name: 'trovalo_client_cache',
    storage: getRxStorageDexie()
  });

  await db.addCollections({
    boxes: {
      schema: {
        version: 0,
        primaryKey: 'id',
        type: 'object',
        properties: {
          id: { type: 'string', maxLength: 100 },
          zone: { type: 'string' },
          items: { type: 'array', items: { type: 'string' } },
          updatedAt: { type: 'number' }
        },
        required: ['id', 'zone', 'items']
      }
    }
  });

  // Replicate automatically using the absolute path relative to the active origin
  const syncState = db.boxes.syncCouchDB({
    url: `${window.location.origin}/db/boxes`,
    live: true,
    pull: {},
    push: {}
  });

  return { db, syncState };
};

```

#### #### `src/components/SyncIndicator.tsx`

```tsx
import React, { useEffect, useState } from 'react';

interface SyncIndicatorProps {
  syncState: any;
}

export const SyncIndicator: React.FC<SyncIndicatorProps> = ({ syncState }) => {
  const [status, setStatus] = useState<'green' | 'yellow' | 'red'>('yellow');

  useEffect(() => {
    if (!syncState) return;

    const subActive = syncState.active$.subscribe((active: boolean) => {
      if (active && navigator.onLine) setStatus('green');
    });

    const subError = syncState.error$.subscribe((err: any) => {
      if (err) setStatus('red');
    });

    const handleOffline = () => setStatus('yellow');
    const handleOnline = () => setStatus('green');

    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);

    setStatus(navigator.onLine ? 'green' : 'yellow');

    return () => {
      subActive.unsubscribe();
      subError.unsubscribe();
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, [syncState]);

  const configuration = {
    green: { color: 'bg-green-500', text: 'Synced & Ready for Garage' },
    yellow: { color: 'bg-yellow-500', text: 'Offline Mode Active' },
    red: { color: 'bg-red-500', text: 'Sync Engine Connection Error' }
  };

  return (
    <div className="flex items-center justify-center p-4 w-full bg-white border-b shadow-sm">
      <div className={`w-4 h-4 rounded-full animate-pulse ${configuration[status].color}`} />
      <span className="ml-3 font-medium text-gray-700 tracking-wide text-sm md:text-base">
        {configuration[status].text}
      </span>
    </div>
  );
};

```

---

## ## 5. Steps for Hermes to Execute

1. Initialize a standard Vite workspace targeting `react-ts` templates inside the source layout.
2. Install underlying synchronization payloads: `npm install rxdb dexie pouchdb express express-pouchdb` alongside dev dependencies for PWA tracking (`vite-plugin-pwa`).
3. Inject the layout files structured above to isolate data in the local HAOS persistent container partition (`/data/trovalo_db`).
4. Implement a highly responsive HTML5 Web Camera wrapper system using an accessible, lightweight dependency like `html5-qrcode` to capture code matrix streams without relying on underlying hardware engines. Ensure it gracefully prompts for access, accommodating common iOS permission flows.
5. Validate compilation mechanics by packaging the add-on structure natively inside your Home Assistant ecosystem. Refresh local store definitions to verify structural integrity.
