import { useEffect, useRef } from 'react';

/**
 * Custom hook to detect global hardware barcode scanner inputs.
 * Hardware scanners type character sequences very fast (< 50ms per key) and end with 'Enter'.
 *
 * Strategy:
 *  - We listen to every keydown on window.
 *  - If the active element is an INPUT/TEXTAREA/SELECT, we still capture the barcode
 *    because the scanner types into whatever is focused. We detect by speed.
 *  - Characters arriving with < 80ms gap are considered scanner input.
 *  - When Enter is pressed and the buffer looks like a known barcode prefix, we fire onScan.
 *  - We also clear the active input value so stale text is not left in the search box.
 *
 * @param {Function} onScan - Callback triggered with the scanned barcode string.
 */
export default function useBarcodeScanner(onScan) {
  const bufferRef = useRef('');
  const lastKeyTimeRef = useRef(0);
  // Keep a stable reference to onScan to avoid effect re-subscription on every render
  const onScanRef = useRef(onScan);

  useEffect(() => {
    onScanRef.current = onScan;
  }, [onScan]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ignore keys with modifier shortcuts (browser shortcuts, etc.)
      if (e.ctrlKey || e.altKey || e.metaKey) return;

      const currentTime = Date.now();
      const timeDiff = currentTime - lastKeyTimeRef.current;
      lastKeyTimeRef.current = currentTime;

      const key = e.key;

      if (key === 'Enter') {
        const buffer = bufferRef.current.trim();
        // Check if the buffered string looks like one of our barcode prefixes
        const isBarcode = /^(JL|JLB|JLR|JLS)-/i.test(buffer) && buffer.length >= 8;

        if (buffer && isBarcode) {
          // Prevent form submissions or other default Enter actions
          e.preventDefault();
          e.stopPropagation();

          // Clear the active input element to remove barcode text that was typed into it
          const active = document.activeElement;
          if (active && typeof active.blur === 'function') {
            if (
              active.tagName === 'INPUT' ||
              active.tagName === 'TEXTAREA' ||
              active.tagName === 'SELECT'
            ) {
              // Clear whatever scanner typed into the focused element
              if (typeof active.value !== 'undefined') {
                // Small delay so the React state can be read first, then clear
                setTimeout(() => {
                  try { active.value = ''; } catch (_) {}
                }, 0);
              }
              active.blur();
            }
          }

          // Fire the scan callback
          onScanRef.current(buffer);
        }

        // Always reset buffer on Enter
        bufferRef.current = '';
      } else if (key.length === 1) {
        // Characters arriving slowly (> 80ms) after a non-empty buffer indicate
        // human typing – reset buffer to avoid false positives.
        // Note: the very first character of a scan will have a large timeDiff
        // but the buffer is empty so it starts fresh correctly.
        if (timeDiff > 80 && bufferRef.current.length > 0) {
          bufferRef.current = '';
        }
        bufferRef.current += key;
      } else if (key === 'Backspace' || key === 'Delete' || key === 'Escape') {
        // Keyboard corrections reset the buffer
        bufferRef.current = '';
      }
    };

    window.addEventListener('keydown', handleKeyDown, true); // capture phase
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, []); // Empty deps - uses onScanRef so no re-subscribe needed
}
