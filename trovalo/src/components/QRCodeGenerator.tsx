import React, { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import QRCode from "qrcode";
import { QRCodePrintGrid } from "./QRCodePrintGrid";

const MIN_QR_SIZE_CM = 5;
const MAX_QR_SIZE_CM = 10;
const MIN_COUNT = 1;
const MAX_COUNT = 500;

export const QRCodeGenerator: React.FC = () => {
  const { t } = useTranslation();
  const [count, setCount] = useState(10);
  const [qrSizeCm, setQrSizeCm] = useState(5);
  const [codes, setCodes] = useState<{ id: string; dataUrl: string }[] | null>(
    null,
  );
  const [generating, setGenerating] = useState(false);

  const handleGenerate = useCallback(async () => {
    setGenerating(true);
    setCodes(null);

    // Generate QR codes in batches to avoid blocking the UI
    const batchSize = 50;
    const allCodes: { id: string; dataUrl: string }[] = [];

    for (let i = 0; i < count; i += batchSize) {
      const batch = Math.min(batchSize, count - i);
      const promises = Array.from({ length: batch }, async (_, j) => {
        const idx = i + j;
        const id = `box-${idx + 1}`;
        // Use a UUID-style anchor as specified in the README:
        // "QR codes printed onto physical storage boxes must hold simple,
        //  immutable uniquely identifiable anchors (e.g., UUID strings like box-8f73b2)"
        const anchor = `box-${Date.now().toString(36)}-${idx}`;
        try {
          const dataUrl = await QRCode.toDataURL(anchor, {
            width: Math.max(200, qrSizeCm * 80),
            margin: 1,
            color: {
              dark: "#000000",
              light: "#ffffff",
            },
          });
          return { id: anchor, dataUrl };
        } catch (err) {
          console.error("Failed to generate QR code", err);
          return { id: anchor, dataUrl: "" };
        }
      });
      const results = await Promise.all(promises);
      allCodes.push(...results);
    }

    setCodes(allCodes);
    setGenerating(false);
  }, [count, qrSizeCm]);

  return (
    <div>
      {!codes ? (
        <div className="max-w-lg mx-auto">
          <div className="bg-white rounded-lg shadow-sm p-6 space-y-6">
            {/* QR Code count input */}
            <div>
              <label
                htmlFor="qr-count"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                {t("qr.number_of_codes")}
              </label>
              <input
                id="qr-count"
                type="number"
                min={MIN_COUNT}
                max={MAX_COUNT}
                value={count}
                onChange={(e) => {
                  const v = parseInt(e.target.value, 10);
                  if (!isNaN(v))
                    setCount(Math.min(MAX_COUNT, Math.max(MIN_COUNT, v)));
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900"
              />
              <p className="mt-1 text-xs text-gray-500">
                {MIN_COUNT}–{MAX_COUNT}
              </p>
            </div>

            {/* QR size input (cm) */}
            <div>
              <label
                htmlFor="qr-size"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                {t("qr.size_cm")}
              </label>
              <div className="flex items-center gap-3">
                <input
                  id="qr-size"
                  type="range"
                  min={MIN_QR_SIZE_CM}
                  max={MAX_QR_SIZE_CM}
                  step={0.5}
                  value={qrSizeCm}
                  onChange={(e) => setQrSizeCm(parseFloat(e.target.value))}
                  className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                />
                <span className="text-sm font-medium text-gray-900 w-12 text-right">
                  {qrSizeCm} cm
                </span>
              </div>
              <p className="mt-1 text-xs text-gray-500">
                {t("qr.min_size")}: {MIN_QR_SIZE_CM} cm
              </p>
            </div>

            {/* Preview of layout */}
            <div className="p-3 bg-gray-50 rounded-md text-sm text-gray-600">
              <p>
                <strong>{t("qr.preview")}:</strong> {count}{" "}
                {t("qr.codes").toLowerCase()} &times; {qrSizeCm} cm ={" "}
                {(() => {
                  const qrSizeMm = qrSizeCm * 10;
                  const usableW = 210 - 30; // A4 - margins
                  const usableH = 297 - 30;
                  const cellSize = qrSizeMm + 5;
                  const cols = Math.floor(usableW / cellSize);
                  const rows = Math.floor(usableH / cellSize);
                  const perPage = cols * rows;
                  const pages = Math.ceil(count / perPage);
                  return `${cols}×${rows} per page, ${pages} page${pages > 1 ? "s" : ""}`;
                })()}
              </p>
            </div>

            {/* Generate button */}
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="w-full px-4 py-3 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 disabled:bg-indigo-400 disabled:cursor-not-allowed transition-colors shadow-sm flex items-center justify-center gap-2"
            >
              {generating ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  {t("qr.generating")}
                </>
              ) : (
                t("qr.generate")
              )}
            </button>
          </div>
        </div>
      ) : (
        <div>
          {/* Back button */}
          <button
            onClick={() => setCodes(null)}
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
            {t("qr.back")}
          </button>

          {/* Info summary */}
          <div className="mb-4 p-3 bg-green-50 text-green-800 rounded-md text-sm">
            <p>
              {t("qr.generated_count")}:{" "}
              <strong>
                {codes.length} {t("qr.codes").toLowerCase()}
              </strong>{" "}
              &mdash; {t("qr.size_cm").toLowerCase()}: {qrSizeCm} cm
            </p>
          </div>

          {/* Print grid */}
          <QRCodePrintGrid codes={codes} qrSizeCm={qrSizeCm} />
        </div>
      )}
    </div>
  );
};
