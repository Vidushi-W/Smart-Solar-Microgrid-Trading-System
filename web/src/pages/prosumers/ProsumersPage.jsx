import { useMemo, useState } from "react";
import DataTable from "../../components/tables/DataTable";
import StatusBadge from "../../components/common/StatusBadge";
import { useData } from "../../context/DataContext";
import { formatDateTime } from "../../utils/format";

export default function ProsumersPage() {
  const { prosumers, setProsumerStatus } = useData();
  const [filter, setFilter] = useState("All");
  const [query, setQuery] = useState("");

  const rows = useMemo(() => {
    return prosumers.filter((person) => {
      const hay = `${person.name} ${person.nic} ${person.email}`.toLowerCase();
      if (query && !hay.includes(query.toLowerCase())) return false;
      if (filter !== "All" && person.status !== filter) return false;
      return true;
    });
  }, [prosumers, filter, query]);

  function actionFor(person) {
    if (person.status === "Pending") return { label: "Activate", status: "Active" };
    if (person.status === "Deactivated") return { label: "Reactivate", status: "Active" };
    return { label: "Deactivate", status: "Deactivated" };
  }

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
        <article className="stat-card">
          <span className="stat-icon rose">D</span>
          <div>
            <span>Deactivated</span>
            <strong>{prosumers.filter((item) => item.status === "Deactivated").length}</strong>
          </div>
        </article>
      </section>
      <section className="filter-card">
        <header className="panel-head">
          <h2>Search and filters</h2>
        </header>
        <div className="filter-grid">
          <label>
            Name, NIC, or email
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search" />
          </label>
          <label>
            Status
            <select value={filter} onChange={(event) => setFilter(event.target.value)}>
              <option value="All">All status</option>
              <option value="Pending">Pending</option>
              <option value="Active">Active</option>
              <option value="Deactivated">Deactivated</option>
            </select>
          </label>
        </div>
      </section>
      <DataTable
        rowKey={(row) => row.id}
        rows={rows}
        emptyTitle="No prosumers match"
        columns={[
          { key: "name", label: "Name" },
          { key: "nic", label: "NIC" },
          { key: "email", label: "Email" },
          { key: "phone", label: "Phone" },
          { key: "registered", label: "Registered", render: (row) => formatDateTime(row.registeredAt) },
          { key: "status", label: "Status", render: (row) => <StatusBadge value={row.status} /> },
          {
            key: "action",
            label: "Action",
            render: (row) => {
              const action = actionFor(row);
              return (
                <button type="button" className="btn ghost" onClick={() => setProsumerStatus(row.id, action.status)}>
                  {action.label}
                </button>
              );
            },
          },
        ]}
      />
    </div>
  );
}
