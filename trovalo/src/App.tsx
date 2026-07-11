import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { SyncIndicator } from "./components/SyncIndicator";
import { QRCodeGenerator } from "./components/QRCodeGenerator";
import { initDb } from "./database";
import { getDeviceId, registerDeviceWithServer } from "./device";

type View = "main" | "qr-generator";

const App: React.FC = () => {
  const { t } = useTranslation();
  const [syncState, setSyncState] = useState<any>(null);
  const [dbReady, setDbReady] = useState(false);
  const [deviceId, setDeviceId] = useState<string>("");
  const [deviceAllowed, setDeviceAllowed] = useState<boolean | null>(null);
  const [statusChecked, setStatusChecked] = useState(false);
  const [view, setView] = useState<View>("main");

  useEffect(() => {
    initDb().then(({ syncState }) => {
      setSyncState(syncState);
      setDbReady(true);
    });
  }, []);

  useEffect(() => {
    const initDevice = async () => {
      // Get or create persistent device ID (handles iOS storage wipe recovery)
      const id = await getDeviceId();
      setDeviceId(id);

      // Register/re-associate device with the server
      const { allowed } = await registerDeviceWithServer();
      setDeviceAllowed(allowed);
      setStatusChecked(true);
    };
    initDevice();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <SyncIndicator syncState={syncState} />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <h1 className="text-2xl font-bold text-gray-900">Trovalo</h1>
          <p className="mt-1 text-sm text-gray-500">Garage Inventory Manager</p>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!statusChecked ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="mt-4 text-gray-500">Connecting...</p>
            </div>
          </div>
        ) : deviceAllowed === false ? (
          <div className="max-w-lg mx-auto text-center py-12">
            <div className="bg-red-50 border border-red-200 rounded-lg p-8">
              <svg
                className="mx-auto h-16 w-16 text-red-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 15v2m0 0v2m0-2h2m-2 0H10m9.364-7.364A9 9 0 1112 3a9 9 0 017.364 4.636z"
                />
              </svg>
              <h2 className="mt-4 text-xl font-semibold text-red-800">
                {t("device.not_authorized")}
              </h2>
              <p className="mt-2 text-sm text-red-600">
                {t("device.contact_admin")}
              </p>
              <div className="mt-6 bg-red-100 rounded-md p-4">
                <p className="text-xs font-mono text-red-800 break-all">
                  {deviceId}
                </p>
              </div>
              <p className="mt-3 text-xs text-red-500">
                {t("device.send_id_to_admin")}
              </p>
            </div>
          </div>
        ) : view === "qr-generator" ? (
          <div>
            <button
              onClick={() => setView("main")}
              className="mb-4 px-4 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors flex items-center gap-1"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
              {t("nav.back_to_home")}
            </button>
            <h2 className="text-xl font-semibold text-gray-900 mb-6">
              {t("qr.title")}
            </h2>
            <QRCodeGenerator />
          </div>
        ) : dbReady ? (
          <>
            {/* Main navigation cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <button className="flex items-center justify-center p-8 bg-white rounded-lg shadow-sm border-2 border-transparent hover:border-indigo-500 transition-all duration-200">
                <div className="text-center">
                  <svg
                    className="mx-auto h-12 w-12 text-indigo-500"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 4v1m6 11h2m-6 0h-2v4m0-11v8m0 0V8m0 0h2m-6 0h-2m2 0v8"
                    />
                  </svg>
                  <span className="mt-4 block text-lg font-medium text-gray-900">
                    {t("ui.scan")}
                  </span>
                </div>
              </button>

              <button className="flex items-center justify-center p-8 bg-white rounded-lg shadow-sm border-2 border-transparent hover:border-indigo-500 transition-all duration-200">
                <div className="text-center">
                  <svg
                    className="mx-auto h-12 w-12 text-indigo-500"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                  <span className="mt-4 block text-lg font-medium text-gray-900">
                    {t("ui.search")}
                  </span>
                </div>
              </button>

              {/* QR Code Generator card */}
              <button
                onClick={() => setView("qr-generator")}
                className="flex items-center justify-center p-8 bg-white rounded-lg shadow-sm border-2 border-transparent hover:border-indigo-500 transition-all duration-200 md:col-span-2"
              >
                <div className="text-center">
                  <svg
                    className="mx-auto h-12 w-12 text-indigo-500"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 4v1m6 11h2m-6 0h-2v4m0-11v8m0 0V8m0 0h2m-6 0h-2m2 0v8M4 4h4v4H4V4zm12 0h4v4h-4V4zM4 16h4v4H4v-4zm12 0h4v4h-4v-4z"
                    />
                  </svg>
                  <span className="mt-4 block text-lg font-medium text-gray-900">
                    {t("nav.generate_qr")}
                  </span>
                </div>
              </button>
            </div>

            {/* Device info footer */}
            <div className="mt-8 pt-4 border-t border-gray-200">
              <details className="group">
                <summary className="text-xs text-gray-400 cursor-pointer hover:text-gray-600 select-none">
                  {t("device.device_info")}
                </summary>
                <div className="mt-2 p-3 bg-gray-100 rounded-md space-y-1">
                  <p className="text-xs text-gray-500">
                    <span className="font-medium text-gray-700">
                      {t("device.id")}:
                    </span>{" "}
                    <code className="ml-1 font-mono text-gray-800 break-all">
                      {deviceId}
                    </code>
                  </p>
                  <p className="text-xs text-gray-500">
                    <span className="font-medium text-gray-700">
                      {t("device.status")}:
                    </span>{" "}
                    {deviceAllowed === true ? (
                      <span className="text-green-600 ml-1">
                        {t("device.authorized")}
                      </span>
                    ) : (
                      <span className="text-yellow-600 ml-1">
                        {t("device.pending")}
                      </span>
                    )}
                  </p>
                  <p className="pt-1 text-xs text-gray-400 italic">
                    {t("device.storage_hint")}
                  </p>
                </div>
              </details>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="mt-4 text-gray-500">Initializing database...</p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
