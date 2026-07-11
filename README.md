# Trovalo — HAOS Custom Add-on: Garage Inventory Manager

[![HAOS Add-on](https://img.shields.io/badge/HAOS-Add--on-blue)](https://www.home-assistant.io/addons/)

**Trovalo** is an offline-first, local-syncing garage inventory management application that runs as a **Home Assistant OS (HAOS) Custom Add-on**. It is designed for environments with no internet, Wi-Fi, or cellular connectivity (the garage). Multiple family members on Android and iOS can audit and trace physical storage boxes seamlessly, with lightweight background compute on the host.

---

## Features

- **Offline-first** — All reads/writes hit the local RxDB (IndexedDB) database. No real-time network dependency.
- **Multi-device sync** — CouchDB-compatible sync via PouchDB + Express. Changes propagate when devices are on the same LAN.
- **Device whitelist** — Lock down access to authorized devices via HAOS Supervisor configuration.
- **QR Code Generator** — Generate and print A4 sheets of QR codes for physical box labels. Configurable count (1–500) and size (5–10 cm).
- **i18n** — English and Italian translations built in. Auto-detects browser language.
- **PWA** — Installable as a standalone app on iOS and Android. Service worker with Workbox caching.
- **Traffic-light sync indicator** — Green (synced), Yellow (offline), Red (error) with localized status text.

---

## Repository Structure

```
/
├── .gitignore
├── repository.yaml              # HAOS repository manifest
└── trovalo/                     # The add-on directory
    ├── config.yaml              # Add-on config + device whitelist schema
    ├── Dockerfile               # Node 20-alpine container
    ├── package.json
    ├── server.js                # Express + PouchDB backend
    ├── vite.config.ts           # Vite + PWA build config
    ├── tsconfig.json
    ├── tailwind.config.js
    ├── postcss.config.js
    ├── index.html
    ├── public/
    │   ├── icon-192.svg
    │   └── icon-512.svg
    └── src/
        ├── main.tsx             # React entry point
        ├── App.tsx              # Main app with view routing
        ├── index.css            # Tailwind + print styles
        ├── i18n.ts              # i18next configuration
        ├── database.ts          # RxDB + CouchDB replication
        ├── device.ts            # Device identity (UUID + fingerprint)
        ├── vite-env.d.ts
        ├── locales/
        │   ├── en.json
        │   └── it.json
        └── components/
            ├── SyncIndicator.tsx       # Traffic-light sync banner
            ├── QRCodeGenerator.tsx     # QR code config form
            └── QRCodePrintGrid.tsx     # A4 print layout engine
```

---

## Installation

### 1. Add the repository to HAOS

1. Go to **Settings → Add-ons → Add-on Store**
2. Click the **⋮** menu → **Repositories**
3. Add this repository URL:
   ```
   https://github.com/YOUR_GITHUB_USERNAME/trovalo
   ```
4. The **Trovalo** add-on will appear in the store

### 2. Install and configure

1. Click **Install** (this builds the Docker container)
2. Go to the **Configuration** tab
3. Set the device whitelist:
   - `allow_new_devices`: `true` (first-time setup) or `false` (locked down)
   - `allowed_devices`: `["device-uuid-here"]` — paste device IDs from the app footer
4. Start the add-on
5. Open **Web UI** (port 8080)

---

## Usage

### Home screen

- **Scan Box** — Scan a QR code on a physical box (uses `html5-qrcode` camera scanner)
- **Search Inventory** — Search boxes by zone or contents
- **Generate QR Codes** — Create printable A4 sheets of box labels

### QR Code Generator

1. Set the number of codes (1–500)
2. Adjust the size with the slider (5–10 cm, minimum 5 cm)
3. See the live A4 layout preview (e.g., "3×4 per page, 3 pages")
4. Click **Generate QR Codes**
5. Click **🖨️ Print QR Codes** — prints A4 pages with proper margins and page breaks

### Device whitelist

1. Open the app on any device
2. Scroll to the footer and expand **Device Information**
3. Copy the **Device ID** (UUID)
4. In HAOS Supervisor → Trovalo Configuration, add the ID to `allowed_devices`
5. Set `allow_new_devices: false` to lock down access

### iOS storage wipe protection

The device ID is stored redundantly in both **localStorage** and **IndexedDB**. If iOS Safari wipes one, the other restores it. A browser fingerprint (UA + language + timezone + screen) serves as a probabilistic fallback. The device also registers with the server on each load.

---

## Architecture

### Backend (`server.js`)

- **Express** serves the compiled SPA and exposes a CouchDB-compatible sync endpoint at `/db/`
- **PouchDB** with LevelDB backend persists data in `/data/trovalo_db` (survives container restarts)
- **Device whitelist middleware** checks `x-device-id` header on all `/db/*` requests
- **`/api/device/status`** — returns whitelist status for the requesting device
- **`/api/device/register`** — registers device ID + fingerprint for recovery

### Frontend

- **React 18 + TypeScript** with Vite build
- **RxDB** (IndexedDB via Dexie) for offline-first local storage
- **CouchDB replication** syncs data between devices on the same LAN
- **i18next** with browser language detection (en/it)
- **Tailwind CSS** for styling
- **PWA** with auto-updating service worker and Workbox caching

### Container

- `node:20-alpine` base image
- Multi-stage: install deps → build frontend → serve with Express
- HAOS Supervisor maps `/data` for persistent storage and `/config` for options

---

## Development

```bash
cd trovalo
npm install
npm run dev      # Vite dev server (frontend only)
npm run build    # Production build
node server.js   # Full stack (serves dist/ on port 8080)
```

---

## Configuration (HAOS Supervisor)

| Option              | Type       | Default | Description                      |
| ------------------- | ---------- | ------- | -------------------------------- |
| `allowed_devices`   | `string[]` | `[]`    | List of authorized device UUIDs  |
| `allow_new_devices` | `boolean`  | `true`  | Allow unknown devices to connect |

---

## Tech Stack

| Layer    | Technology                                   |
| -------- | -------------------------------------------- |
| Runtime  | Node.js 20 (Alpine)                          |
| Backend  | Express, PouchDB, express-pouchdb            |
| Frontend | React 18, TypeScript, Vite                   |
| Database | RxDB (IndexedDB/Dexie) + CouchDB replication |
| Styling  | Tailwind CSS                                 |
| PWA      | vite-plugin-pwa, Workbox                     |
| i18n     | i18next, react-i18next                       |
| QR       | qrcode library                               |
| Scanner  | html5-qrcode                                 |
