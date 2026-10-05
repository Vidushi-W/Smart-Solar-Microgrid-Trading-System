import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getUser } from "../../services/userService";

export default function UserDetailsPage() {
  const { id } = useParams();
  const [account, setAccount] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    getUser(id)
      .then((result) => active && setAccount(result))
      .catch((reason) => active && setError(reason.message))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [id]);

  return (
    <div className="page account-page">
      <Link to="/users" className="back-link">← User directory</Link>
      <Link to="/dashboard" className="back-link">← Back to dashboard</Link>
      <header className="account-page-head">
        <div>
          <p className="eyebrow">Backoffice · user details</p>
          <h1>{account?.name || (loading ? "Loading user…" : "User details")}</h1>
          <p className="lede">Personal, contact, and account information.</p>
        </div>
        {account && account.role !== "Prosumer" ? <Link className="btn primary" to={`/users/${encodeURIComponent(account.id)}/edit`}>Edit user</Link> : null}
      </header>
      {error ? <p className="form-error" role="alert">{error}</p> : null}
      {loading ? <p className="hint">Loading user details…</p> : null}
      {account ? (
        <div className="profile-layout user-details-layout">
          <aside className="profile-summary">
            <span className="profile-monogram">{(account.name || "?").slice(0, 1).toUpperCase()}</span>
            <p className="eyebrow">DEFAULT AVATAR</p>
            <h2>{account.name}</h2>
            <span className={`status-chip ${account.isActive ? "active" : account.accountStatus === "DeactivationRequested" ? "warning" : "off"}`}>
              {account.accountStatus || (account.isActive ? "Active" : "Inactive")}
            </span>
            <dl>
              <div><dt>User ID</dt><dd>{account.id}</dd></div>
              <div><dt>Role</dt><dd>{account.role === "GridOperator" ? "Grid Operator" : account.role}</dd></div>
              <div><dt>Registered</dt><dd>{account.createdAtUtc ? new Date(account.createdAtUtc).toLocaleString() : "—"}</dd></div>
            </dl>
          </aside>
          <section className="account-form user-details-card">
            <div className="profile-form-head"><div><h2>Personal information</h2><p>Account information stored in the UserDetails record.</p></div></div>
            <dl className="user-details-list">
              <div><dt>Full name</dt><dd>{account.name || "—"}</dd></div>
              <div><dt>Username</dt><dd>{account.username || "—"}</dd></div>
              <div><dt>Email</dt><dd>{account.email || "—"}</dd></div>
              <div><dt>Phone</dt><dd>{account.contactNumber || "—"}</dd></div>
              {account.role === "Prosumer" ? <div><dt>NIC</dt><dd>{account.nic || "—"}</dd></div> : null}
              <div><dt>Address</dt><dd>{account.address || "—"}</dd></div>
              <div><dt>Role</dt><dd>{account.role === "GridOperator" ? "Grid Operator" : account.role}</dd></div>
              <div><dt>Account status</dt><dd>{account.accountStatus || (account.isActive ? "Active" : "Inactive")}</dd></div>
              <div><dt>Created date</dt><dd>{account.createdAtUtc ? new Date(account.createdAtUtc).toLocaleString() : "—"}</dd></div>
            </dl>
          </section>
        </div>
      ) : null}
    </div>
  );
}
