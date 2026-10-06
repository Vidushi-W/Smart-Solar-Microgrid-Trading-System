/**
 * Prosumer reservation list. Rows come from GET /api/reservations/my. Search and tabs only narrow that response.
 */
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import PageHeader from "../../components/common/PageHeader";
import StatusBadge from "../../components/common/StatusBadge";
import { fetchMyReservations, listStationsForReservations } from "../../services/apiClient";
import {
  HISTORY_STATUSES,
  UPCOMING_STATUSES,
  stationTitle,
  utcDateLabel,
  utcTimeLabel,
} from "./reservationTime";

export default function MyReservationsPage() {
  const [rows, setRows] = useState([]);
  const [stations, setStations] = useState([]);
  const [tab, setTab] = useState("upcoming");
  const [status, setStatus] = useState("All");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    Promise.all([fetchMyReservations(), listStationsForReservations()])
      .then(([reservations, stationRows]) => {
        if (!active) return;
        setRows(Array.isArray(reservations) ? reservations : []);
        setStations(Array.isArray(stationRows) ? stationRows : []);
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
  }, []);

  const stationById = useMemo(() => {
    const map = new Map();
    stations.forEach((station) => map.set(station.stationId, station));
    return map;
  }, [stations]);

  const statuses = tab === "upcoming" ? UPCOMING_STATUSES : HISTORY_STATUSES;
  const visible = rows.filter((row) => {
    if (!statuses.includes(row.status)) return false;
    if (status !== "All" && row.status !== status) return false;
    const needle = query.trim().toLowerCase();
    if (!needle) return true;
    const station = stationTitle(stationById.get(row.stationId), row.stationId);
    const haystack = [row.reservationId, row.stationId, row.slotId, station, row.status, utcDateLabel(row.scheduledAtUtc), utcTimeLabel(row.scheduledAtUtc)]
      .join(" ")
      .toLowerCase();
    return haystack.includes(needle);
  });

  function chooseTab(next) {
    setTab(next);
    setStatus("All");
  }

  return (
    <div className="page mine">
      <PageHeader
        eyebrow="Reservations"
        title="My reservations"
        actions={<Link className="btn primary" to="/reservations/new">Reserve Energy Slot</Link>}
      />

      <div className="mine-toolbar">
        <div className="mine-tabs" role="tablist">
          <button type="button" className={tab === "upcoming" ? "mine-tab current" : "mine-tab"} onClick={() => chooseTab("upcoming")}>
            Upcoming
          </button>
          <button type="button" className={tab === "history" ? "mine-tab current" : "mine-tab"} onClick={() => chooseTab("history")}>
            History
          </button>
        </div>
        <input
          className="mine-search"
          type="search"
          value={query}
          placeholder="Search"
          aria-label="Search reservations"
          onChange={(event) => setQuery(event.target.value)}
        />
        <select className="mine-filter" aria-label="Filter by status" value={status} onChange={(event) => setStatus(event.target.value)}>
          <option value="All">All statuses</option>
          {statuses.map((item) => (
            <option key={item} value={item}>{item}</option>
          ))}
        </select>
      </div>

      {error ? <p className="reserve-alert">{error}</p> : null}
      {loading ? <p className="reserve-status">Loading reservations</p> : null}
      {!loading && !error && visible.length === 0 ? (
        <p className="reserve-status">No reservations in this view.</p>
      ) : null}

      <div className="mine-list">
        {visible.map((row) => (
          <article key={row.reservationId} className="mine-card">
            <strong>{stationTitle(stationById.get(row.stationId), row.stationId)}</strong>
            <span>{utcDateLabel(row.scheduledAtUtc)}</span>
            <span>{utcTimeLabel(row.scheduledAtUtc)}</span>
            <StatusBadge value={row.status} />
            <Link className="mine-link" to={`/reservations/${row.reservationId}`}>View details</Link>
          </article>
        ))}
      </div>
    </div>
  );
}
