/**
 * Shows the prosumer the transfer QR returned by POST /api/reservations/{id}/qr.
 * A code already kept for this reservation is reused so a refresh does not replace it.
 */
import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { issueReservationQr } from "../../services/apiClient";

const inflight = new Map();

function storageKey(reservationId) {
  return `transfer-qr:${reservationId}`;
}

function issueOnce(reservationId) {
  if (!inflight.has(reservationId)) {
    const request = issueReservationQr(reservationId)
      .then((issued) => {
        const text = JSON.stringify(issued.qrPayload);
        sessionStorage.setItem(storageKey(reservationId), text);
        return text;
      })
      .finally(() => inflight.delete(reservationId));
    inflight.set(reservationId, request);
  }
  return inflight.get(reservationId);
}

export default function TransferQr({ reservationId, status, compact = false }) {
  const [image, setImage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const visible = status === "Pending" || status === "Approved";

  useEffect(() => {
    if (!reservationId || !visible) return undefined;
    let active = true;
    const saved = sessionStorage.getItem(storageKey(reservationId));
    setBusy(!saved);
    setError("");
    const ready = saved ? Promise.resolve(saved) : issueOnce(reservationId);
    ready
      .then((text) => QRCode.toDataURL(text, { margin: 1, width: 280 }))
      .then((next) => {
        if (active) setImage(next);
      })
      .catch((reason) => {
        if (active) setError(reason.message || "The transfer QR could not be created.");
      })
      .finally(() => {
        if (active) setBusy(false);
      });
    return () => {
      active = false;
    };
  }, [reservationId, visible]);

  if (!visible) return null;

  async function replaceCode() {
    setBusy(true);
    setError("");
    try {
      sessionStorage.removeItem(storageKey(reservationId));
      const text = await issueOnce(reservationId);
      setImage(await QRCode.toDataURL(text, { margin: 1, width: 280 }));
    } catch (reason) {
      setError(reason.message || "The transfer QR could not be created.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="transfer-qr-block">
      {compact ? null : <p>Show this code to the grid operator. It is the transfer QR for this reservation.</p>}
      {busy && !image ? <p className="reserve-status">Creating your transfer QR</p> : null}
      {error ? <p className="reserve-alert">{error}</p> : null}
      {image ? <img className="transfer-qr" src={image} alt="Transfer QR code" /> : null}
      {compact ? null : (
        <button type="button" className="btn ghost" disabled={busy} onClick={replaceCode}>
          {busy ? "Creating code" : "Generate a new code"}
        </button>
      )}
    </div>
  );
}
