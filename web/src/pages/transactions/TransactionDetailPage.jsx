import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import PageHeader from "../../components/common/PageHeader";
import StatusBadge from "../../components/common/StatusBadge";
import ApiFailure from "../../components/common/ApiFailure";
import Modal from "../../components/common/Modal";
import { useAuth } from "../../context/AuthContext";
import { fetchReservation } from "../../services/reservationsApi";
import { verifyQr, completeTransfer } from "../../services/qrTransfersApi";
import { ReservationFields } from "../reservations/ReservationDetailPage";
import { formatDateTime } from "../../utils/format";

export default function TransactionDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const [reservation, setReservation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reload, setReload] = useState(0);
  const [payloadText, setPayloadText] = useState("");
  const [credentials, setCredentials] = useState(null);
  const [transfer, setTransfer] = useState(null);
  const [busy, setBusy] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [uncertain, setUncertain] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError(null); setReservation(null);
    setTransfer(null); setCredentials(null); setPayloadText(""); setConfirmOpen(false); setUncertain(false);
    fetchReservation(user, id, controller.signal).then(setReservation)
      .catch((e) => { if (e.name !== "AbortError") setError(e); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [id, user.id, user.role, reload]);

  async function verify(e) {
    e.preventDefault(); setError(null); setTransfer(null); setCredentials(null);
    let payload;
    try {
      if (payloadText.length > 4096) throw new Error("QR payload is too large.");
      payload = JSON.parse(payloadText);
      if (!payload || typeof payload.version !== "number" || typeof payload.reservationId !== "string" || typeof payload.token !== "string")
        throw new Error("Paste the JSON decoded from a transaction QR.");
      if (payload.reservationId !== id) throw new Error("This QR belongs to a different reservation. Open its reservation first.");
    } catch (e) { setError(e); return; }
    setBusy(true);
    try {
      const result = await verifyQr({ version: payload.version, reservationId: payload.reservationId, token: payload.token });
      setTransfer(result); setCredentials({ token: payload.token, verificationToken: result.verificationToken });
      setPayloadText("");
    } catch (e) { setError(e); }
    finally { setBusy(false); }
  }
  async function complete() {
    setBusy(true); setError(null); setConfirmOpen(false);
    try {
      const result = await completeTransfer(transfer.transactionId, credentials);
      setTransfer(result); setCredentials(null);
      // Refresh the reservation independently; the successful completion response remains visible.
      fetchReservation(user, id).then(setReservation).catch(setError);
    } catch (e) {
      setError(e); setCredentials(null);
      if (e.status == null || e.status === 0 || e.status >= 500 || (e.status >= 200 && e.status < 300)) setUncertain(true);
    } finally { setBusy(false); }
  }
  const operator = user.role === "GridOperator";
  return <div className="page">
    <PageHeader title="Transfer information" actions={reservation ? <StatusBadge value={reservation.status} /> : null} />
    <p className="back-link"><Link to="/transactions">Completed transfers</Link> · <Link to={`/reservations/${encodeURIComponent(id)}`}>Reservation details</Link></p>
    {loading ? <p role="status">Loading reservation…</p> : null}
    <ApiFailure error={error} onRetry={!busy ? () => setReload((n) => n + 1) : undefined} />
    {reservation ? <article className="panel"><h2>{reservation.code}</h2><ReservationFields reservation={reservation} />
      <p className="hint">Persisted QR token history and completion audit are not exposed by the current read API.</p>
    </article> : null}
    {operator && reservation && reservation.status !== "Completed" && !uncertain ? <article className="panel">
      <h2>Verify transaction QR</h2><p className="hint">Schedule the reservation before verification using Reservation details.</p>
      <form className="form-stack" onSubmit={verify}><label>Scanned QR JSON<textarea maxLength={4096} required value={payloadText} onChange={(e) => setPayloadText(e.target.value)} disabled={busy} rows={4} autoComplete="off" /></label>
        <button className="btn" disabled={busy}>{busy ? "Contacting server…" : "Verify with server"}</button></form>
    </article> : null}
    {transfer ? <article className="panel">
      <h2>{transfer.reservationStatus === "Completed" ? "Energy transfer completed" : "Server verification result"}</h2>
      <dl className="kv">{[["Reservation", transfer.reservationId], ["Prosumer", transfer.prosumerId], ["Station", transfer.stationId], ["Slot", transfer.slotId], ["Energy (kWh)", transfer.energyKwh]].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
        <div><dt>Reservation status</dt><dd><StatusBadge value={transfer.reservationStatus} /></dd></div>
        <div><dt>Token status</dt><dd><StatusBadge value={transfer.tokenStatus} /></dd></div>
        {transfer.completedAtUtc ? <div><dt>Completed</dt><dd>{formatDateTime(transfer.completedAtUtc)}</dd></div> : null}
        {transfer.completedBy ? <div><dt>Completed by</dt><dd>{transfer.completedBy}</dd></div> : null}
      </dl>
      {operator && credentials?.verificationToken ? <button className="btn primary" disabled={busy || transfer.reservationStatus !== "Scheduled"} onClick={() => setConfirmOpen(true)}>Confirm energy transfer</button> : null}
      {transfer.reservationStatus === "Approved" ? <p className="hint">Schedule first, then verify this QR again.</p> : null}
    </article> : null}
    {uncertain ? <p className="form-error" role="alert">The completion outcome is unknown. Check the reservation status before attempting another transfer. A persisted transfer audit requires a backend read endpoint.</p> : null}
    {confirmOpen ? <Modal title="Confirm energy transfer" onClose={() => { if (!busy) setConfirmOpen(false); }}>
      <p>Confirm {transfer.energyKwh} kWh for reservation {transfer.reservationId}?</p>
      <div className="action-row"><button className="btn primary" disabled={busy} onClick={complete}>Confirm with server</button><button className="btn ghost" onClick={() => setConfirmOpen(false)}>Back</button></div>
    </Modal> : null}
  </div>;
}
