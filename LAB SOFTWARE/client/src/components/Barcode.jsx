import React, { useEffect, useRef } from 'react';
import JsBarcode from 'jsbarcode';

/**
 * Reusable Barcode generator component using jsbarcode.
 * Renders an SVG within a high-contrast white background container for optimal scan readability.
 */
export default function Barcode({ 
  value, 
  format = 'CODE128', 
  width = 1.2, 
  height = 35, 
  displayValue = true, 
  fontSize = 11,
  className = '',
  ...props 
}) {
  const svgRef = useRef(null);

  useEffect(() => {
    if (svgRef.current && value) {
      try {
        JsBarcode(svgRef.current, value, {
          format,
          width,
          height,
          displayValue,
          fontSize,
          margin: 4,
          background: '#ffffff',
          lineColor: '#000000'
        });
      } catch (err) {
        console.error('JsBarcode error:', err);
      }
    }
  }, [value, format, width, height, displayValue, fontSize]);

  return (
    <div className={`inline-block p-1 bg-white rounded border border-slate-200/60 shadow-sm print:border-0 print:shadow-none ${className}`}>
      <svg ref={svgRef} {...props}></svg>
    </div>
  );
}
