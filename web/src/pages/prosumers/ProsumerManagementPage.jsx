import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  activateProsumer,
  deactivateProsumer,
  getProsumers,
  reactivateProsumer,
  requestProsumerDeactivationByBackoffice,
} from "../../services/userService";

const statusFilters = [
  ["All", "All statuses"],
  ["Active", "Active"],
  ["PendingActivation", "Pending"],
  ["Deactivated", "Deactivated"],
  ["DeactivationRequested", "Deactivation requested"],
];

export default function ProsumerManagementPage() {
  const [prosumers, setProsumers] = useState([]);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("All");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      setProsumers(await getProsumers());
    } catch (reason) {
      setProsumers([]);
      setError(reason.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const rows = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return prosumers.filter((prosumer) => {
      const searchable = `${prosumer.nic} ${prosumer.name} ${prosumer.email} ${prosumer.contactNumber}`.toLowerCase();
      const matchesStatus = status === "All"
        || prosumer.accountStatus === status
        || (status === "PendingActivation" && prosumer.accountStatus === "Registered");
      return (!normalizedQuery || searchable.includes(normalizedQuery)) && matchesStatus;
    });
  }, [prosumers, query, status]);

  async function processAction(prosumer) {
    setBusyId(prosumer.id);
    setError("");
    setNotice("");
    try {
      let message;
      if (prosumer.accountStatus === "PendingActivation" || prosumer.accountStatus === "Registered") {
        await activateProsumer(prosumer.nic);
        message = `${prosumer.name}'s account was activated.`;
      } else if (prosumer.accountStatus === "DeactivationRequested") {
        await deactivateProsumer(prosumer.nic);
        message = `${prosumer.name}'s deactivation request was processed.`;
      } else if (prosumer.accountStatus === "Deactivated") {
        await reactivateProsumer(prosumer.nic);
        message = `${prosumer.name}'s account was reactivated.`;
      } else {
        await requestProsumerDeactivationByBackoffice(prosumer.nic);
        message = `${prosumer.name}'s account is pending deactivation.`;
      }
      await load();
      setNotice(message);
    } catch (reason) {
      setError(reason.message);
    } finally {
      setBusyId("");
    }
  }

  function actionLabel(prosumer) {
    if (prosumer.accountStatus === "PendingActivation" || prosumer.accountStatus === "Registered") return "Activate";
    if (prosumer.accountStatus === "DeactivationRequested") return "Process deactivation";
    if (prosumer.accountStatus === "Deactivated") return "Reactivate";
    return "Request deactivation";
  }

  return (
    <div className="page account-page">
      <Link to="/dashboard" className="back-link">← Back to dashboard</Link>
      <header className="account-page-head">
        <div>
          <p className="eyebrow">Backoffice · account administration</p>
          <h1>Prosumer Management</h1>
          <p className="lede">Manage Prosumer profiles and account lifecycle by NIC. Station records are managed separately.</p>
        </div>
        <nav className="account-tabs" aria-label="Prosumer account views">
          <Link className="selected" to="/prosumers">All prosumers</Link>
          <Link to="/prosumers/pending">Pending activations</Link>
          <Link to="/prosumers/deactivated">Deactivated</Link>
        </nav>
      </header>
      <section className="account-metrics compact-metrics" aria-label="Prosumer account totals">
        <article><span>TOTAL PROSUMERS</span><strong>{loading ? "—" : prosumers.length}</strong></article>
        <article><span>ACTIVE</span><strong>{loading ? "—" : prosumers.filter((item) => item.accountStatus === "Active").length}</strong></article>
        <article><span>PENDING ACTIONS</span><strong>{loading ? "—" : prosumers.filter((item) => ["PendingActivation", "Registered", "DeactivationRequested"].includes(item.accountStatus)).length}</strong></article>
      </section>
      {error ? <p className="form-error" role="alert">{error}</p> : null}
      {notice ? <p className="form-success" role="status">{notice}</p> : null}
      <section className="account-directory">
        <div className="directory-toolbar">
          <div><span>PROSUMER ACCOUNTS</span><strong>{loading ? "Loading…" : `${rows.length} records`}</strong></div>
          <div className="directory-filters">
            <label className="visually-hidden" htmlFor="prosumer-search">Search prosumers</label>
            <input id="prosumer-search" type="search" placeholder="Search NIC, name, email, or phone" value={query} onChange={(event) => setQuery(event.target.value)} />
            <label className="visually-hidden" htmlFor="prosumer-status">Filter prosumers by status</label>
            <select id="prosumer-status" value={status} onChange={(event) => setStatus(event.target.value)}>
              {statusFilters.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </div>
        </div>
        <div className="table-wrap">
          <table className="account-table prosumer-table">
            <thead><tr><th>Prosumer</th><th>NIC</th><th>Phone</th><th>Address</th><th>Status</th><th>Registered</th><th>Actions</th></tr></thead>
            <tbody>
              {rows.map((prosumer) => (
                <tr key={prosumer.id}>
                  <td><div className="user-account-cell"><span className="user-avatar" aria-label={`Default avatar for ${prosumer.name}`}>{(prosumer.name || "?").slice(0, 1).toUpperCase()}</span><div><strong>{prosumer.name}</strong><small>{prosumer.email}</small></div></div></td>
                  <td>{prosumer.nic || prosumer.username}</td>
                  <td>{prosumer.contactNumber || "—"}</td>
                  <td>{prosumer.address || "—"}</td>
                  <td><span className={`status-chip ${prosumer.accountStatus === "Active" ? "active" : prosumer.accountStatus === "DeactivationRequested" ? "warning" : prosumer.accountStatus === "PendingActivation" || prosumer.accountStatus === "Registered" ? "pending" : "off"}`}>{prosumer.accountStatus}</span></td>
                  <td>{prosumer.createdAtUtc ? new Date(prosumer.createdAtUtc).toLocaleDateString() : "—"}</td>
                  <td><div className="table-actions prosumer-actions">
                    <Link to={`/prosumers/${encodeURIComponent(prosumer.nic || prosumer.username)}`}>View</Link>
                    <Link to={`/prosumers/${encodeURIComponent(prosumer.nic || prosumer.username)}/edit`}>Edit</Link>
                    <button type="button" onClick={() => processAction(prosumer)} disabled={busyId === prosumer.id}>{busyId === prosumer.id ? "Updating…" : actionLabel(prosumer)}</button>
                  </div></td>
                </tr>
              ))}
              {!loading && rows.length === 0 ? <tr><td colSpan={7} className="table-empty">No prosumer accounts match those filters.</td></tr> : null}
              {loading ? <tr><td colSpan={7} className="table-empty">Loading prosumer accounts…</td></tr> : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
