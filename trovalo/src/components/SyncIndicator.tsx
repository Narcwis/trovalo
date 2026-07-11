import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

interface SyncIndicatorProps {
  syncState: any;
}

export const SyncIndicator: React.FC<SyncIndicatorProps> = ({ syncState }) => {
  const { t } = useTranslation();
  const [status, setStatus] = useState<"green" | "yellow" | "red">("yellow");

  useEffect(() => {
    if (!syncState) return;

    const subActive = syncState.active$.subscribe((active: boolean) => {
      if (active && navigator.onLine) setStatus("green");
    });

    const subError = syncState.error$.subscribe((err: any) => {
      if (err) setStatus("red");
    });

    const handleOffline = () => setStatus("yellow");
    const handleOnline = () => setStatus("green");

    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);

    setStatus(navigator.onLine ? "green" : "yellow");

    return () => {
      subActive.unsubscribe();
      subError.unsubscribe();
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
    };
  }, [syncState]);

  const configuration = {
    green: { color: "bg-green-500", text: t("sync.ready") },
    yellow: { color: "bg-yellow-500", text: t("sync.offline") },
    red: { color: "bg-red-500", text: t("sync.error") },
  };

  return (
    <div className="flex items-center justify-center p-4 w-full bg-white border-b shadow-sm">
      <div
        className={`w-4 h-4 rounded-full animate-pulse ${configuration[status].color}`}
      />
      <span className="ml-3 font-medium text-gray-700 tracking-wide text-sm md:text-base">
        {configuration[status].text}
      </span>
    </div>
  );
};
