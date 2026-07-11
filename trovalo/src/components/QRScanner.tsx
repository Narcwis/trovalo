import React, { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Html5Qrcode } from "html5-qrcode";

interface QRScannerProps {
  onBack: () => void;
}

export const QRScanner: React.FC<QRScannerProps> = ({ onBack }) => {
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cameras, setCameras] = useState<{ id: string; label: string }[]>([]);
  const [selectedCamera, setSelectedCamera] = useState<string>("");

  useEffect(() => {
    const scanner = new Html5Qrcode("qr-scanner-container");
    scannerRef.current = scanner;

    Html5Qrcode.getCameras()
      .then((devices) => {
        if (devices.length === 0) {
          setError(t("scan.no_camera"));
          return;
        }
        const camList = devices.map((d) => ({
          id: d.id,
          label: d.label || `Camera ${devices.indexOf(d) + 1}`,
        }));
        setCameras(camList);
        setSelectedCamera(camList[0].id);
      })
      .catch(() => setError(t("scan.camera_error")));

    return () => {
      scanner.stop().catch(() => {});
    };
  }, [t]);

  useEffect(() => {
    if (!selectedCamera || !scannerRef.current) return;

    const scanner = scannerRef.current;
    scanner.stop().catch(() => {});

    scanner
      .start(
        selectedCamera,
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => {
          setResult(decodedText);
          scanner.stop().catch(() => {});
        },
        () => {},
      )
      .catch((err) => setError(String(err)));
  }, [selectedCamera]);

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

      {cameras.length > 1 && (
        <select
          value={selectedCamera}
          onChange={(e) => setSelectedCamera(e.target.value)}
          className="mb-4 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          {cameras.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>
      )}

      <div
        id="qr-scanner-container"
        ref={containerRef}
        className="w-full max-w-md mx-auto bg-black rounded-lg overflow-hidden"
      />

      {result && (
        <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-sm font-medium text-green-800">
            {t("scan.result")}
          </p>
          <p className="mt-1 text-xs font-mono text-green-700 break-all">
            {result}
          </p>
        </div>
      )}
    </div>
  );
};
