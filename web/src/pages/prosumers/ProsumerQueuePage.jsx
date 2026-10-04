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

  async function process(row) {
    setBusyId(row.id);
    setError("");
    setNotice("");
    try {
      if (deactivatedMode) await reactivateProsumer(row.id);
      else if (row.accountStatus === "DeactivationRequested") await deactivateProsumer(row.id);
      else await activateProsumer(row.id);
      setNotice(deactivatedMode ? `${row.name} was reactivated.` : `${row.name}'s account status was updated.`);
      await load();
    } catch (reason) {
      setError(reason.message);
    } finally {
      setBusyId("");
    }
  }

  return (
    <div className="page account-page">
      <header className="account-page-head">
        <div>
          <p className="eyebrow">Backoffice · prosumer accounts</p>
          <h1>{deactivatedMode ? "Deactivated prosumers" : "Pending activations"}</h1>
          <p className="lede">{deactivatedMode ? "Review accounts that can be returned to active status." : "Approve new registrations or process requested deactivations."}</p>
        </div>
        <nav className="account-tabs" aria-label="Prosumer account views">
          <Link className={!deactivatedMode ? "selected" : ""} to="/prosumers/pending">Pending</Link>
          <Link className={deactivatedMode ? "selected" : ""} to="/prosumers/deactivated">Deactivated</Link>
        </nav>
      </header>
      {error ? <p className="form-error" role="alert">{error}</p> : null}
      {notice ? <p className="form-success" role="status">{notice}</p> : null}
      <section className="account-table-wrap">
        <div className="account-table-heading"><span>ACCOUNT QUEUE</span><strong>{loading ? "…" : rows.length}</strong></div>
        <div className="table-wrap">
          <table className="account-table">
            <thead><tr><th>Prosumer</th><th>NIC</th><th>Contact</th><th>Account status</th><th>Registered</th><th /></tr></thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td><strong>{row.name}</strong><small>{row.email}</small></td>
                  <td>{row.username}</td>
                  <td>{row.contactNumber || "—"}</td>
                  <td><span className={`status-chip ${row.accountStatus === "DeactivationRequested" ? "warning" : deactivatedMode ? "off" : "pending"}`}>{row.accountStatus}</span></td>
                  <td>{row.createdAtUtc ? new Date(row.createdAtUtc).toLocaleDateString() : "—"}</td>
                  <td><button className="btn ghost row-button" type="button" onClick={() => process(row)} disabled={busyId === row.id}>{busyId === row.id ? "Updating…" : deactivatedMode ? "Reactivate" : row.accountStatus === "DeactivationRequested" ? "Process request" : "Activate"}</button></td>
                </tr>
              ))}
              {!loading && rows.length === 0 ? <tr><td colSpan={6} className="table-empty">{deactivatedMode ? "No deactivated prosumers." : "No prosumer accounts are awaiting action."}</td></tr> : null}
              {loading ? <tr><td colSpan={6} className="table-empty">Loading account records…</td></tr> : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}