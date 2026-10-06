/**
 * Grid Operator home. Counts and the activity list come from GET /api/reservations and refresh while the page is open.
 */
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import StatusBadge from "../../components/common/StatusBadge";
import { fetchAllReservations, listStationsForReservations } from "../../services/apiClient";
import { stationTitle, utcDateLabel, utcTimeLabel } from "../reservations/reservationTime";

export default function OperatorDashboard({ name }) {
  const [rows, setRows] = useState([]);
  const [stations, setStations] = useState([]);
  const [error, setError] = useState("");
  const [updated, setUpdated] = useState("");

  useEffect(() => {
    let active = true;
    async function load() {
      const [reservationResult, stationResult] = await Promise.allSettled([
        fetchAllReservations(),
        listStationsForReservations(),
      ]);
      if (!active) return;

      if (reservationResult.status === "fulfilled") {
        setRows(Array.isArray(reservationResult.value) ? reservationResult.value : []);
      }
      if (stationResult.status === "fulfilled") {
        setStations(Array.isArray(stationResult.value) ? stationResult.value : []);
      }

      const failures = [reservationResult, stationResult]
        .filter((result) => result.status === "rejected")
        .map((result) => result.reason?.message)
        .filter(Boolean);
      if (failures.length === 0) {
        setError("");
        setUpdated(new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }));
      } else {
        setError(failures.join(" "));
      }
    }
    load();
    const timer = setInterval(load, 8000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, []);

  const count = (status) => rows.filter((row) => row.status === status).length;
  const activity = [...rows].sort((a, b) => String(b.updatedAtUtc).localeCompare(String(a.updatedAtUtc))).slice(0, 8);

  return (
    <div className="page account-page dashboard-page">
      <section className="dashboard-welcome">
        <div>
          <p className="eyebrow">GRID OPERATIONS</p>
          <h1>Good day, {name}.</h1>
          <p>Live bookings refresh from the reservation API{updated ? ` · ${updated}` : ""}.</p>
        </div>
      </section>
      {error ? <p className="form-error" role="alert">{error}</p> : null}
      <section className="account-metrics" aria-label="Live booking totals">
        <article><span>PENDING</span><strong>{count("Pending")}</strong><small>Waiting for approval</small></article>
        <article><span>APPROVED</span><strong>{count("Approved")}</strong><small>Ready for a transfer QR</small></article>
        <article><span>COMPLETED</span><strong>{count("Completed")}</strong><small>Transfer finished</small></article>
        <article><span>CANCELLED</span><strong>{count("Cancelled")}</strong><small>No longer active</small></article>
      </section>
      <section className="dashboard-workspace">
        <div className="dashboard-section-title">
          <div>
            <p className="eyebrow">LIVE ACTIVITY</p>
            <h2>Recent bookings</h2>
          </div>
          <Link to="/reservations">All bookings</Link>
        </div>
        <div className="mine-list">
          {activity.length === 0 ? <p className="reserve-status">No reservations yet.</p> : null}
          {activity.map((row) => (
            <article key={row.reservationId} className="mine-card">
              <strong>{stationTitle(stations.find((item) => item.stationId === row.stationId), row.stationId)}</strong>
              <span>{utcDateLabel(row.scheduledAtUtc)}</span>
              <span>{utcTimeLabel(row.scheduledAtUtc)} UTC</span>
              <StatusBadge value={row.status} />
              <Link className="mine-link" to={`/reservations/${row.reservationId}`}>View details</Link>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
