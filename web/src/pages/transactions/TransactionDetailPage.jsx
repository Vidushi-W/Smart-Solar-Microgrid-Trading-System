/**
 * One transfer, read from the reservation API. Scheduling uses the same reservation action as the reservations desk.
 */
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import PageHeader from "../../components/common/PageHeader";
import StatusBadge from "../../components/common/StatusBadge";
import { useAuth } from "../../context/AuthContext";
import { fetchReservation, postReservationAction } from "../../services/reservationsApi";
import { formatDateTime, formatTimeRange } from "../../utils/format";

export default function TransactionDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const [reservation, setReservation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    setLoading(true);
    setError("");
    try {
      setReservation(await fetchReservation(user, id));
    } catch (err) {
      setReservation(null);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [user.id, id]);

  async function schedule() {
    setBusy(true);
    setError("");
    try {
      setReservation(await postReservationAction(user, id, "schedule"));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  if (loading && !reservation) {
    return (
      <div>
        <PageHeader title="Loading transfer" />
      </div>
    );
  }

  if (!reservation) {
    return (
      <div>
        <PageHeader title="Transfer not found" description={error} />
        <Link to="/transactions">Back to transfers</Link>
      </div>
    );
  }

  const history = reservation.history || [];
  const updated = history.length ? history[history.length - 1].at : reservation.start;
  const canSchedule = (reservation.allowedActions || []).includes("schedule");

  return (
    <div>
      <PageHeader title={reservation.code} actions={<StatusBadge value={reservation.status} />} />
      <p className="back-link">
        <Link to="/transactions">All transfers</Link>
        {" · "}
        <Link to={`/reservations/${reservation.id}`}>{reservation.code}</Link>
      </p>
      {error ? <p className="form-error" role="alert">{error}</p> : null}
      <article className="panel narrow">
        <dl className="kv">
          <div>
            <dt>Prosumer</dt>
            <dd>{reservation.prosumerName}</dd>
          </div>
          <div>
            <dt>Station</dt>
            <dd>{reservation.stationName}</dd>
          </div>
          <div>
            <dt>Slot</dt>
            <dd>{reservation.slotLabel}</dd>
          </div>
          <div>
            <dt>Reservation window</dt>
            <dd>{formatTimeRange(reservation.start, reservation.end)}</dd>
          </div>
          <div>
            <dt>Service</dt>
            <dd>{reservation.serviceType}</dd>
          </div>
          <div>
            <dt>Energy</dt>
            <dd>{reservation.energyKwh} kWh</dd>
          </div>
          <div>
            <dt>Reservation status</dt>
            <dd><StatusBadge value={reservation.status} /></dd>
          </div>
          <div>
            <dt>Updated</dt>
            <dd>{formatDateTime(updated)}</dd>
          </div>
        </dl>
        {canSchedule ? (
          <div className="action-row">
            <button type="button" className="btn primary" disabled={busy} onClick={schedule}>Confirm schedule</button>
          </div>
        ) : null}
      </article>
    </div>
  );
}
