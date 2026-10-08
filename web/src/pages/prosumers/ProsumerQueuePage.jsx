/**
 * One screen for two Backoffice queues. mode="pending" activates or processes deactivation. mode="deactivated" reactivates an account.
 */
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  activateProsumer,
  deactivateProsumer,
  getDeactivatedProsumers,
  getPendingProsumers,
  reactivateProsumer,
} from "../../services/userService";

export default function ProsumerQueuePage({ mode }) {
  const deactivatedMode = mode === "deactivated";
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [query, setQuery] = useState("");
  const [confirmation, setConfirmation] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setRows(deactivatedMode ? await getDeactivatedProsumers() : await getPendingProsumers());
    } catch (reason) {
      setRows([]);
      setError(reason.message);
    } finally {
      setLoading(false);
    }
  }, [deactivatedMode]);

  useEffect(() => { load(); }, [load]);

  const normalizedQuery = query.trim().toLowerCase();
  const visibleRows = rows.filter((row) =>
    `${row.nic || row.username} ${row.name} ${row.email}`.toLowerCase().includes(normalizedQuery));

  // DeactivationRequested is processed immediately. Activate and reactivate wait for the confirmation dialog.
  async function process(row) {
    if (deactivatedMode || row.accountStatus !== "DeactivationRequested") {
      setConfirmation({ row, action: deactivatedMode ? "reactivate" : "activate" });
      return;
    }

    setBusyId(row.id);
    setError("");
    setNotice("");
    try {
      await deactivateProsumer(row.nic || row.username);
      setNotice(deactivatedMode ? `${row.name} was reactivated.` : `${row.name}'s account status was updated.`);
      await load();
    } catch (reason) {
      setError(reason.message);
    } finally {
      setBusyId("");
    }
  }

  async function confirmAccountAction() {
    if (!confirmation) return;
    const { row, action } = confirmation;
    setConfirmation(null);
    setBusyId(row.id);
    setError("");
    setNotice("");
    try {
      if (action === "reactivate") {
        await reactivateProsumer(row.nic || row.username);
        setNotice(`${row.name}'s account was reactivated.`);
      } else {
        await activateProsumer(row.nic || row.username);
        setNotice(`${row.name}'s account was activated.`);
      }
      await load();
    } catch (reason) {
      setError(reason.message);
    } finally {
      setBusyId("");
    }
  }

  return (
    <div className="page account-page">
      <Link to="/dashboard" className="back-link">← Back to dashboard</Link>
      <header className="account-page-head">
        <div>
          <p className="eyebrow">Backoffice · prosumer accounts</p>
          <h1>{deactivatedMode ? "Deactivated prosumers" : "Pending activations"}</h1>
          <p className="lede">{deactivatedMode ? "Review accounts that can be returned to active status." : "Review Prosumer registrations and process pending account actions."}</p>
        </div>
        <nav className="account-tabs" aria-label="Prosumer account views">
          <Link className={!deactivatedMode ? "selected" : ""} to="/prosumers/pending">Pending</Link>
          <Link className={deactivatedMode ? "selected" : ""} to="/prosumers/deactivated">Deactivated</Link>
        </nav>
      </header>
      {error ? <p className="form-error" role="alert">{error}</p> : null}
      {notice ? <p className="form-success" role="status">{notice}</p> : null}
      <div className="directory-toolbar">
        <div><span>{deactivatedMode ? "SEARCH DEACTIVATED ACCOUNTS" : "SEARCH REGISTRATIONS"}</span><strong>{loading ? "Loading…" : `${visibleRows.length} records`}</strong></div>
        <div className="directory-filters">
          <label>
            <span className="visually-hidden">{deactivatedMode ? "Search deactivated prosumers by NIC, name, or email" : "Search by NIC, name, or email"}</span>
            <input type="search" placeholder="Search NIC, name, or email" value={query} onChange={(event) => setQuery(event.target.value)} />
          </label>
        </div>
      </div>
      <section className="account-table-wrap">
        <div className="account-table-heading"><span>{deactivatedMode ? "DEACTIVATED PROSUMERS" : "ACCOUNT QUEUE"}</span><strong>{loading ? "…" : rows.length}</strong></div>
        <div className="table-wrap">
          <table className="account-table">
            <thead><tr><th>Prosumer</th><th>NIC</th><th>Phone</th><th>Account status</th><th>Registered</th><th>Actions</th></tr></thead>
            <tbody>
              {visibleRows.map((row) => (
                <tr key={row.id}>
                  <td>
                    <div className="user-account-cell">
                      <span className="user-avatar" aria-label={`Default avatar for ${row.name}`}>{(row.name || "?").slice(0, 1).toUpperCase()}</span>
                      <div><strong>{row.name}</strong><small>{row.email}</small><small>{row.role}</small></div>
                    </div>
                  </td>
                  <td>{row.nic || row.username}</td>
                  <td>{row.contactNumber || "—"}</td>
                  <td><span className={`status-chip ${row.accountStatus === "DeactivationRequested" ? "warning" : deactivatedMode ? "off" : "pending"}`}>{row.accountStatus}</span></td>
                  <td>{row.createdAtUtc ? new Date(row.createdAtUtc).toLocaleDateString() : "—"}</td>
                  <td>
                    <div className="table-actions">
                      <Link to={`/prosumers/${encodeURIComponent(row.nic || row.username)}`}>View details</Link>
                      <button className="btn ghost row-button" type="button" onClick={() => process(row)} disabled={busyId === row.id}>
                        {busyId === row.id ? "Updating…" : deactivatedMode ? "Reactivate Account" : row.accountStatus === "DeactivationRequested" ? "Process request" : "Activate"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!loading && visibleRows.length === 0 ? <tr><td colSpan={6} className="table-empty">{normalizedQuery ? (deactivatedMode ? "No deactivated prosumers match that search." : "No registrations match that search.") : deactivatedMode ? "No deactivated prosumers." : "No prosumer accounts are awaiting action."}</td></tr> : null}
              {loading ? <tr><td colSpan={6} className="table-empty">Loading account records…</td></tr> : null}
            </tbody>
          </table>
        </div>
      </section>
      {confirmation ? (
        <div className="confirmation-backdrop">
          <section className="confirmation-dialog" role="alertdialog" aria-modal="true" aria-labelledby="account-confirmation-title" aria-describedby="account-confirmation-message">
            <h2 id="account-confirmation-title">{confirmation.action === "reactivate" ? "Confirm account reactivation" : "Confirm Prosumer activation"}</h2>
            <p id="account-confirmation-message">{confirmation.action === "reactivate" ? "Are you sure you want to reactivate this Prosumer account?" : "Are you sure you want to activate this Prosumer?"}</p>
            <div className="form-actions">
              <button className="btn ghost" type="button" onClick={() => setConfirmation(null)}>Cancel</button>
              <button className="btn primary" type="button" onClick={confirmAccountAction} disabled={busyId === confirmation.row.id}>{busyId === confirmation.row.id ? "Updating…" : confirmation.action === "reactivate" ? "Reactivate Account" : "Confirm activation"}</button>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}