import React, { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import QRCode from "qrcode";
import { QRCodePrintGrid } from "./QRCodePrintGrid";

const MIN_QR_SIZE_CM = 5;
const MAX_QR_SIZE_CM = 10;
const MIN_COUNT = 1;
const MAX_COUNT = 500;

async function generateWithOverlay(
  text: string,
  boxNumber: number,
  width: number,
): Promise<string> {
  const canvas = document.createElement("canvas");
  await QRCode.toCanvas(canvas, text, {
    width,
    margin: 1,
    color: { dark: "#000000", light: "#ffffff" },
  });
  const ctx = canvas.getContext("2d")!;
  const cx = canvas.width / 2;
  const cy = canvas.height / 2;
  const r = canvas.width * 0.09;
  const fontSize = Math.round(canvas.width * 0.09);
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#000000";
  ctx.font = `bold ${fontSize}px sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(String(boxNumber), cx, cy);
  return canvas.toDataURL();
}

export const QRCodeGenerator: React.FC = () => {
  const { t } = useTranslation();
  const [count, setCount] = useState(10);
  const [startNumber, setStartNumber] = useState(1);
  const [qrSizeCm, setQrSizeCm] = useState(5);
  const [codes, setCodes] = useState<
    { id: string; boxNumber: number; dataUrl: string }[] | null
  >(null);
  const [generating, setGenerating] = useState(false);

  const handleGenerate = useCallback(async () => {
    setGenerating(true);
    setCodes(null);

    const batchId = Date.now().toString(36);
    const batchSize = 50;
    const allCodes: { id: string; boxNumber: number; dataUrl: string }[] = [];
    const width = Math.max(200, qrSizeCm * 80);

    for (let i = 0; i < count; i += batchSize) {
      const batch = Math.min(batchSize, count - i);
      const promises = Array.from({ length: batch }, async (_, j) => {
        const boxNumber = startNumber + i + j;
        const id = `qr-${batchId}-${boxNumber}`;
        try {
          const dataUrl = await generateWithOverlay(id, boxNumber, width);
          return { id, boxNumber, dataUrl };
        } catch (err) {
          console.error("Failed to generate QR code", err);
          return { id, boxNumber, dataUrl: "" };
        }
      });
      const results = await Promise.all(promises);
      allCodes.push(...results);
    }

    setCodes(allCodes);
    setGenerating(false);
  }, [count, startNumber, qrSizeCm]);

  return (
    <div>
      {!codes ? (
        <div className="max-w-lg mx-auto">
          <div className="bg-white rounded-lg shadow-sm p-6 space-y-6">
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

            <div>
              <label
                htmlFor="qr-start"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                {t("qr.start_number")}
              </label>
              <input
                id="qr-start"
                type="number"
                min={1}
                value={startNumber}
                onChange={(e) => {
                  const v = parseInt(e.target.value, 10);
                  if (!isNaN(v)) setStartNumber(Math.max(1, v));
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900"
              />
              <p className="mt-1 text-xs text-gray-500">
                {t("qr.start_number_hint")}
              </p>
            </div>

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

            <div className="p-3 bg-gray-50 rounded-md text-sm text-gray-600">
              <p>
                <strong>{t("qr.preview")}:</strong> {count}{" "}
                {t("qr.codes").toLowerCase()} &times; {qrSizeCm} cm ={" "}
                {(() => {
                  const qrSizeMm = qrSizeCm * 10;
                  const usableW = 210 - 30;
                  const usableH = 297 - 30;
                  const cellSize = qrSizeMm + 5;
                  const cols = Math.floor(usableW / cellSize);
                  const rows = Math.floor(usableH / cellSize);
                  const perPage = cols * rows;
                  const pages = Math.ceil(count / perPage);
                  return `${cols}×${rows} per page, ${pages} page${pages > 1 ? "s" : ""}`;
                })()}
              </p>
              <p className="mt-1 text-gray-400">
                {t("qr.numbering_from")} {startNumber}{" "}
                {t("qr.to")} {startNumber + count - 1}
              </p>
            </div>

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

          <div className="mb-4 p-3 bg-green-50 text-green-800 rounded-md text-sm">
            <p>
              {t("qr.generated_count")}:{" "}
              <strong>
                {codes.length} {t("qr.codes").toLowerCase()}
              </strong>{" "}
              &mdash; {t("qr.size_cm").toLowerCase()}: {qrSizeCm} cm
            </p>
          </div>

          <QRCodePrintGrid codes={codes} qrSizeCm={qrSizeCm} />
        </div>
      )}
    </div>
  );
};
