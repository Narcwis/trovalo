import React, { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Scanner } from "@yudiel/react-qr-scanner";
import { supabase, type Box } from "../supabase";

interface QRScannerProps {
  onBack: () => void;
}

type Phase = "scanning" | "loaded" | "saving" | "saved";

export const QRScanner: React.FC<QRScannerProps> = ({ onBack }) => {
  const { t } = useTranslation();
  const [phase, setPhase] = useState<Phase>("scanning");
  const [boxId, setBoxId] = useState<string>("");
  const [zone, setZone] = useState("");
  const [items, setItems] = useState<string[]>([]);
  const [itemInput, setItemInput] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!boxId) return;
    supabase
      .from("boxes")
      .select("*")
      .eq("id", boxId)
      .single()
      .then(({ data, error: err }) => {
        if (err && err.code !== "PGRST116") {
          setError(err.message);
          return;
        }
        if (data) {
          const box = data as Box;
          setZone(box.zone);
          setItems(box.items);
        } else {
          setZone("");
          setItems([]);
        }
        setPhase("loaded");
      });
  }, [boxId]);

  const handleScan = useCallback(
    (detectedCodes: { rawValue: string }[]) => {
      const code = detectedCodes[0]?.rawValue;
      if (code && phase === "scanning") {
        setBoxId(code);
      }
    },
    [phase],
  );

  const handleScanError = useCallback(
    (err: any) => setError(err?.message || String(err)),
    [],
  );

  const addItem = () => {
    const v = itemInput.trim();
    if (v && !items.includes(v)) {
      setItems([...items, v]);
      setItemInput("");
    }
  };

  const removeItem = (idx: number) =>
    setItems(items.filter((_, i) => i !== idx));

  const handleSave = async () => {
    if (!zone.trim()) return;
    setPhase("saving");
    const { error: err } = await supabase.from("boxes").upsert(
      {
        id: boxId,
        zone: zone.trim(),
        items,
        updated_at: Date.now(),
      },
      { onConflict: "id" },
    );
    if (err) {
      setError(err.message);
      setPhase("loaded");
      return;
    }
    setPhase("saved");
  };

  const reset = () => {
    setPhase("scanning");
    setBoxId("");
    setZone("");
    setItems([]);
    setItemInput("");
    setError(null);
  };

  if (phase === "scanning") {
    return (
      <div>
        <button
          onClick={onBack}
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

        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          {t("scan.title")}
        </h2>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        <div className="w-full max-w-md mx-auto bg-black rounded-lg overflow-hidden">
          <Scanner onScan={handleScan} onError={handleScanError} scanDelay={500} />
        </div>
      </div>
    );
  }

  if (phase === "saved") {
    return (
      <div>
        <button
          onClick={onBack}
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

        <div className="max-w-md mx-auto text-center">
          <div className="bg-green-50 border border-green-200 rounded-lg p-8">
            <svg
              className="mx-auto h-12 w-12 text-green-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <h3 className="mt-4 text-lg font-medium text-green-800">
              {t("scan.saved_title")}
            </h3>
            <p className="mt-1 text-sm text-green-600 break-all">{boxId}</p>
            <p className="mt-1 text-sm text-green-600">{t("scan.saved_zone")}: {zone}</p>
            <div className="mt-6 flex gap-3 justify-center">
              <button
                onClick={reset}
                className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
              >
                {t("scan.scan_another")}
              </button>
              <button
                onClick={onBack}
                className="px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
              >
                {t("nav.back_to_home")}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <button
        onClick={onBack}
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

      <h2 className="text-xl font-semibold text-gray-900 mb-2">
        {zone ? t("scan.edit_title") : t("scan.create_title")}
      </h2>
      <p className="text-sm text-gray-500 font-mono mb-6 break-all">{boxId}</p>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <div className="max-w-md mx-auto space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t("scan.zone_label")}
          </label>
          <input
            type="text"
            value={zone}
            onChange={(e) => setZone(e.target.value)}
            placeholder={t("scan.zone_placeholder")}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t("scan.items_label")}
          </label>
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              value={itemInput}
              onChange={(e) => setItemInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addItem()}
              placeholder={t("scan.item_placeholder")}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              onClick={addItem}
              disabled={!itemInput.trim()}
              className="px-3 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 disabled:opacity-50 transition-colors"
            >
              {t("scan.add_item")}
            </button>
          </div>
          {items.length > 0 && (
            <ul className="space-y-1">
              {items.map((item, i) => (
                <li
                  key={i}
                  className="flex items-center justify-between px-3 py-1.5 bg-gray-50 rounded text-sm"
                >
                  <span className="text-gray-700">{item}</span>
                  <button
                    onClick={() => removeItem(i)}
                    className="text-gray-400 hover:text-red-500 transition-colors"
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
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex gap-3">
          <button
            onClick={reset}
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
          >
            {t("scan.cancel")}
          </button>
          <button
            onClick={handleSave}
            disabled={!zone.trim() || phase === "saving"}
            className="flex-1 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {phase === "saving" ? t("scan.saving") : t("scan.save")}
          </button>
        </div>
      </div>
    </div>
  );
};
