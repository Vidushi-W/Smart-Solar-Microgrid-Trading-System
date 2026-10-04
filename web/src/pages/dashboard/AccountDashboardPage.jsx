/**
 * Home screen after login. Counts come from the account API: staff users, the pending prosumer queue, and deactivated prosumers.
 */
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { getDeactivatedProsumers, getPendingProsumers, getUsers } from "../../services/userService";

export default function AccountDashboardPage() {
  const { user } = useAuth();
  const [summary, setSummary] = useState({ users: [], pending: [], deactivated: [] });
  const [loading, setLoading] = useState(user.role === "Backoffice");
  const [error, setError] = useState("");

  useEffect(() => {
    if (user.role !== "Backoffice") return;
    let active = true;
    Promise.all([getUsers(), getPendingProsumers(), getDeactivatedProsumers()])
      .then(([users, pending, deactivated]) => {
        if (active) setSummary({ users, pending, deactivated });
      })
      .catch((reason) => active && setError(reason.message))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [user.role]);

  const firstName = (user.name || "there").trim().split(/\s+/)[0];

  return (
    <div className="page account-page dashboard-page">
      <section className="dashboard-welcome">
        <div><p className="eyebrow">{user.role === "Backoffice" ? "BACKOFFICE OVERVIEW" : "GRID OPERATIONS"}</p><h1>Good day, {firstName}.</h1><p>Powered by the sun. Coordinated by your team.</p></div>
        <div className="dashboard-date"><span>LOCAL OPERATIONS</span><strong>{new Intl.DateTimeFormat("en-LK", { weekday: "long", day: "numeric", month: "long" }).format(new Date())}</strong></div>
      </section>
      {error ? <p className="form-error" role="alert">{error}</p> : null}
      {user.role === "Backoffice" ? (
        <>
          <section className="account-metrics" aria-label="Account totals">
            <article><span>STAFF ACCOUNTS</span><strong>{loading ? "—" : summary.users.length}</strong><small>{loading ? "Syncing records" : `${summary.users.filter((item) => item.isActive).length} active`}</small></article>
            <article className="metric-hot"><span>PROSUMER ACTIONS</span><strong>{loading ? "—" : summary.pending.length}</strong><small>Activation or deactivation review</small></article>
            <article><span>DEACTIVATED</span><strong>{loading ? "—" : summary.deactivated.length}</strong><small>Accounts eligible for reactivation</small></article>
          </section>
          <section className="dashboard-workspace">
            <div className="dashboard-section-title"><div><p className="eyebrow">YOUR WORKSPACE</p><h2>Account operations</h2></div><span>LIVE FROM THE API</span></div>
            <div className="dashboard-links">
              <Link to="/users/new" className="dashboard-link primary-link"><span className="link-index">01</span><div><strong>Create a staff account</strong><small>Invite a Backoffice or Grid Operator</small></div><span className="link-arrow">↗</span></Link>
              <Link to="/users" className="dashboard-link"><span className="link-index">02</span><div><strong>Manage users</strong><small>Review access, roles and account status</small></div><span className="link-arrow">↗</span></Link>
              <Link to="/prosumers/pending" className="dashboard-link"><span className="link-index">03</span><div><strong>Review prosumers</strong><small>Activate new registrations and process requests</small></div><span className="link-arrow">↗</span></Link>
              <Link to="/prosumers/deactivated" className="dashboard-link"><span className="link-index">04</span><div><strong>Reactivation queue</strong><small>Restore eligible prosumer accounts</small></div><span className="link-arrow">↗</span></Link>
            </div>
          </section>
        </>
      ) : (
        <section className="dashboard-workspace operator-overview">
          <div><p className="eyebrow">CONNECTED ACCESS</p><h2>Your operations workspace</h2><p>Use the navigation to review stations, energy slots, reservations and transfer activity.</p></div>
          <Link to="/profile" className="hero-cta">Review your account <span aria-hidden="true">↗</span></Link>
        </section>
      )}
    </div>
  );
}