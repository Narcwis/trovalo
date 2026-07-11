# Trovalo — Garage Inventory Manager

[![Deploy to GitHub Pages](https://github.com/Narcwis/trovalo/actions/workflows/deploy.yml/badge.svg)](https://github.com/Narcwis/trovalo/actions/workflows/deploy.yml)

**Trovalo** is an offline-first garage inventory management PWA. It stores data in **Supabase** (PostgreSQL) and caches locally via **Dexie/IndexedDB**. The frontend is deployed to **GitHub Pages** as a static site.

---

## Features

- **Offline-first** — All reads hit a local IndexedDB cache. Writes sync to Supabase when online.
- **Realtime sync** — Supabase Realtime broadcasts changes to all connected clients.
- **QR Code Generator** — Generate and print A4 sheets of QR codes for physical box labels. Configurable count (1–500) and size (5–10 cm).
- **i18n** — English and Italian translations built in. Auto-detects browser language.
- **PWA** — Installable as a standalone app on iOS and Android. Service worker with Workbox caching.
- **Traffic-light sync indicator** — Green (synced), Yellow (offline/connecting), Red (error) with localized status.

---

## Repository Structure

```
/
├── .github/workflows/deploy.yml    # GitHub Actions → GitHub Pages
└── trovalo/
    ├── package.json
    ├── vite.config.ts               # Vite + PWA build, base: /trovalo/
    ├── src/
    │   ├── main.tsx                 # React entry point
    │   ├── App.tsx                  # Main app with view routing
    │   ├── supabase.ts              # Supabase client + types
    │   ├── database.ts              # Dexie cache + Supabase sync layer
    │   ├── device.ts                # Device identity (UUID + fingerprint)
    │   ├── i18n.ts                  # i18next configuration
    │   ├── index.css                # Tailwind + print styles
    │   ├── vite-env.d.ts
    │   ├── components/
    │   │   ├── SyncIndicator.tsx    # Traffic-light sync banner
    │   │   ├── QRCodeGenerator.tsx  # QR code config form
    │   │   └── QRCodePrintGrid.tsx  # A4 print layout engine
    │   └── locales/
    │       ├── en.json
    │       └── it.json
    ├── supabase/migrations/
    │   └── 00001_create_boxes.sql   # Database schema
    └── public/
        ├── icon-192.svg
        └── icon-512.svg
```

---

## Setup

### 1. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) and create a free project.
2. Open the **SQL Editor** and run the migration in `trovalo/supabase/migrations/00001_create_boxes.sql`:

```sql
CREATE TABLE IF NOT EXISTS boxes (
  id TEXT PRIMARY KEY,
  zone TEXT NOT NULL,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_at BIGINT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE boxes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations for anon key" ON boxes
  FOR ALL TO anon USING (true) WITH CHECK (true);

ALTER PUBLICATION supabase_realtime ADD TABLE boxes;
```

3. Go to **Project Settings → API** and copy the **Project URL** and **anon public key**.

### 2. Configure environment

```bash
cd trovalo
cp .env.example .env
```

Edit `.env` with your Supabase credentials:

```
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

### 3. Development

```bash
npm install
npm run dev       # Vite dev server at http://localhost:5173/trovalo/
npm run build     # Production build to dist/
npm run preview   # Preview the production build
```

### 4. Deploy to GitHub Pages

1. Push the repo to GitHub (e.g., `github.com/Narcwis/trovalo`).
2. In your repo **Settings → Pages**, set **Source** to **GitHub Actions**.
3. Add repository secrets:
   - `VITE_SUPABASE_URL` — your Supabase project URL
   - `VITE_SUPABASE_ANON_KEY` — your Supabase anon key
4. Push to `main` — the workflow at `.github/workflows/deploy.yml` builds and deploys automatically.

The site will be live at `https://narcwis.github.io/trovalo/`.

---

## Usage

### Home screen

- **Scan Box** — Scan a QR code on a physical box (uses `html5-qrcode` camera scanner)
- **Search Inventory** — Search boxes by zone or contents
- **Generate QR Codes** — Create printable A4 sheets of box labels

### QR Code Generator

1. Set the number of codes (1–500)
2. Adjust the size with the slider (5–10 cm)
3. See the live A4 layout preview (e.g., "3×4 per page, 3 pages")
4. Click **Generate QR Codes**
5. Click **Print QR Codes** — prints A4 pages with proper margins and page breaks

---

## Tech Stack

| Layer    | Technology                        |
| -------- | --------------------------------- |
| Hosting  | GitHub Pages (static site)        |
| Database | Supabase (PostgreSQL + Realtime)  |
| Frontend | React 18, TypeScript, Vite        |
| Cache    | Dexie (IndexedDB)                 |
| Styling  | Tailwind CSS                      |
| PWA      | vite-plugin-pwa, Workbox          |
| i18n     | i18next, react-i18next            |
| QR       | qrcode library                    |
| Scanner  | html5-qrcode                      |
