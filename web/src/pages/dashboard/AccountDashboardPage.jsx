/**
 * Backoffice counts use all account records plus the activation and deactivation queues. Other roles see their own workspace overview.
 */
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { getDeactivatedProsumers, getPendingProsumers, getUsers } from "../../services/userService";
import ProsumerDashboard from "./ProsumerDashboard";

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
  if (user.role === "Prosumer") return <ProsumerDashboard name={firstName} />;
  const pendingActivations = summary.pending.filter((prosumer) =>
    ["PendingActivation", "Registered"].includes(prosumer.accountStatus)
  );
  const pendingAccountActions = summary.pending.filter((prosumer) =>
    prosumer.accountStatus === "DeactivationRequested"
  );
  const prosumers = summary.users.filter((account) => account.role === "Prosumer");
  const totalProsumers = prosumers.length;
  const activeUsers = summary.users.filter((account) => account.isActive).length;
  const totalUsers = summary.users.length;

  return (
    <div className="page account-page dashboard-page">
      <section className="dashboard-welcome">
<div>
  <p className="eyebrow">
    {user.role === "Backoffice"
      ? "BACKOFFICE OVERVIEW"
      : user.role === "GridOperator"
      ? "GRID OPERATIONS"
      : "PROSUMER OVERVIEW"}
  </p>

  <h1>Good day, {firstName}.</h1>
  <p>Powered by the sun. Coordinated by your team.</p>
</div>
        <div className="dashboard-date"><span>LOCAL OPERATIONS</span><strong>{new Intl.DateTimeFormat("en-LK", { weekday: "long", day: "numeric", month: "long" }).format(new Date())}</strong></div>
      </section>
      {error ? <p className="form-error" role="alert">{error}</p> : null}
      {user.role === "Backoffice" ? (
        <>
          <section className="account-metrics" aria-label="Account totals">
            <Link className="dashboard-metric-link" to="/users"><article><span>TOTAL REGISTERED USERS</span><strong>{loading ? "—" : totalUsers}</strong><small>Backoffice, Grid Operator and Prosumer accounts</small></article></Link>
            <Link className="dashboard-metric-link" to="/prosumers"><article><span>TOTAL PROSUMERS</span><strong>{loading ? "—" : totalProsumers}</strong><small>All registration and account states</small></article></Link>
            <Link className="dashboard-metric-link" to="/users"><article><span>GRID OPERATORS</span><strong>{loading ? "—" : summary.users.filter((account) => account.role === "GridOperator").length}</strong><small>Registered operator accounts</small></article></Link>
            <Link className="dashboard-metric-link" to="/prosumers/pending"><article className="metric-hot"><span>PENDING PROSUMER REGISTRATIONS</span><strong>{loading ? "—" : pendingActivations.length}</strong><small>Awaiting activation</small></article></Link>
            <Link className="dashboard-metric-link" to="/prosumers/deactivated"><article><span>DEACTIVATED PROSUMERS</span><strong>{loading ? "—" : summary.deactivated.length}</strong><small>Accounts eligible for reactivation</small></article></Link>
            <Link className="dashboard-metric-link" to="/users"><article><span>ACTIVE USERS</span><strong>{loading ? "—" : activeUsers}</strong><small>Active staff and prosumer accounts</small></article></Link>
          </section>
          <section className="dashboard-alerts" aria-label="Pending account alerts">
            <div><p className="eyebrow">PENDING ACTIVATIONS</p><strong>{loading ? "—" : pendingActivations.length}</strong><Link to="/prosumers/pending">Review new registrations <span aria-hidden="true">↗</span></Link></div>
            <div><p className="eyebrow">PENDING ACCOUNT ACTIONS</p><strong>{loading ? "—" : pendingAccountActions.length}</strong><Link to="/prosumers/pending">Review deactivation requests <span aria-hidden="true">↗</span></Link></div>
          </section>
          <section className="dashboard-workspace">
            <div className="dashboard-section-title"><div><p className="eyebrow">YOUR WORKSPACE</p><h2>Account operations</h2></div><span>LIVE FROM THE API</span></div>
            <div className="dashboard-links">
              <Link to="/users" className="dashboard-link primary-link"><span className="link-index">01</span><div><strong>User Management</strong><small>Review and manage staff accounts</small></div><span className="link-arrow">↗</span></Link>
              <Link to="/prosumers" className="dashboard-link"><span className="link-index">02</span><div><strong>Prosumer Management</strong><small>Manage registrations and account requests</small></div><span className="link-arrow">↗</span></Link>
              <Link to="/prosumers/pending" className="dashboard-link"><span className="link-index">03</span><div><strong>Pending Activations</strong><small>{loading ? "Loading registration count" : `${pendingActivations.length} awaiting review`}</small></div><span className="link-arrow">↗</span></Link>
              <Link to="/prosumers/deactivated" className="dashboard-link"><span className="link-index">04</span><div><strong>Deactivated Accounts / Reactivation</strong><small>{loading ? "Loading account count" : `${summary.deactivated.length} eligible to reactivate`}</small></div><span className="link-arrow">↗</span></Link>
              <Link to="/stations" className="dashboard-link"><span className="link-index">05</span><div><strong>Stations &amp; energy slots</strong><small>Open station operations</small></div><span className="link-arrow">↗</span></Link>
              <Link to="/reservations" className="dashboard-link"><span className="link-index">06</span><div><strong>Reservations</strong><small>Review energy reservations</small></div><span className="link-arrow">↗</span></Link>
              <Link to="/transactions" className="dashboard-link"><span className="link-index">07</span><div><strong>Transactions &amp; transfers</strong><small>Review grid activity</small></div><span className="link-arrow">↗</span></Link>
            </div>
          </section>
        </>
      ) : (
        <section className="dashboard-workspace operator-overview">
          <div className="dashboard-section-title"><div><p className="eyebrow">GRID OPERATOR</p><h2>Your operations workspace</h2></div><span>CONNECTED MODULES</span></div>
          <div className="dashboard-links">
            <Link to="/reservations" className="dashboard-link primary-link"><span className="link-index">01</span><div><strong>Bookings</strong><small>Review reservations and booking requests</small></div><span className="link-arrow">↗</span></Link>
            <Link to="/stations" className="dashboard-link"><span className="link-index">02</span><div><strong>Microgrid Nodes</strong><small>View connected station and node information</small></div><span className="link-arrow">↗</span></Link>
            <Link to="/slots" className="dashboard-link"><span className="link-index">03</span><div><strong>Energy Slots</strong><small>Review operational slot availability</small></div><span className="link-arrow">↗</span></Link>
            <Link to="/transactions" className="dashboard-link"><span className="link-index">04</span><div><strong>Energy Transfer</strong><small>Open transfer operations</small></div><span className="link-arrow">↗</span></Link>
            <Link to="/profile" className="dashboard-link"><span className="link-index">05</span><div><strong>Profile</strong><small>Review and update your account</small></div><span className="link-arrow">↗</span></Link>
          </div>
        </section>
      )}
    </div>
  );
}