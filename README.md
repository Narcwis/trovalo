# Development Specification: Trovalo (HAOS Custom Add-on Repository)

`Trovalo` is an offline-first, local-syncing garage inventory management application built explicitly to run as a **Standalone Home Assistant OS (HAOS) Add-on Repository**. It targets an environment completely devoid of internet, Wi-Fi, or cellular connectivity (the garage). It allows multiple family members using different platforms (Android and iOS) to audit and trace physical boxes seamlessly, while ensuring the background compute remains extremely lightweight on the host environment.

## 1. Repository Configuration & Architecture

This repository is strictly structured as a **Home Assistant Custom Add-on Repository**. It must be parseable by the HAOS Supervisor so it can be added natively via the Home Assistant Add-on Store.

### Directory Structure

The repository must follow this exact layout:

```text
/
├── repository.yaml      # Root HAOS repository manifest
└── trovalo/             # The application add-on directory
    ├── config.yaml      # Add-on configuration manifest
    ├── Dockerfile       # Container build instructions
    ├── package.json     
    ├── server.js        # Backend sync and static host
    ├── vite.config.ts   # PWA build configuration
    └── src/             # React/Vite frontend source code
        ├── locales/     # i18n Translation dictionaries
        │   ├── en.json
        │   └── it.json
        ├── i18n.ts      # i18n configuration
        ├── database.ts  # RxDB schema and CouchDB sync
        └── components/

```

### A. Root Repository Manifest (`/repository.yaml`)

This file sits at the root of the Git repository to define the repository globally to Home Assistant.

```yaml
name: "Trovalo Add-on Repository"
url: "https://github.com/YOUR_GITHUB_USERNAME/trovalo-hassio-repo"
maintainer: "Local Admin"

```

### B. Add-on Configuration (`/trovalo/config.yaml`)

This file defines the specific add-on container parameters for the Supervisor.

```yaml
name: "Trovalo"
description: "Offline-first local-syncing garage inventory manager"
version: "1.0.0"
slug: "trovalo"
init: false
arch:
  - amd64
  - aarch64
ports:
  8080/tcp: 8080
map:
  - share:rw
options: {}
schema: {}

```

---

## 2. Container Build & Backend Framework

The application runs entirely within the supervised Docker environment. To avoid running heavy rendering servers, we compile the frontend into static files and serve them alongside an embedded CouchDB-compatible sync endpoint using Express.

### A. Container Definition (`/trovalo/Dockerfile`)

```dockerfile
FROM node:20-alpine

# HAOS specific persistent storage layer mapped via Supervisor
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

### B. Backend Sync Engine (`/trovalo/server.js`)

```javascript
import express from 'express';
import PouchDB from 'pouchdb';
import expressPouchDB from 'express-pouchdb';
import path from 'path';
import fs from 'fs';

// Persist the database in the HAOS /data partition so it survives container restarts
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
  console.log('Trovalo host pipeline running on port 8080');
});

```

---

## 3. Core Application Architecture (Frontend)

The frontend must be built as a Progressive Web App (PWA) using Vite + React + TypeScript.

### A. Required Dependencies

For Hermes to initialize the correct environment, ensure these dependencies are installed:
`npm install react react-dom rxdb dexie pouchdb express express-pouchdb i18next react-i18next i18next-browser-languagedetector`
`npm install -D vite @vitejs/plugin-react vite-plugin-pwa typescript`

### B. PWA Worker Pipeline (`/trovalo/vite.config.ts`)

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
        globPatterns: ['**/*.{js,css,html,ico,png,svg,json}'], // Note: json included for i18n
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
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' }
        ]
      }
    })
  ]
});

```

### C. Internationalization (i18n) Setup

To ensure translations work instantly in the garage, the dictionaries are bundled and loaded statically without requesting external CDNs.

#### `/trovalo/src/locales/en.json`

```json
{
  "sync": {
    "ready": "Synced & Ready for Garage",
    "offline": "Offline Mode Active",
    "error": "Sync Engine Connection Error"
  },
  "ui": {
    "scan": "Scan Box",
    "search": "Search Inventory"
  }
}

```

#### `/trovalo/src/locales/it.json`

```json
{
  "sync": {
    "ready": "Sincronizzato e Pronto",
    "offline": "Modalità Offline Attiva",
    "error": "Errore di Connessione"
  },
  "ui": {
    "scan": "Scansiona Scatola",
    "search": "Cerca Inventario"
  }
}

```

#### `/trovalo/src/i18n.ts`

```typescript
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import en from './locales/en.json';
import it from './locales/it.json';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      it: { translation: it }
    },
    fallbackLng: 'en',
    interpolation: { escapeValue: false }
  });

export default i18n;

```

### D. Client Engine Database & Schema (`/trovalo/src/database.ts`)

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

  const syncState = db.boxes.syncCouchDB({
    url: `${window.location.origin}/db/boxes`,
    live: true,
    pull: {},
    push: {}
  });

  return { db, syncState };
};

```

### E. The "Traffic Light" Sync Banner (`/trovalo/src/components/SyncIndicator.tsx`)

This component incorporates `useTranslation` to ensure the status updates correctly based on the family member's native language.

```tsx
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

interface SyncIndicatorProps {
  syncState: any;
}

export const SyncIndicator: React.FC<SyncIndicatorProps> = ({ syncState }) => {
  const { t } = useTranslation();
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
    green: { color: 'bg-green-500', text: t('sync.ready') },
    yellow: { color: 'bg-yellow-500', text: t('sync.offline') },
    red: { color: 'bg-red-500', text: t('sync.error') }
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

## 4. Feature Requirements & Workflows

* **Zero Garage Connectivity Constraints:** The application **must not** rely on real-time network requests to read or write data. All updates take place against the localized RxDB database.
* **QR Code & Box Identification:** The QR codes printed onto physical storage boxes must hold simple, immutable uniquely identifiable anchors (e.g., UUID strings like `box-8f73b2`). They **must not** contain item lists or text arrays, preventing labels from expiring when box contents change.
* **Interactive Scanning Workflow:** Implement an HTML5 Web Camera wrapper system using an accessible dependency like `html5-qrcode`. It must capture code matrix streams gracefully and handle iOS Safari permission flows smoothly.
* If a scanned anchor is found in the local cache, load the modification route.
* If missing, transition immediately into a creation workflow to assign it a physical location zone and define item contents.


* **Storage Topography:** Boxes must map to structured textual zones or physical shelves (e.g., `Zone A`, `Shelf 2`, `Rack B`) instead of absolute X/Y coordinate visual maps.
