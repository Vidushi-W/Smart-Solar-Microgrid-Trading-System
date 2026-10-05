/**
 * Reservation list. Prosumers see their own rows. Staff see every reservation from GET /api/reservations.
 */
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import PageHeader from "../../components/common/PageHeader";
import StatusBadge from "../../components/common/StatusBadge";
import { useAuth } from "../../context/AuthContext";
import { fetchAllReservations, fetchProsumerAccounts, listStationsForReservations } from "../../services/apiClient";
import MyReservationsPage from "./MyReservationsPage";
import { stationTitle, utcDateInput, utcDateLabel, utcTimeLabel } from "./reservationTime";

const STATUSES = ["Pending", "Approved", "Completed", "Cancelled"];

export default function ReservationsPage() {
  const { user } = useAuth();
  if (user.role === "Prosumer") return <MyReservationsPage />;
  return <StaffReservationsPage />;
}

function StaffReservationsPage() {
  const { user } = useAuth();
  const [rows, setRows] = useState([]);
  const [stations, setStations] = useState([]);
  const [prosumers, setProsumers] = useState([]);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("All");
  const [date, setDate] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    const prosumerLoad = user.role === "Backoffice"
      ? fetchProsumerAccounts().catch(() => [])
      : Promise.resolve([]);
    Promise.all([fetchAllReservations(), listStationsForReservations(), prosumerLoad])
      .then(([reservations, stationRows, prosumerRows]) => {
        if (!active) return;
        setRows(Array.isArray(reservations) ? reservations : []);
        setStations(Array.isArray(stationRows) ? stationRows : []);
        setProsumers(Array.isArray(prosumerRows) ? prosumerRows : []);
      })
      .catch((reason) => {
        if (!active) return;
        setRows([]);
        setError(reason.message || "Could not load reservations.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [user.role]);

  const stationById = useMemo(() => {
    const map = new Map();
    stations.forEach((station) => map.set(station.stationId, station));
    return map;
  }, [stations]);

  const prosumerById = useMemo(() => {
    const map = new Map();
    prosumers.forEach((prosumer) => map.set(prosumer.id, prosumer.name || prosumer.id));
    return map;
  }, [prosumers]);

  const visible = rows.filter((row) => {
    if (status !== "All" && row.status !== status) return false;
    if (date && utcDateInput(row.scheduledAtUtc) !== date) return false;
    const needle = query.trim().toLowerCase();
    if (!needle) return true;
    const prosumer = prosumerById.get(row.prosumerId) || row.prosumerId;
    const station = stationTitle(stationById.get(row.stationId), row.stationId);
    const haystack = [
      row.reservationId,
      row.prosumerId,
      prosumer,
      row.stationId,
      station,
      row.status,
      utcDateLabel(row.scheduledAtUtc),
      utcTimeLabel(row.scheduledAtUtc),
    ].join(" ").toLowerCase();
    return haystack.includes(needle);
  });

  return (
    <div className="page staff-reserve">
      <PageHeader eyebrow="Reservations" title="Reservations" />

      {error ? <p className="reserve-alert">{error}</p> : null}

      <section className="account-directory">
        <div className="directory-toolbar">
          <div>
            <span>RESERVATIONS</span>
            <strong>{loading ? "Loading" : `${visible.length} records`}</strong>
          </div>
          <div className="directory-filters">
            <input
              type="search"
              value={query}
              placeholder="Search"
              aria-label="Search reservations"
              onChange={(event) => setQuery(event.target.value)}
            />
            <select aria-label="Filter by status" value={status} onChange={(event) => setStatus(event.target.value)}>
              <option value="All">All statuses</option>
              {STATUSES.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
            <input
              type="date"
              value={date}
              aria-label="Filter by date"
              onChange={(event) => setDate(event.target.value)}
            />
          </div>
        </div>
        <div className="table-wrap">
          <table className="account-table">
            <thead>
              <tr>
                <th>Prosumer</th>
                <th>Station</th>
                <th>Date/time</th>
                <th>Status</th>
                <th>View Details</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((row) => (
                <tr key={row.reservationId}>
                  <td>{prosumerById.get(row.prosumerId) || row.prosumerId}</td>
                  <td>{stationTitle(stationById.get(row.stationId), row.stationId)}</td>
                  <td>{utcDateLabel(row.scheduledAtUtc)} · {utcTimeLabel(row.scheduledAtUtc)} UTC</td>
                  <td><StatusBadge value={row.status} /></td>
                  <td><Link to={`/reservations/${row.reservationId}`}>View details</Link></td>
                </tr>
              ))}
              {!loading && visible.length === 0 ? (
                <tr>
                  <td colSpan={5} className="table-empty">No reservations match this view.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
