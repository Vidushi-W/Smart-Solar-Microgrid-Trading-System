/**
 * Transfer monitor. Rows are approved, scheduled, and completed reservations from the reservation API.
 */
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import PageHeader from "../../components/common/PageHeader";
import ApiFailure from "../../components/common/ApiFailure";
import Modal from "../../components/common/Modal";
import StatusBadge from "../../components/common/StatusBadge";
import DataTable from "../../components/tables/DataTable";
import { useAuth } from "../../context/AuthContext";
import { fetchReservations } from "../../services/reservationsApi";
import { formatDateTime, formatTimeRange } from "../../utils/format";

const TRANSFER_STATUSES = ["Approved", "Scheduled", "Completed"];
const STATUS_FILTERS = ["All", ...TRANSFER_STATUSES];

function updatedAt(row) {
  const history = row.history || [];
  return history.length ? history[history.length - 1].at : row.start;
}

export default function TransactionsPage() {
  const { user } = useAuth();
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reload, setReload] = useState(0);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("All");
  const [selectedId, setSelectedId] = useState(null);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    fetchReservations(user, {}, controller.signal)
      .then((rows) => {
        if (!active) return;
        setReservations((rows || []).filter((row) => TRANSFER_STATUSES.includes(row.status)));
      })
      .catch((reason) => {
        if (!active) return;
        setReservations([]);
        if (reason.name !== "AbortError") setError(reason);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
      controller.abort();
    };
  }, [user, reload]);

  const rows = useMemo(() => {
    return reservations
      .filter((row) => {
        const hay = `${row.code} ${row.prosumerName} ${row.stationName}`.toLowerCase();
        if (query && !hay.includes(query.toLowerCase())) return false;
        if (status !== "All" && row.status !== status) return false;
        return true;
      })
      .sort((a, b) => new Date(updatedAt(b)) - new Date(updatedAt(a)));
  }, [reservations, query, status]);

  const selected = reservations.find((row) => row.id === selectedId) || null;

  return (
    <div className="page">
      <PageHeader title="Energy transfers" actions={<Link className="btn" to="/operational-reservations">Reservations desk</Link>} />
      <ApiFailure error={error} onRetry={() => setReload((value) => value + 1)} />
      <section className="filter-card">
        <header className="panel-head">
          <h2>Search and filters</h2>
        </header>
        <div className="filter-grid">
          <label>
            Reservation, prosumer, or station
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search" />
          </label>
          <label>
            Reservation status
            <select value={status} onChange={(event) => setStatus(event.target.value)}>
              {STATUS_FILTERS.map((item) => (
                <option key={item} value={item}>{item === "All" ? "All statuses" : item}</option>
              ))}
            </select>
          </label>
        </div>
      </section>
      <DataTable
        rowKey={(row) => row.id}
        rows={loading ? [] : rows}
        onRowClick={(row) => setSelectedId(row.id)}
        emptyTitle={loading ? "Loading transfers" : "No transfers match"}
        columns={[
          { key: "code", label: "Reservation" },
          { key: "prosumer", label: "Prosumer", render: (row) => row.prosumerName },
          { key: "station", label: "Station", render: (row) => row.stationName },
          { key: "status", label: "Status", render: (row) => <StatusBadge value={row.status} /> },
          { key: "window", label: "Window", render: (row) => formatTimeRange(row.start, row.end) },
          { key: "updated", label: "Updated", render: (row) => formatDateTime(updatedAt(row)) },
        ]}
      />
      {selected ? (
        <Modal title={selected.code} wide onClose={() => setSelectedId(null)}>
          <div className="transfer-dialog">
            <p className="transfer-updated">Updated {formatDateTime(updatedAt(selected))}</p>
            <section>
              <h3>Reservation</h3>
              <dl>
                <div><dt>Code</dt><dd>{selected.code}</dd></div>
                <div><dt>Status</dt><dd><StatusBadge value={selected.status} /></dd></div>
                <div><dt>Prosumer</dt><dd>{selected.prosumerName}</dd></div>
                <div><dt>Station</dt><dd>{selected.stationName}</dd></div>
                <div><dt>Slot</dt><dd>{selected.slotLabel}</dd></div>
                <div><dt>Window</dt><dd>{formatTimeRange(selected.start, selected.end)}</dd></div>
                <div><dt>Service</dt><dd>{selected.serviceType}</dd></div>
                <div><dt>Energy</dt><dd>{selected.energyKwh} kWh</dd></div>
              </dl>
            </section>
            <div className="modal-actions">
              <Link className="btn" to={`/operational-reservations/${encodeURIComponent(selected.id)}`}>Open reservation</Link>
              <Link className="btn" to={`/transactions/${encodeURIComponent(selected.id)}`}>Open transfer</Link>
              <button type="button" className="btn primary" onClick={() => setSelectedId(null)}>Close</button>
            </div>
          </div>
        </Modal>
      ) : null}
    </div>
  );
}
