import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { getUsers, updateUserStatus } from "../../services/userService";

export default function AccountUsersPage() {
  const [users, setUsers] = useState([]);
  const [query, setQuery] = useState("");
  const [role, setRole] = useState("All");
  const [status, setStatus] = useState("All");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try { setUsers(await getUsers()); }
    catch (reason) { setError(reason.message); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  const rows = useMemo(() => users.filter((item) => {
    const search = `${item.name} ${item.username} ${item.email}`.toLowerCase();
    return (!query || search.includes(query.toLowerCase()))
      && (role === "All" || item.role === role)
      && (status === "All" || (status === "Active" ? item.isActive : !item.isActive));
  }), [users, query, role, status]);

  async function toggleStatus(account) {
    setBusyId(account.id);
    setError("");
    try {
      await updateUserStatus(account.id, !account.isActive);
      await load();
    } catch (reason) { setError(reason.message); }
    finally { setBusyId(""); }
  }

  return (
    <div className="page account-page">
      <header className="account-page-head">
        <div><p className="eyebrow">Backoffice · directory</p><h1>User management</h1><p className="lede">Manage staff access for Backoffice and Grid Operator roles.</p></div>
        <Link className="btn primary" to="/users/new">+ Create user</Link>
      </header>
      <section className="account-metrics compact-metrics">
        <article><span>TOTAL STAFF</span><strong>{loading ? "—" : users.length}</strong></article>
        <article><span>ACTIVE</span><strong>{loading ? "—" : users.filter((item) => item.isActive).length}</strong></article>
        <article><span>INACTIVE</span><strong>{loading ? "—" : users.filter((item) => !item.isActive).length}</strong></article>
      </section>
      {error ? <p className="form-error" role="alert">{error}</p> : null}
      <section className="account-directory">
        <div className="directory-toolbar">
          <div><span>STAFF DIRECTORY</span><strong>{loading ? "Loading…" : `${rows.length} records`}</strong></div>
          <div className="directory-filters">
            <label className="visually-hidden" htmlFor="user-search">Search users</label>
            <input id="user-search" type="search" placeholder="Search name, username, email" value={query} onChange={(event) => setQuery(event.target.value)} />
            <label className="visually-hidden" htmlFor="user-role">Filter by role</label>
            <select id="user-role" value={role} onChange={(event) => setRole(event.target.value)}><option value="All">All roles</option><option value="Backoffice">Backoffice</option><option value="GridOperator">Grid Operator</option></select>
            <label className="visually-hidden" htmlFor="user-status">Filter by status</label>
            <select id="user-status" value={status} onChange={(event) => setStatus(event.target.value)}><option value="All">All status</option><option value="Active">Active</option><option value="Inactive">Inactive</option></select>
          </div>
        </div>
        <div className="table-wrap">
          <table className="account-table">
            <thead><tr><th>Name</th><th>Username</th><th>Role</th><th>Contact</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {rows.map((account) => (
                <tr key={account.id}>
                  <td><strong>{account.name}</strong><small>{account.email}</small></td>
                  <td>{account.username}</td>
                  <td>{account.role === "GridOperator" ? "Grid Operator" : account.role}</td>
                  <td>{account.contactNumber || "—"}</td>
                  <td><span className={`status-chip ${account.isActive ? "active" : "off"}`}>{account.isActive ? "Active" : "Inactive"}</span></td>
                  <td><div className="table-actions"><Link to={`/users/${encodeURIComponent(account.id)}/edit`}>Edit</Link><button type="button" onClick={() => toggleStatus(account)} disabled={busyId === account.id}>{busyId === account.id ? "Updating…" : account.isActive ? "Deactivate" : "Activate"}</button></div></td>
                </tr>
              ))}
              {!loading && rows.length === 0 ? <tr><td colSpan={6} className="table-empty">No staff accounts match those filters.</td></tr> : null}
              {loading ? <tr><td colSpan={6} className="table-empty">Loading staff records…</td></tr> : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}