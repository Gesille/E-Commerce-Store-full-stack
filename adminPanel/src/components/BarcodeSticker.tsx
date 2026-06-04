"use client";

import { useEffect, useRef } from "react";
import JsBarcode from "jsbarcode";

interface Props {
  productName: string;
  barcode: string;
}

export function BarcodeSticker({ productName, barcode }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!svgRef.current || !barcode) return;
    try {
      JsBarcode(svgRef.current, barcode, {
        format: "CODE128",   // works with any string/number
        width: 2,
        height: 60,
        displayValue: true,
        fontSize: 13,
        margin: 10,
        background: "#ffffff",
        lineColor: "#000000",
      });
    } catch (e) {
      console.error("JsBarcode error:", e);
    }
  }, [barcode]);

  const download = () => {
    const svg = svgRef.current;
    if (!svg) return;

    const canvas = canvasRef.current!;
    const svgData = new XMLSerializer().serializeToString(svg);
    const svgBlob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(svgBlob);

    const img = new Image();
    img.onload = () => {
      // Canvas: barcode + label underneath
      const padding = 16;
      const labelH = 36;
      canvas.width = img.width + padding * 2;
      canvas.height = img.height + labelH + padding;

      const ctx = canvas.getContext("2d")!;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw barcode
      ctx.drawImage(img, padding, padding / 2);

      // Product name below
      ctx.fillStyle = "#000000";
      ctx.font = "bold 13px sans-serif";
      ctx.textAlign = "center";
      const label =
        productName.length > 32 ? productName.slice(0, 32) + "…" : productName;
      ctx.fillText(label, canvas.width / 2, img.height + padding / 2 + 20);

      URL.revokeObjectURL(url);

      const link = document.createElement("a");
      link.download = `sticker-${barcode}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    };
    img.src = url;
  };

  if (!barcode) return null;

  return (
    <div className="flex flex-col items-center gap-3 p-3 bg-white rounded-xl border border-gray-200">
      {/* Live preview */}
      <svg ref={svgRef} className="w-full max-w-[260px]" />
      <canvas ref={canvasRef} className="hidden" />

      <button
        type="button"
        onClick={download}
        className="flex items-center gap-1.5 text-xs font-semibold text-white 
                   bg-indigo-600 hover:bg-indigo-700 px-3 py-1.5 rounded-lg transition-colors"
      >
        ⬇ Download Sticker PNG
      </button>
    </div>
  );
}