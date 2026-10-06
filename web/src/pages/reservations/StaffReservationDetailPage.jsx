/**
 * One reservation from GET /api/reservations/{id} for staff.
 * Backoffice can send an update or cancel. The API decides whether the change is allowed.
 */
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import FlashNotice from "../../components/common/FlashNotice";
import PageHeader from "../../components/common/PageHeader";
import StatusBadge from "../../components/common/StatusBadge";
import ReservationActionSummary from "../../components/reservations/ReservationActionSummary";
import ReservationFacts from "../../components/reservations/ReservationFacts";
import { useAuth } from "../../context/AuthContext";
import { approveReservation, cancelReservation, fetchProsumerAccounts, fetchReservation, listStationsForReservations } from "../../services/apiClient";
import { hasTwelveHourNotice, TWELVE_HOUR_MESSAGE } from "../../utils/reservationRules";
import { stationTitle, utcDateLabel, utcTimeLabel } from "./reservationTime";

export default function StaffReservationDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const canChange = user.role === "Backoffice";
  const [reservation, setReservation] = useState(null);
  const [stations, setStations] = useState([]);
  const [prosumerName, setProsumerName] = useState("");
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [confirmingCancel, setConfirmingCancel] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    setSummary(null);
    setConfirmingCancel(false);
    const prosumerLoad = canChange ? fetchProsumerAccounts().catch(() => []) : Promise.resolve([]);
    Promise.all([fetchReservation(id), listStationsForReservations(), prosumerLoad])
      .then(([row, stationRows, prosumerRows]) => {
        if (!active) return;
        setReservation(row);
        setStations(Array.isArray(stationRows) ? stationRows : []);
        const match = (Array.isArray(prosumerRows) ? prosumerRows : []).find((item) => item.id === row.prosumerId);
        setProsumerName(match?.name || "");
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
  }, [id, canChange]);

  const station = stations.find((item) => item.stationId === reservation?.stationId) || null;
  const prosumerLabel = prosumerName || reservation?.prosumerId || "";

  function closeConfirmation() {
    if (busy) return;
    setConfirmingCancel(false);
    setError("");
  }

  async function approve() {
    if (!reservation || busy) return;
    setBusy(true);
    setError("");
    try {
      const saved = await approveReservation(reservation.reservationId);
      const refreshed = await fetchReservation(saved.reservationId);
      setReservation(refreshed);
    } catch (reason) {
      setError(reason.message || "The reservation could not be approved.");
    } finally {
      setBusy(false);
    }
  }

  function showNotice(text) {
    setNotice("");
    window.setTimeout(() => setNotice(text), 0);
  }

  async function confirmCancel() {
    if (!reservation || busy) return;
    if (!hasTwelveHourNotice(reservation.scheduledAtUtc)) {
      setConfirmingCancel(false);
      showNotice(TWELVE_HOUR_MESSAGE);
      return;
    }
    setBusy(true);
    setError("");
    try {
      await cancelReservation(reservation.reservationId);
    } catch (reason) {
      const message = reason.message || "The reservation could not be cancelled.";
      setConfirmingCancel(false);
      if (message.toLowerCase().includes("12 hours")) {
        showNotice(TWELVE_HOUR_MESSAGE);
      } else {
        setError(message);
      }
      setBusy(false);
      return;
    }

    try {
      const refreshed = await fetchReservation(reservation.reservationId);
      setReservation(refreshed);
      setSummary(refreshed);
      setConfirmingCancel(false);
      setNotice("Reservation cancelled");
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
        actions={<Link className="btn primary" to="/reservations">Reservations</Link>}
      />

      {!confirmingCancel && error ? <p className="reserve-alert">{error}</p> : null}
      <FlashNotice message={notice} onClose={() => setNotice("")} />
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
            <dt>Reservation ID</dt>
            <dd>{reservation.reservationId}</dd>
            <dt>Prosumer</dt>
            <dd>{prosumerLabel}</dd>
            <dt>Station</dt>
            <dd>{stationTitle(station, reservation.stationId)}</dd>
            <dt>Date</dt>
            <dd>{utcDateLabel(reservation.scheduledAtUtc)}</dd>
            <dt>Time</dt>
            <dd>{utcTimeLabel(reservation.scheduledAtUtc)} UTC</dd>
            <dt>Current status</dt>
            <dd><StatusBadge value={reservation.status} /></dd>
          </dl>

          {canChange ? (
            <div className="reserve-actions">
              {reservation.status === "Pending" ? (
                <button type="button" className="btn primary" disabled={busy} onClick={approve}>
                  {busy ? "Approving" : "Approve reservation"}
                </button>
              ) : null}
              <button type="button" className="btn primary" onClick={() => {
                if (!hasTwelveHourNotice(reservation.scheduledAtUtc)) {
                  showNotice(TWELVE_HOUR_MESSAGE);
                  return;
                }
                navigate(`/reservations/${reservation.reservationId}/modify`);
              }}>
                Update reservation
              </button>
              <button type="button" className="btn ghost" disabled={busy} onClick={() => {
                if (!hasTwelveHourNotice(reservation.scheduledAtUtc)) {
                  showNotice(TWELVE_HOUR_MESSAGE);
                  return;
                }
                setConfirmingCancel(true);
                setError("");
              }}>
                Cancel Reservation
              </button>
            </div>
          ) : null}
        </section>
      ) : null}

      {confirmingCancel && reservation ? (
        <div className="confirmation-backdrop">
          <section
            className="confirmation-dialog history-dialog"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="staff-cancel-title"
          >
            <div className="history-dialog-head">
              <div>
                <p className="eyebrow">Reservation</p>
                <h2 id="staff-cancel-title">Cancel reservation</h2>
              </div>
            </div>
            <ReservationFacts
              station={stationTitle(station, reservation.stationId)}
              date={utcDateLabel(reservation.scheduledAtUtc)}
              time={`${utcTimeLabel(reservation.scheduledAtUtc)} UTC`}
              status={reservation.status}
              noteLabel="Prosumer"
              note={prosumerLabel}
            />
            {error ? <p className="reserve-alert history-detail-alert">{error}</p> : null}
            <div className="form-actions confirm-actions">
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
