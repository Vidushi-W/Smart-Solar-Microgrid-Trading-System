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

export function isSampleReservation(reservationId) {
  return String(reservationId || "").startsWith("RSV-");
}

function sampleQrText(reservationId) {
  const raw = Array.from(String(reservationId))
    .map((char) => char.charCodeAt(0).toString(16).padStart(2, "0"))
    .join("");
  const token = `${raw}A1F03C7E9B2846D5`.repeat(4).replace(/[^A-F0-9]/gi, "0").slice(0, 64).toUpperCase();
  return JSON.stringify({ version: 1, reservationId, token });
}

function issueOnce(reservationId) {
  if (!inflight.has(reservationId)) {
    const request = issueReservationQr(reservationId)
      .then((issued) => {
        const payload = issued?.qrPayload || issued?.QrPayload;
        if (!payload) throw new Error("The transfer QR response did not include a code.");
        const text = JSON.stringify(payload);
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
  const visible = status === "Approved" || status === "Scheduled";
  const local = isSampleReservation(reservationId);

  useEffect(() => {
    if (!reservationId || !visible) return undefined;
    let active = true;
    const saved = local ? null : sessionStorage.getItem(storageKey(reservationId));
    setBusy(!saved && !local);
    setError("");
    const ready = local ? Promise.resolve(sampleQrText(reservationId)) : saved ? Promise.resolve(saved) : issueOnce(reservationId);
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
  }, [reservationId, visible, local]);

  if (!visible) return null;

  async function replaceCode() {
    setBusy(true);
    setError("");
    try {
      let text;
      if (local) {
        text = sampleQrText(reservationId);
      } else {
        sessionStorage.removeItem(storageKey(reservationId));
        text = await issueOnce(reservationId);
      }
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
