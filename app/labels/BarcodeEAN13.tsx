"use client";

import { useEffect, useRef } from "react";
import JsBarcode from "jsbarcode";

interface BarcodeEAN13Props {
  value: string;
  className?: string;
  height?: number;
  width?: number;
  displayValue?: boolean;
}

/** Renderiza código de barras EAN-13 (valor mockado como se viesse do backend). */
export function BarcodeEAN13({
  value,
  className = "",
  height = 32,
  width = 1.2,
  displayValue = true,
}: BarcodeEAN13Props) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || !value) return;
    try {
      JsBarcode(svgRef.current, value, {
        format: "EAN13",
        width,
        height,
        displayValue,
        margin: 2,
        fontOptions: "",
        font: "monospace",
      });
    } catch {
      // valor inválido para EAN-13; não quebra a UI
    }
  }, [value, width, height, displayValue]);

  if (!value) return null;
  return <svg ref={svgRef} className={className} />;
}
