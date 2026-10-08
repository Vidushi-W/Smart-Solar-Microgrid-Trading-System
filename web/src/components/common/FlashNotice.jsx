/**
 * Small centered notice. Closes on its own, or when Close is pressed.
 */
import { useEffect, useRef } from "react";

// "successful" and "cancelled" are treated as success. Every other message is a warning.
function toneFor(message) {
  const text = String(message).toLowerCase();
  if (text.includes("successful") || text.includes("cancelled")) return "ok";
  return "warn";
}

export default function FlashNotice({ message, onClose }) {
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    if (!message) return undefined;
    const timer = window.setTimeout(() => closeRef.current(), 4000);
    return () => window.clearTimeout(timer);
  }, [message]);

  if (!message) return null;

  const tone = toneFor(message);

  return (
    <div className="confirmation-backdrop flash-notice-layer" role="presentation">
      <section className="flash-notice" role="dialog" aria-modal="true" aria-labelledby="flash-notice-title">
        <span className={`flash-notice-mark ${tone}`} aria-hidden="true">{tone === "ok" ? "✓" : "!"}</span>
        <h2 id="flash-notice-title">{message}</h2>
        <div className="flash-notice-actions">
          <button type="button" className="btn ghost" onClick={onClose}>Close</button>
        </div>
      </section>
    </div>
  );
}
