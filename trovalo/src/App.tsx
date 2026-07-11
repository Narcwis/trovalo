import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import type { User } from "@supabase/supabase-js";
import { SyncIndicator } from "./components/SyncIndicator";
import { QRCodeGenerator } from "./components/QRCodeGenerator";
import { LoginPage } from "./components/LoginPage";
import { AdminConsole } from "./components/AdminConsole";
import { initDb, onSyncStatus, type SyncStatus } from "./database";
import { supabase } from "./supabase";

type View = "main" | "qr-generator" | "admin";

const App: React.FC = () => {
  const { t } = useTranslation();
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("connecting");
  const [dbReady, setDbReady] = useState(false);
  const [view, setView] = useState<View>("main");

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setAuthLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
      },
    );

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    const unsub = onSyncStatus(setSyncStatus);
    initDb().then(() => setDbReady(true));
    return unsub;
  }, [user]);

  const isAdmin = user?.email === import.meta.env.VITE_ADMIN_EMAIL;

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <SyncIndicator
          status={syncStatus}
          user={user}
          onNavigateAdmin={isAdmin ? () => setView("admin") : undefined}
        />
        {view !== "admin" && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <h1 className="text-2xl font-bold text-gray-900">Trovalo</h1>
            <p className="mt-1 text-sm text-gray-500">Garage Inventory Manager</p>
          </div>
        )}
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {view === "admin" ? (
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
            <AdminConsole />
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

            <div className="mt-8 pt-4 border-t border-gray-200">
              <details className="group">
                <summary className="text-xs text-gray-400 cursor-pointer hover:text-gray-600 select-none">
                  {t("auth.account_info")}
                </summary>
                <div className="mt-2 p-3 bg-gray-100 rounded-md space-y-1">
                  <p className="text-xs text-gray-500">
                    <span className="font-medium text-gray-700">
                      {t("auth.email")}:
                    </span>{" "}
                    <code className="ml-1 font-mono text-gray-800">
                      {user.email}
                    </code>
                  </p>
                  <p className="text-xs text-gray-500">
                    <span className="font-medium text-gray-700">
                      {t("auth.name")}:
                    </span>{" "}
                    <span className="ml-1 text-gray-800">
                      {user.user_metadata?.full_name || "-"}
                    </span>
                  </p>
                  <p className="text-xs text-gray-500">
                    <span className="font-medium text-gray-700">
                      {t("auth.role")}:
                    </span>{" "}
                    <span className="ml-1 text-gray-800">
                      {isAdmin ? t("auth.admin_role") : t("auth.member_role")}
                    </span>
                  </p>
                </div>
              </details>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="mt-4 text-gray-500">{t("sync.connecting")}</p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
