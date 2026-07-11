import React, { useEffect, useRef } from "react";

interface QRCodePrintGridProps {
  codes: { id: string; dataUrl: string }[];
  qrSizeCm: number;
}

const A4_MM_WIDTH = 210;
const A4_MM_HEIGHT = 297;
const MARGIN_MM = 15;
const GAP_MM = 5;

/**
 * Calculate how many QR codes fit on one A4 page.
 */
function calculateGrid(qrSizeCm: number) {
  const qrSizeMm = qrSizeCm * 10;
  const usableWidth = A4_MM_WIDTH - MARGIN_MM * 2;
  const usableHeight = A4_MM_HEIGHT - MARGIN_MM * 2;
  const cellSize = qrSizeMm + GAP_MM;
  const cols = Math.floor(usableWidth / cellSize);
  const rows = Math.floor(usableHeight / cellSize);
  const perPage = Math.max(1, cols * rows);
  return { cols, rows, perPage, qrSizeMm, colWidth: usableWidth / cols };
}

export const QRCodePrintGrid: React.FC<QRCodePrintGridProps> = ({
  codes,
  qrSizeCm,
}) => {
  const { cols, rows, perPage, qrSizeMm } = calculateGrid(qrSizeCm);
  const pageCount = Math.ceil(codes.length / perPage);

  // Pad codes to fill complete pages
  const padded = [...codes];
  while (padded.length < pageCount * perPage) {
    padded.push({ id: "", dataUrl: "" });
  }

  return (
    <div className="print-content">
      {/* Page info header - hidden in print */}
      <div className="print:hidden mb-4 p-3 bg-blue-50 text-blue-800 rounded-md text-sm">
        <p>
          <strong>Layout:</strong> {cols} columns &times; {rows} rows ={" "}
          {perPage} QR codes per A4 page
        </p>
        <p>
          <strong>QR size:</strong> {qrSizeCm} cm ({qrSizeMm} mm) &mdash;{" "}
          {pageCount} page{pageCount > 1 ? "s" : ""}
        </p>
      </div>

      {/* Generate pages */}
      {Array.from({ length: pageCount }).map((_, pageIdx) => (
        <div
          key={pageIdx}
          className="qr-page"
          style={{
            width: `${A4_MM_WIDTH}mm`,
            minHeight: `${A4_MM_HEIGHT}mm`,
            padding: `${MARGIN_MM}mm`,
            boxSizing: "border-box",
            pageBreakAfter: "always",
            display: "flex",
            flexWrap: "wrap",
            alignContent: "flex-start",
            gap: `${GAP_MM}mm`,
          }}
        >
          {Array.from({ length: rows }).map((_, rowIdx) =>
            Array.from({ length: cols }).map((_, colIdx) => {
              const idx = pageIdx * perPage + rowIdx * cols + colIdx;
              const code = padded[idx];
              if (!code || !code.dataUrl) {
                return (
                  <div
                    key={`${rowIdx}-${colIdx}`}
                    style={{
                      width: `${qrSizeMm}mm`,
                      height: `${qrSizeMm}mm`,
                    }}
                  />
                );
              }
              return (
                <div
                  key={code.id}
                  style={{
                    width: `${qrSizeMm}mm`,
                    height: `${qrSizeMm}mm`,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    boxSizing: "border-box",
                  }}
                >
                  <img
                    src={code.dataUrl}
                    alt={`QR ${code.id}`}
                    style={{
                      width: "100%",
                      height: "auto",
                      display: "block",
                    }}
                  />
                  <span
                    style={{
                      fontSize: `${Math.max(6, qrSizeMm * 0.12)}px`,
                      fontFamily: "monospace",
                      textAlign: "center",
                      marginTop: "2px",
                      color: "#000",
                      lineHeight: 1.1,
                      wordBreak: "break-all",
                    }}
                  >
                    {code.id}
                  </span>
                </div>
              );
            }),
          )}
        </div>
      ))}

      {/* Print button - hidden when printing */}
      <div className="print:hidden mt-6 flex justify-center">
        <button
          onClick={() => window.print()}
          className="px-6 py-3 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
        >
          🖨️ Print QR Codes
        </button>
      </div>
    </div>
  );
};
