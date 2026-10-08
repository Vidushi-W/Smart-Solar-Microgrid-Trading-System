/**
 * Backoffice list of users returned by the account API.
 */
import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { getUsers, updateUserStatus } from "../../services/userService";

export default function AccountUsersPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [query, setQuery] = useState("");
  const [role, setRole] = useState("All");
  const [status, setStatus] = useState("All");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState(location.state?.notice || "");

  async function load() {
    setLoading(true);
    setError("");
    try { setUsers(await getUsers()); }
    catch (reason) { setError(reason.message); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  // Drop a one-time notice from navigation state so a refresh does not show it again.
  useEffect(() => {
    if (location.state?.notice) navigate(location.pathname, { replace: true, state: null });
  }, [location.pathname, location.state, navigate]);

  // Pending includes PendingActivation and Registered. The Approved filter matches account status Active.
  const rows = useMemo(() => users.filter((item) => {
    const search = `${item.id} ${item.name} ${item.username} ${item.email} ${item.nic}`.toLowerCase();
    const accountStatus = item.accountStatus || (item.isActive ? "Active" : "Deactivated");
    const matchesStatus = status === "All"
      || (status === "Active" && item.isActive)
      || (status === "Inactive" && !item.isActive)
      || (status === "Pending" && ["PendingActivation", "Registered"].includes(accountStatus))
      || (status === "Approved" && accountStatus === "Active")
      || (status === "Deactivated" && accountStatus === "Deactivated")
      || (status === "DeactivationRequested" && accountStatus === "DeactivationRequested");
    return (!query || search.includes(query.toLowerCase()))
      && (role === "All" || item.role === role)
      && matchesStatus;
  }), [users, query, role, status]);

  async function toggleStatus(account) {
    setBusyId(account.id);
    setError("");
    setNotice("");
    try {
      await updateUserStatus(account.id, !account.isActive);
      await load();
      setNotice(`${account.name}'s account is now ${account.isActive ? "inactive" : "active"}.`);
    } catch (reason) { setError(reason.message); }
    finally { setBusyId(""); }
  }

  return (
    <div className="page account-page">
      <Link to="/dashboard" className="back-link">← Back to dashboard</Link>
      <header className="account-page-head">
        <div><p className="eyebrow">Backoffice · directory</p><h1>User management</h1><p className="lede">Search and manage Backoffice, Grid Operator, and Prosumer accounts.</p></div>
        <Link className="btn primary" to="/users/new">+ Create user</Link>
      </header>
      <section className="account-metrics compact-metrics">
        <article><span>TOTAL USERS</span><strong>{loading ? "—" : users.length}</strong></article>
        <article><span>ACTIVE</span><strong>{loading ? "—" : users.filter((item) => item.isActive).length}</strong></article>
        <article><span>INACTIVE / PENDING</span><strong>{loading ? "—" : users.filter((item) => !item.isActive).length}</strong></article>
      </section>
      {error ? <p className="form-error" role="alert">{error}</p> : null}
      {notice ? <p className="form-success" role="status">{notice}</p> : null}
      <section className="account-directory">
        <div className="directory-toolbar">
          <div><span>USER DIRECTORY</span><strong>{loading ? "Loading…" : `${rows.length} records`}</strong></div>
          <div className="directory-filters">
            <label className="visually-hidden" htmlFor="user-search">Search users</label>
            <input id="user-search" type="search" placeholder="Search name, username, email, NIC, or ID" value={query} onChange={(event) => setQuery(event.target.value)} />
            <label className="visually-hidden" htmlFor="user-role">Filter by role</label>
            <select id="user-role" value={role} onChange={(event) => setRole(event.target.value)}><option value="All">All roles</option><option value="Backoffice">Backoffice</option><option value="GridOperator">Grid Operator</option><option value="Prosumer">Prosumer</option></select>
            <label className="visually-hidden" htmlFor="user-status">Filter by status</label>
            <select id="user-status" value={status} onChange={(event) => setStatus(event.target.value)}><option value="All">All statuses</option><option value="Active">Active</option><option value="Inactive">Inactive</option><option value="Pending">Pending</option><option value="Approved">Approved</option><option value="DeactivationRequested">Deactivation requested</option><option value="Deactivated">Deactivated</option></select>
          </div>
        </div>
        <div className="table-wrap">
          <table className="account-table">
            <thead><tr><th>User</th><th>User ID</th><th>Username</th><th>Phone</th><th>Role</th><th>Status</th><th>Created</th><th>Actions</th></tr></thead>
            <tbody>
              {rows.map((account) => (
                <tr key={account.id}>
                  <td><div className="user-account-cell"><span className="user-avatar" aria-label={`Default avatar for ${account.name}`}>{(account.name || "?").slice(0, 1).toUpperCase()}</span><div><strong>{account.name}</strong><small>{account.email}</small></div></div></td>
                  <td><Link to={`/users/${encodeURIComponent(account.id)}`} className="user-id-link">{account.id}</Link></td>
                  <td>{account.username}</td>
                  <td>{account.contactNumber || "—"}</td>
                  <td>{account.role === "GridOperator" ? "Grid Operator" : account.role}</td>
                  <td><span className={`status-chip ${account.isActive ? "active" : account.accountStatus === "DeactivationRequested" ? "warning" : account.accountStatus === "PendingActivation" || account.accountStatus === "Registered" ? "pending" : "off"}`}>{account.accountStatus || (account.isActive ? "Active" : "Inactive")}</span></td>
                  <td>{account.createdAtUtc ? new Date(account.createdAtUtc).toLocaleDateString() : "—"}</td>
                  <td><div className="table-actions">
                    <Link to={`/users/${encodeURIComponent(account.id)}`}>Details</Link>
                    <Link to={`/users/${encodeURIComponent(account.id)}/profile`}>Profile</Link>
                    {account.role !== "Prosumer" ? <Link to={`/users/${encodeURIComponent(account.id)}/edit`}>Edit</Link> : ["PendingActivation", "Registered", "DeactivationRequested", "Deactivated"].includes(account.accountStatus) ? <Link to={`/prosumers/${account.accountStatus === "Deactivated" ? "deactivated" : "pending"}`}>Manage</Link> : null}
                    {account.role !== "Prosumer" ? <button type="button" onClick={() => toggleStatus(account)} disabled={busyId === account.id}>{busyId === account.id ? "Updating…" : account.isActive ? "Deactivate" : "Activate"}</button> : null}
                  </div></td>
                </tr>
              ))}
              {!loading && rows.length === 0 ? <tr><td colSpan={8} className="table-empty">No user accounts match those filters.</td></tr> : null}
              {loading ? <tr><td colSpan={8} className="table-empty">Loading user records…</td></tr> : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}