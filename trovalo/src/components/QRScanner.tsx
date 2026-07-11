import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { Scanner } from "@yudiel/react-qr-scanner";

interface QRScannerProps {
  onBack: () => void;
}

export const QRScanner: React.FC<QRScannerProps> = ({ onBack }) => {
  const { t } = useTranslation();
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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
        <Scanner
          onScan={(detectedCodes) => {
            const code = detectedCodes[0]?.rawValue;
            if (code && !result) {
              setResult(code);
            }
          }}
          onError={(err) => setError(err?.message || String(err))}
          scanDelay={500}
        />
      </div>

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
