/**
 * Reservation detail. Approve, reject, schedule, cancel, and modify all update the browser session in DataContext.
 */
import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import Modal from "../../components/common/Modal";
import PageHeader from "../../components/common/PageHeader";
import StatusBadge from "../../components/common/StatusBadge";
import { useAuth } from "../../context/AuthContext";
import { useData } from "../../context/DataContext";
import { formatDateTime, formatTimeRange } from "../../utils/format";
import {
  canApprove,
  canCancel,
  canModify,
  canReject,
  canSchedule,
  describeLead,
  hasTwelveHourNotice,
  isInsideSevenDayWindow,
  slotHoldCount,
} from "../../utils/reservationRules";

export default function ReservationDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const data = useData();
  const [rejectOpen, setRejectOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [slotId, setSlotId] = useState("");
  const reservation = data.reservations.find((item) => item.id === id);

  const prosumer = data.prosumers.find((item) => item.id === reservation?.prosumerId);
  const station = data.stations.find((item) => item.id === reservation?.stationId);
  const slot = data.slots.find((item) => item.id === reservation?.slotId);
  const transaction = data.transactions.find((item) => item.reservationId === reservation?.id);

  const choices = useMemo(() => {
    if (!reservation) return [];
    return data.slots.filter((candidate) => {
      if (candidate.id === reservation.slotId) return false;
      const place = data.stations.find((item) => item.id === candidate.stationId);
      if (!place || place.status !== "Active" || !candidate.isOpen) return false;
      if (!isInsideSevenDayWindow(candidate.start) || !hasTwelveHourNotice(candidate.start)) return false;
      return slotHoldCount(data.reservations, candidate.id, reservation.id) < candidate.capacity;
    });
  }, [data.slots, data.stations, data.reservations, reservation]);

  if (!reservation) {
    return (
      <div>
        <PageHeader title="Reservation not found" />
        <Link to="/reservations">Back to reservations</Link>
      </div>
    );
  }

  const actor = user;
  const approveBlock = canApprove(reservation, slot, station);
  const rejectBlock = canReject(reservation);
  const scheduleBlock = canSchedule(reservation);
  const cancelBlock = canCancel(reservation);
  const modifyBlock = canModify(reservation);

  return (
    <div>
      <PageHeader
        title={reservation.code}
        description={`${reservation.serviceType} · ${describeLead(reservation.start)}`}
        actions={<StatusBadge value={reservation.status} />}
      />
      <p className="back-link">
        <Link to="/reservations">All reservations</Link>
        {transaction ? (
          <>
            {" · "}
            <Link to={`/transactions/${transaction.id}`}>{transaction.code}</Link>
          </>
        ) : null}
      </p>
      <div className="detail-grid">
        <article className="panel">
          <h2>Booking</h2>
          <dl className="kv">
            <div>
              <dt>Prosumer</dt>
              <dd>
                {prosumer?.name} · {prosumer?.nic}
              </dd>
            </div>
            <div>
              <dt>Station</dt>
              <dd>{station?.name}</dd>
            </div>
            <div>
              <dt>Slot</dt>
              <dd>{slot?.label}</dd>
            </div>
            <div>
              <dt>Window</dt>
              <dd>{formatTimeRange(reservation.start, reservation.end)}</dd>
            </div>
            <div>
              <dt>Energy</dt>
              <dd>{reservation.energyKwh} kWh</dd>
            </div>
            <div>
              <dt>QR token</dt>
              <dd>{transaction ? transaction.tokenStatus : "Not created"}</dd>
            </div>
          </dl>
          <div className="action-row">
            {user.role === "Backoffice" ? (
              <>
                <button
                  type="button"
                  className="btn primary"
                  disabled={Boolean(approveBlock)}
                  onClick={() => data.approveReservation(reservation.id, actor)}
                >
                  Approve
                </button>
                <button
                  type="button"
                  className="btn danger"
                  disabled={Boolean(rejectBlock)}
                  onClick={() => setRejectOpen(true)}
                >
                  Reject
                </button>
                <button
                  type="button"
                  className="btn ghost"
                  disabled={Boolean(cancelBlock)}
                  onClick={() => data.cancelReservation(reservation.id, actor)}
                >
                  Cancel
                </button>
              </>
            ) : (
              <button
                type="button"
                className="btn primary"
                disabled={Boolean(scheduleBlock)}
                onClick={() => data.scheduleReservation(reservation.id, actor)}
              >
                Confirm schedule
              </button>
            )}
          </div>
          {user.role === "Backoffice" && (approveBlock || rejectBlock || cancelBlock) ? (
            <p className="hint">{approveBlock || rejectBlock || cancelBlock}</p>
          ) : null}
          {user.role !== "Backoffice" && scheduleBlock ? <p className="hint">{scheduleBlock}</p> : null}
          {user.role === "Backoffice" ? (
            <form
              className="form-stack tight"
              onSubmit={(event) => {
                event.preventDefault();
                if (!slotId) return;
                data.modifyReservation(reservation.id, slotId, actor);
                setSlotId("");
              }}
            >
              <h2>Modify slot</h2>
              <label>
                Eligible open slots
                <select value={slotId} onChange={(event) => setSlotId(event.target.value)} disabled={Boolean(modifyBlock)}>
                  <option value="">Select a slot</option>
                  {choices.map((candidate) => {
                    const place = data.stations.find((item) => item.id === candidate.stationId);
                    return (
                      <option key={candidate.id} value={candidate.id}>
                        {place?.name} — {candidate.label}
                      </option>
                    );
                  })}
                </select>
              </label>
              <button type="submit" className="btn" disabled={!slotId || Boolean(modifyBlock)}>
                Save modification
              </button>
              {modifyBlock ? <p className="hint">{modifyBlock}</p> : null}
            </form>
          ) : null}
        </article>
        <article className="panel">
          <h2>Status history</h2>
          <ol className="timeline">
            {reservation.history.map((item, index) => (
              <li key={`${item.at}-${item.action}-${index}`}>
                <span>{formatDateTime(item.at)}</span>
                <strong>{item.action}</strong>
                <p>{item.note}</p>
                <em>{item.by}</em>
              </li>
            ))}
          </ol>
        </article>
      </div>
      {rejectOpen ? (
        <Modal title={`Reject ${reservation.code}`} onClose={() => setRejectOpen(false)}>
          <form
            className="form-stack"
            onSubmit={(event) => {
              event.preventDefault();
              data.rejectReservation(reservation.id, actor, reason);
              setRejectOpen(false);
            }}
          >
            <label>
              Reason
              <textarea value={reason} onChange={(event) => setReason(event.target.value)} rows={4} />
            </label>
            <div className="action-row">
              <button type="submit" className="btn danger">
                Confirm rejection
              </button>
              <button type="button" className="btn ghost" onClick={() => setRejectOpen(false)}>
                Keep reservation
              </button>
            </div>
          </form>
        </Modal>
      ) : null}
    </div>
  );
}
