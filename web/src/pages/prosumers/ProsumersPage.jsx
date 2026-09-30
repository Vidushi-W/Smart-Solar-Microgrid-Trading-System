import { useEffect, useMemo, useState } from "react";
import DataTable from "../../components/tables/DataTable";
import StatusBadge from "../../components/common/StatusBadge";
import { useAuth } from "../../context/AuthContext";
import { fetchProsumers } from "../../services/prosumersApi";

export default function ProsumersPage() {
  const { user } = useAuth();
  const [prosumers, setProsumers] = useState([]);
  const [filter, setFilter] = useState("All");
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    fetchProsumers(user)
      .then((rows) => {
        if (active) setProsumers(rows);
      })
      .catch((reason) => {
        if (!active) return;
        setProsumers([]);
        setError(reason.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [user.id]);

  const rows = useMemo(() => {
    return prosumers.filter((person) => {
      if (query && !person.name.toLowerCase().includes(query.toLowerCase())) return false;
      if (filter !== "All" && person.status !== filter) return false;
      return true;
    });
  }, [prosumers, filter, query]);

  return (
    <div className="page">
      <section className="stat-grid">
        <article className="stat-card">
          <span className="stat-icon amber">P</span>
          <div>
            <span>Pending</span>
            <strong>{prosumers.filter((item) => item.status === "Pending").length}</strong>
          </div>
        </article>
        <article className="stat-card">
          <span className="stat-icon green">A</span>
          <div>
            <span>Active</span>
            <strong>{prosumers.filter((item) => item.status === "Active").length}</strong>
          </div>
        </article>
      </section>
      {error ? <p className="form-error">{error}</p> : null}
      <section className="filter-card">
        <header className="panel-head">
          <h2>Search and filters</h2>
        </header>
        <div className="filter-grid">
          <label>
            Name
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search" />
          </label>
          <label>
            Status
            <select value={filter} onChange={(event) => setFilter(event.target.value)}>
              <option value="All">All status</option>
              <option value="Pending">Pending</option>
              <option value="Active">Active</option>
            </select>
          </label>
        </div>
      </section>
      <DataTable
        rowKey={(row) => row.id}
        rows={rows}
        emptyTitle={loading ? "Loading prosumers" : "No prosumers stored"}
        emptyText={loading ? "Reading the prosumer records." : "MongoDB has no prosumer records for this filter."}
        columns={[
          { key: "name", label: "Name" },
          { key: "status", label: "Status", render: (row) => <StatusBadge value={row.status} /> },
        ]}
      />
    </div>
  );
}
