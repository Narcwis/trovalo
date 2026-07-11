import express from "express";
import PouchDB from "pouchdb";
import expressPouchDB from "express-pouchdb";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Persist the database in the HAOS /data partition so it survives container restarts
const dbDir = process.env.DB_PATH || "./db";
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// Read HAOS Supervisor options (provided by the add-on config)
const optionsPath = "/data/options.json";
let options = {
  allowed_devices: [],
  allow_new_devices: true,
};

try {
  if (fs.existsSync(optionsPath)) {
    const raw = fs.readFileSync(optionsPath, "utf-8");
    options = { ...options, ...JSON.parse(raw) };
    console.log(`Trovalo config loaded: ${JSON.stringify(options)}`);
  } else {
    console.log("Trovalo: no /data/options.json found, using defaults");
  }
} catch (e) {
  console.error("Trovalo: failed to read options.json", e.message);
}

// Whitelist validation helper
function isDeviceAllowed(deviceId) {
  if (!deviceId) return false;
  if (options.allow_new_devices) return true;
  return options.allowed_devices.includes(deviceId);
}

const app = express();

// Middleware: parse JSON body
app.use(express.json());

// Middleware: device whitelist check for all /db/* (CouchDB/PouchDB sync) routes
app.use("/db", (req, res, next) => {
  const deviceId = req.headers["x-device-id"];
  if (req.method === "OPTIONS") {
    return next();
  }
  if (isDeviceAllowed(deviceId)) {
    return next();
  }
  return res.status(403).json({
    error: "device_not_whitelisted",
    message: "This device is not authorized. Contact the administrator.",
    device_id: deviceId || "unknown",
  });
});

// Endpoint for the client to check its whitelist status
app.get("/api/device/status", (req, res) => {
  const deviceId = req.headers["x-device-id"];
  const allowed = isDeviceAllowed(deviceId);
  res.json({
    device_id: deviceId || "unknown",
    allowed,
    allow_new_devices: options.allow_new_devices,
    whitelist: options.allowed_devices,
  });
});

// Endpoint for device registration + fingerprint recovery
// This allows the server to re-associate a known device even after
// iOS Safari wipes localStorage/IndexedDB, by matching the fingerprint.
app.post("/api/device/register", (req, res) => {
  const { device_id: deviceId, fingerprint } = req.body || {};

  if (!deviceId) {
    return res
      .status(400)
      .json({ error: "device_id is required", allowed: false });
  }

  const allowed = isDeviceAllowed(deviceId);
  const known = options.allowed_devices.includes(deviceId);

  res.json({
    device_id: deviceId,
    allowed,
    known,
    fingerprint_recovered: false,
  });
});

// Instantiate CouchDB routing layer over persistent disk layout
const PouchWithLevel = PouchDB.defaults({ prefix: `${dbDir}/` });
app.use("/db", expressPouchDB(PouchWithLevel));

// Serve production UI assets compiled via Vite
app.use(express.static(path.resolve(__dirname, "dist")));

// Route all fallback operations back to the SPA pipeline
app.get("*", (req, res) => {
  res.sendFile(path.resolve(__dirname, "dist/index.html"));
});

app.listen(8080, () => {
  console.log("Trovalo host pipeline running on port 8080");
});
