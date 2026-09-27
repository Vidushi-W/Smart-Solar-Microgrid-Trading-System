import { useMemo, useState } from "react";
import DataTable from "../../components/tables/DataTable";
import StatusBadge from "../../components/common/StatusBadge";
import { ROLE_LABELS } from "../../constants/roles";
import { useAuth } from "../../context/AuthContext";
import { useData } from "../../context/DataContext";

export default function UsersPage() {
  const { user } = useAuth();
  const { users, addStaffUser, setUserStatus } = useData();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("GridOperator");
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");

  const rows = useMemo(() => {
    return users.filter((account) => {
      const hay = `${account.name} ${account.email}`.toLowerCase();
      if (query && !hay.includes(query.toLowerCase())) return false;
      if (roleFilter !== "All" && account.role !== roleFilter) return false;
      if (statusFilter !== "All" && account.status !== statusFilter) return false;
      return true;
    });
  }, [users, query, roleFilter, statusFilter]);

  function submit(event) {
    event.preventDefault();
    addStaffUser({ name, email, role });
    setName("");
    setEmail("");
  }

  return (
    <div className="page">
      <section className="stat-grid">
        <article className="stat-card">
          <span className="stat-icon violet">All</span>
          <div>
            <span>Total users</span>
            <strong>{users.length}</strong>
          </div>
        </article>
        <article className="stat-card">
          <span className="stat-icon green">On</span>
          <div>
            <span>Active</span>
            <strong>{users.filter((item) => item.status === "Active").length}</strong>
          </div>
        </article>
        <article className="stat-card">
          <span className="stat-icon rose">Off</span>
          <div>
            <span>Deactivated</span>
            <strong>{users.filter((item) => item.status === "Deactivated").length}</strong>
          </div>
        </article>
      </section>

      <section className="filter-card">
        <header className="panel-head">
          <h2>Search and filters</h2>
        </header>
        <div className="filter-grid">
          <label>
            Name or email
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search" />
          </label>
          <label>
            Role
            <select value={roleFilter} onChange={(event) => setRoleFilter(event.target.value)}>
              <option value="All">All roles</option>
              <option value="Backoffice">Backoffice Officer</option>
              <option value="GridOperator">Grid Operator</option>
            </select>
          </label>
          <label>
            Status
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              <option value="All">All status</option>
              <option value="Active">Active</option>
              <option value="Deactivated">Deactivated</option>
            </select>
          </label>
        </div>
        <form className="filter-grid add-row" onSubmit={submit}>
          <label>
            Full name
            <input value={name} onChange={(event) => setName(event.target.value)} required />
          </label>
          <label>
            Email
            <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
          </label>
          <label>
            Role
            <select value={role} onChange={(event) => setRole(event.target.value)}>
              <option value="Backoffice">Backoffice Officer</option>
              <option value="GridOperator">Grid Operator</option>
            </select>
          </label>
          <button type="submit" className="btn primary">
            Add user
          </button>
        </form>
      </section>

      <DataTable
        rowKey={(row) => row.id}
        rows={rows}
        emptyTitle="No users match"
        columns={[
          { key: "name", label: "Name" },
          { key: "email", label: "Email" },
          { key: "role", label: "Role", render: (row) => ROLE_LABELS[row.role] || row.role },
          { key: "status", label: "Status", render: (row) => <StatusBadge value={row.status} /> },
          {
            key: "action",
            label: "Action",
            render: (row) => (
              <button
                type="button"
                className="btn ghost"
                onClick={(event) => {
                  event.stopPropagation();
                  setUserStatus(row.id, row.status === "Active" ? "Deactivated" : "Active", user);
                }}
              >
                {row.status === "Active" ? "Deactivate" : "Reactivate"}
              </button>
            ),
          },
        ]}
      />
    </div>
  );
}
