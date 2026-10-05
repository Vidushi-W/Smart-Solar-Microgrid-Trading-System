// Completed reservations are the only existing persistent transfer read source.
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import PageHeader from "../../components/common/PageHeader";
import StatusBadge from "../../components/common/StatusBadge";
import ApiFailure from "../../components/common/ApiFailure";
import DataTable from "../../components/tables/DataTable";
import { useAuth } from "../../context/AuthContext";
import { fetchReservations } from "../../services/reservationsApi";
import { formatTimeRange } from "../../utils/format";

export default function TransactionsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reload, setReload] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError(null);
    fetchReservations(user, { status: "Completed", q: query }, controller.signal).then(setRows)
      .catch((e) => { if (e.name !== "AbortError") { setRows([]); setError(e); } })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [user.id, user.role, query, reload]);
  return <div className="page">
    <PageHeader title="Completed transfers" description="Completed reservations from the reservation API." />
    <section className="filter-card"><label>Reservation, station, or prosumer<input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search" /></label></section>
    <ApiFailure error={error} onRetry={() => setReload((n) => n + 1)} />
    {loading ? <p role="status">Loading completed reservations…</p> : !error ? <DataTable rows={rows} rowKey={(r) => r.id}
      onRowClick={(r) => navigate(`/transactions/${encodeURIComponent(r.id)}`)} emptyTitle="No completed reservations"
      columns={[
        { key: "code", label: "Reservation" }, { key: "prosumerName", label: "Prosumer" }, { key: "stationName", label: "Station" },
        { key: "window", label: "Reservation window", render: (r) => formatTimeRange(r.start, r.end) },
        { key: "energyKwh", label: "Energy (kWh)" }, { key: "status", label: "Status", render: (r) => <StatusBadge value={r.status} /> },
      ]} /> : null}
    <p className="hint">Token history and completion audit are unavailable through the existing read API.</p>
  </div>;
}
