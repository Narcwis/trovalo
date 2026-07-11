import React from "react";
import { useTranslation } from "react-i18next";
import type { SyncStatus } from "../database";
import type { User } from "@supabase/supabase-js";
import { signOut } from "../supabase";

interface SyncIndicatorProps {
  status: SyncStatus;
  user: User | null;
  onNavigateAdmin?: () => void;
}

export const SyncIndicator: React.FC<SyncIndicatorProps> = ({
  status,
  user,
  onNavigateAdmin,
}) => {
  const { t } = useTranslation();

  const isAdmin =
    user?.email === import.meta.env.VITE_ADMIN_EMAIL;

  const configuration: Record<SyncStatus, { color: string; text: string }> = {
    connecting: { color: "bg-yellow-500", text: t("sync.connecting") },
    synced: { color: "bg-green-500", text: t("sync.ready") },
    offline: { color: "bg-yellow-500", text: t("sync.offline") },
    error: { color: "bg-red-500", text: t("sync.error") },
  };

  const { color, text } = configuration[status];

  return (
    <div className="flex items-center justify-between px-4 py-2 w-full bg-white border-b shadow-sm">
      <div className="flex items-center gap-2">
        <div className={`w-3 h-3 rounded-full animate-pulse ${color}`} />
        <span className="text-xs text-gray-600 font-medium">{text}</span>
      </div>

      {user && (
        <div className="flex items-center gap-3">
          {isAdmin && onNavigateAdmin && (
            <button
              onClick={onNavigateAdmin}
              className="text-xs text-indigo-600 hover:text-indigo-800 font-medium transition-colors"
            >
              {t("nav.admin")}
            </button>
          )}

          {user.user_metadata?.avatar_url && (
            <img
              src={user.user_metadata.avatar_url}
              alt=""
              className="w-6 h-6 rounded-full"
            />
          )}

          <span className="text-xs text-gray-500 hidden sm:inline">
            {user.email}
          </span>

          <button
            onClick={() => signOut()}
            className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
            title={t("auth.sign_out")}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
              />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
};
