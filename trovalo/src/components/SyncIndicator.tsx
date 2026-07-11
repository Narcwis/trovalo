import React from "react";
import { useTranslation } from "react-i18next";
import type { SyncStatus } from "../database";

interface SyncIndicatorProps {
  status: SyncStatus;
}

export const SyncIndicator: React.FC<SyncIndicatorProps> = ({ status }) => {
  const { t } = useTranslation();

  const configuration: Record<SyncStatus, { color: string; text: string }> = {
    connecting: { color: "bg-yellow-500", text: t("sync.connecting") },
    synced: { color: "bg-green-500", text: t("sync.ready") },
    offline: { color: "bg-yellow-500", text: t("sync.offline") },
    error: { color: "bg-red-500", text: t("sync.error") },
  };

  const { color, text } = configuration[status];

  return (
    <div className="flex items-center justify-center p-4 w-full bg-white border-b shadow-sm">
      <div className={`w-4 h-4 rounded-full animate-pulse ${color}`} />
      <span className="ml-3 font-medium text-gray-700 tracking-wide text-sm md:text-base">
        {text}
      </span>
    </div>
  );
};
