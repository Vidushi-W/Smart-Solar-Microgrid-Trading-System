/**
 * One prosumer reservation from GET /api/reservations/{id}.
 * Cancel sends DELETE and then reloads the same reservation for the summary.
 */
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import PageHeader from "../../components/common/PageHeader";
import StatusBadge from "../../components/common/StatusBadge";
import ReservationActionSummary from "../../components/reservations/ReservationActionSummary";
import TransferQr from "../../components/reservations/TransferQr";
import { cancelReservation, fetchReservation, listStationsForReservations } from "../../services/apiClient";
import { stationTitle, utcDateLabel, utcTimeLabel } from "./reservationTime";

export default function ProsumerReservationDetailPage() {
  const { id } = useParams();
  const [reservation, setReservation] = useState(null);
  const [stations, setStations] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [confirmingCancel, setConfirmingCancel] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    setSummary(null);
    setConfirmingCancel(false);
    Promise.all([fetchReservation(id), listStationsForReservations()])
      .then(([row, stationRows]) => {
        if (!active) return;
        setReservation(row);
        setStations(Array.isArray(stationRows) ? stationRows : []);
      })
      .catch((reason) => {
        if (!active) return;
        setReservation(null);
        setError(reason.message || "Could not load the reservation.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [id]);

  const station = stations.find((item) => item.stationId === reservation?.stationId) || null;

  function closeConfirmation() {
    if (busy) return;
    setConfirmingCancel(false);
    setError("");
  }

  async function confirmCancel() {
    if (!reservation || busy) return;
    setBusy(true);
    setError("");
    try {
      await cancelReservation(reservation.reservationId);
    } catch (reason) {
      setError(reason.message || "The reservation could not be cancelled.");
      setBusy(false);
      return;
    }

    try {
      const refreshed = await fetchReservation(reservation.reservationId);
      setReservation(refreshed);
      setSummary(refreshed);
      setConfirmingCancel(false);
    } catch (reason) {
      setSummary(null);
      setError(reason.message || "The cancelled reservation could not be reloaded.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page mine">
      <PageHeader
        eyebrow="Reservations"
        title="Reservation details"
        actions={<Link className="btn ghost" to="/reservations">My reservations</Link>}
      />

      {!confirmingCancel && error ? <p className="reserve-alert">{error}</p> : null}
      {loading ? <p className="reserve-status">Loading reservation</p> : null}

      {summary ? (
        <ReservationActionSummary
          title="Cancellation summary"
          result="Cancelled"
          reservationId={summary.reservationId}
          stationName={stationTitle(stations.find((item) => item.stationId === summary.stationId), summary.stationId)}
          date={utcDateLabel(summary.scheduledAtUtc)}
          time={`${utcTimeLabel(summary.scheduledAtUtc)} UTC`}
          status={summary.status}
          onView={() => setSummary(null)}
        />
      ) : null}

      {!summary && reservation ? (
        <section className="reserve-panel">
          <dl className="reserve-summary">
            <dt>Reservation</dt>
            <dd>{reservation.reservationId}</dd>
            <dt>Station</dt>
            <dd>{stationTitle(station, reservation.stationId)}</dd>
            <dt>Scheduled date</dt>
            <dd>{utcDateLabel(reservation.scheduledAtUtc)}</dd>
            <dt>Time</dt>
            <dd>{utcTimeLabel(reservation.scheduledAtUtc)} UTC</dd>
            <dt>Status</dt>
            <dd><StatusBadge value={reservation.status} /></dd>
            <dt>Created</dt>
            <dd>{utcDateLabel(reservation.createdAtUtc)}</dd>
          </dl>

          <TransferQr reservationId={reservation.reservationId} status={reservation.status} />

          <div className="reserve-actions">
            <Link className="btn primary" to={`/reservations/${reservation.reservationId}/modify`}>Modify</Link>
            <button type="button" className="btn ghost" disabled={busy} onClick={() => { setConfirmingCancel(true); setError(""); }}>
              Cancel Reservation
            </button>
          </div>
        </section>
      ) : null}

      {confirmingCancel && reservation ? (
        <div className="confirmation-backdrop">
          <section
            className="confirmation-dialog"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="cancel-reservation-title"
          >
            <h2 id="cancel-reservation-title">Cancel reservation</h2>
            <dl className="reserve-summary">
              <dt>Station</dt>
              <dd>{stationTitle(station, reservation.stationId)}</dd>
              <dt>Date</dt>
              <dd>{utcDateLabel(reservation.scheduledAtUtc)}</dd>
              <dt>Time</dt>
              <dd>{utcTimeLabel(reservation.scheduledAtUtc)} UTC</dd>
            </dl>
            {error ? <p className="reserve-alert">{error}</p> : null}
            <div className="form-actions">
              <button className="btn ghost" type="button" disabled={busy} onClick={closeConfirmation}>
                Keep Reservation
              </button>
              <button className="btn primary" type="button" disabled={busy} onClick={confirmCancel}>
                {busy ? "Cancelling" : "Cancel Reservation"}
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
