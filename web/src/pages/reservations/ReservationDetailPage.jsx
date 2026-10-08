/**
 * Role switch for a reservation: a Prosumer sees ProsumerReservationDetailPage and every other role sees StaffReservationDetailPage. OperationalReservationDetailPage loads one reservation through fetchReservation. Backoffice can approve or reject, a Grid Operator can schedule, and any other role can cancel or modify, but only when allowedActions includes that action.
 */
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import Modal from "../../components/common/Modal";
import PageHeader from "../../components/common/PageHeader";
import StatusBadge from "../../components/common/StatusBadge";
import ApiFailure from "../../components/common/ApiFailure";
import { useAuth } from "../../context/AuthContext";
import { fetchReservation, fetchReservationOptions, modifyReservation, postReservationAction } from "../../services/reservationsApi";
import ProsumerReservationDetailPage from "./ProsumerReservationDetailPage";
import StaffReservationDetailPage from "./StaffReservationDetailPage";
import { formatDateTime, formatTimeRange } from "../../utils/format";

export function ReservationFields({ reservation: r }) {
  return <dl className="kv">
    <div><dt>Reservation ID</dt><dd>{r.id}</dd></div>
    <div><dt>Prosumer</dt><dd>{r.prosumerName}</dd></div>
    <div><dt>Station</dt><dd>{r.stationName}</dd></div>
    <div><dt>Slot</dt><dd>{r.slotLabel}</dd></div>
    <div><dt>Window</dt><dd>{formatTimeRange(r.start, r.end)}</dd></div>
    <div><dt>Service</dt><dd>{r.serviceType}</dd></div>
    <div><dt>Energy</dt><dd>{r.energyKwh} kWh</dd></div>
    <div><dt>Status</dt><dd><StatusBadge value={r.status} /></dd></div>
  </dl>;
}

export function OperationalReservationDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const [reservation, setReservation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [dialog, setDialog] = useState(null);
  const [reason, setReason] = useState("");
  const [slotId, setSlotId] = useState("");
  const [options, setOptions] = useState(null);
  const [optionsLoading, setOptionsLoading] = useState(false);
  const [notice, setNotice] = useState("");
  const [reload, setReload] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError(null); setReservation(null); setDialog(null); setNotice("");
    fetchReservation(user, id, controller.signal)
      .then(setReservation)
      .catch((e) => { if (e.name !== "AbortError") setError(e); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [id, user.id, user.role, reload]);

  // Modify sends the chosen slotId. Reject sends a reason. Every other action posts an empty body.
  async function run(action) {
    setBusy(true); setError(null); setNotice("");
    try {
      const saved = action === "modify"
        ? await modifyReservation(user, id, slotId)
        : await postReservationAction(user, id, action, action === "reject" ? { reason } : {});
      setReservation(saved); setDialog(null); setSlotId(""); setReason("");
      setNotice("Reservation updated.");
    } catch (e) { setError(e); }
    finally { setBusy(false); }
  }
  // Load replacement options for this reservation's prosumer before the dialog can be confirmed.
  async function openModify() {
    setDialog("modify"); setOptions(null); setOptionsLoading(true); setError(null);
    try { setOptions(await fetchReservationOptions(user, reservation.prosumerId)); }
    catch (e) { setError(e); }
    finally { setOptionsLoading(false); }
  }
  const roleActions = user.role === "Backoffice" ? ["approve", "reject"]
    : user.role === "GridOperator" ? ["schedule"] : ["cancel", "modify"];
  const labels = { approve: "Approve", reject: "Reject", cancel: "Cancel reservation", modify: "Modify slot", schedule: "Confirm schedule" };
  const choices = options?.stations?.flatMap((station) => station.slots.map((slot) => ({ ...slot, stationName: station.name }))) || [];

  return <div className="page">
    <PageHeader title={reservation?.code || "Reservation"} actions={reservation ? <StatusBadge value={reservation.status} /> : null} />
    <p className="back-link"><Link to="/operational-reservations">All reservations</Link></p>
    {loading ? <p role="status">Loading reservation…</p> : null}
    <ApiFailure error={error} onRetry={!busy ? () => setReload((n) => n + 1) : undefined} />
    {notice ? <p className="hint" role="status">{notice}</p> : null}
    {reservation && !loading ? <>
      <div className="detail-grid">
        <article className="panel">
          <h2>Booking</h2><ReservationFields reservation={reservation} />
          <div className="action-row">{roleActions.map((action) => <button key={action} type="button"
            className={action === "reject" || action === "cancel" ? "btn danger" : "btn primary"}
            disabled={busy || !reservation.allowedActions.includes(action)}
            title={reservation.actionBlocks[action] || ""}
            onClick={() => action === "modify" ? openModify() : setDialog(action)}>{labels[action]}</button>)}</div>
          {roleActions.filter((action) => reservation.actionBlocks[action]).map((action) =>
            <p key={action} className="hint">{labels[action]}: {reservation.actionBlocks[action]}</p>)}
          {["Backoffice", "GridOperator"].includes(user.role) ? <p className="back-link"><Link to={`/transactions/${encodeURIComponent(id)}`}>Transfer information</Link></p> : null}
        </article>
        <article className="panel"><h2>Status history</h2>
          {reservation.history.length ? <ol className="timeline">{reservation.history.map((item, i) =>
            <li key={`${item.at}-${i}`}><span>{formatDateTime(item.at)}</span><strong>{item.action}</strong>
              <p>{item.note}</p><em>{item.actorRole} · {item.actorId}</em></li>)}</ol> : <p className="hint">No history recorded.</p>}
        </article>
      </div>
      {dialog ? <Modal title={labels[dialog]} onClose={() => { if (!busy) setDialog(null); }}>
        <form className="form-stack" onSubmit={(e) => { e.preventDefault(); run(dialog); }}>
          <p>{reservation.code} · {reservation.stationName}</p>
          {dialog === "reject" ? <label>Reason<textarea required value={reason} onChange={(e) => setReason(e.target.value)} /></label> : null}
          {dialog === "modify" ? <>
            {optionsLoading ? <p role="status">Loading server booking options…</p> : null}
            <label>Replacement slot<select required value={slotId} onChange={(e) => setSlotId(e.target.value)}>
              <option value="">Select a slot</option>{choices.filter((slot) => slot.id !== reservation.slotId).map((slot) =>
                <option key={slot.id} value={slot.id}>{slot.stationName} · {slot.label} · {formatTimeRange(slot.start, slot.end)}</option>)}
            </select></label>
            {!optionsLoading && options && !choices.length ? <p>No replacement options returned.</p> : null}
            <p className="hint">The server validates the selected change when you confirm.</p>
          </> : null}
          <ApiFailure error={error} />
          <div className="action-row"><button className="btn primary" disabled={busy || optionsLoading || (dialog === "modify" && !slotId)}>{busy ? "Saving…" : "Confirm"}</button>
            <button className="btn ghost" type="button" disabled={busy} onClick={() => setDialog(null)}>Back</button></div>
        </form>
      </Modal> : null}
    </> : null}
  </div>;
}

export default function ReservationDetailPage() {
  const { user } = useAuth();
  return user.role === "Prosumer" ? <ProsumerReservationDetailPage /> : <StaffReservationDetailPage />;
}
