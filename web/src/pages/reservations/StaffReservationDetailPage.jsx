/**
 * One reservation from GET /api/reservations/{id} for staff.
 * Backoffice may approve a pending request. The prosumer who created the reservation is the only person who can change or cancel it.
 */
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import PageHeader from "../../components/common/PageHeader";
import StatusBadge from "../../components/common/StatusBadge";
import { useAuth } from "../../context/AuthContext";
import { approveReservation, fetchProsumerAccounts, fetchReservation, listStationsForReservations } from "../../services/apiClient";
import { stationTitle, utcDateLabel, utcTimeLabel } from "./reservationTime";

export default function StaffReservationDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const canApprove = user.role === "Backoffice";
  const [reservation, setReservation] = useState(null);
  const [stations, setStations] = useState([]);
  const [prosumerName, setProsumerName] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    const prosumerLoad = canApprove ? fetchProsumerAccounts().catch(() => []) : Promise.resolve([]);
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
  }, [id, canApprove]);

  const station = stations.find((item) => item.stationId === reservation?.stationId) || null;
  const prosumerLabel = prosumerName || reservation?.prosumerId || "";

  // Approve through the account API, then reload the reservation so the screen shows the stored record.
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

  return (
    <div className="page mine">
      <PageHeader
        eyebrow="Reservations"
        title="Reservation details"
        actions={<Link className="btn primary" to="/reservations">Reservations</Link>}
      />

      {error ? <p className="reserve-alert">{error}</p> : null}
      {loading ? <p className="reserve-status">Loading reservation</p> : null}

      {reservation ? (
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

          {canApprove && reservation.status === "Pending" ? (
            <div className="reserve-actions">
              <button type="button" className="btn primary" disabled={busy} onClick={approve}>
                {busy ? "Approving" : "Approve reservation"}
              </button>
            </div>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
