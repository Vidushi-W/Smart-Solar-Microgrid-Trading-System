/**
 * Signed-in user's profile. A prosumer loads /prosumers/me/profile, Backoffice loads their user record, and a Grid Operator sees the token identity. Only a prosumer or Backoffice user can save changes.
 */
import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { ROLE_LABELS } from "../../constants/roles";
import { getCurrentUser } from "../../services/authService";
import {
  getProsumerProfile,
  getUser,
  requestProsumerDeactivation,
  updateProsumerProfile,
  updateUser,
} from "../../services/userService";

function statusTone(status) {
  if (status === "Active") return "active";
  if (status === "Deactivated") return "off";
  return "pending";
}

export default function ProfilePage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState({
    name: user.name || user.username || "",
    email: "",
    contactNumber: "",
    address: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const canEdit = user.role === "Backoffice" || user.role === "Prosumer";
  const displayName = form.name || user.name || user.username || "Member";
  const roleLabel = ROLE_LABELS[user.role] || user.role;
  const statusLabel = profile?.accountStatus || (profile?.isActive === false ? "Inactive" : "Active");

  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(() => {
      if (active) setLoading(false);
    }, 2500);
    const load = user.role === "Prosumer"
      ? getProsumerProfile()
      : user.role === "Backoffice"
        ? getUser(user.id)
        : getCurrentUser();
    load.then((record) => {
      if (!active) return;
      setProfile(record);
      setForm({
        name: record.name || record.username || user.name,
        email: record.email || "",
        contactNumber: record.contactNumber || "",
        address: record.address || "",
      });
    }).catch(() => {
      if (!active) return;
      setProfile({ name: user.name, username: user.username, accountStatus: "Active" });
    }).finally(() => active && setLoading(false));
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [user.id, user.name, user.username, user.role]);

  function updateField(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  }

  async function save(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");
    try {
      if (user.role === "Prosumer") {
        setProfile(await updateProsumerProfile(form));
      } else {
        const updated = await updateUser(user.id, {
          name: form.name,
          email: form.email,
          contactNumber: form.contactNumber,
          role: user.role,
          password: null,
        });
        setProfile(updated);
      }
      setNotice("Profile updated.");
    } catch (reason) {
      setError(reason.message);
    } finally {
      setSaving(false);
    }
  }

  async function requestDeactivation() {
    setError("");
    setNotice("");
    try {
      const updated = await requestProsumerDeactivation();
      setProfile((current) => ({ ...current, accountStatus: updated.accountStatus || "DeactivationRequested" }));
      setNotice("Deactivation request sent to Backoffice.");
    } catch (reason) {
      setError(reason.message);
    }
  }

  return (
    <div className="page profile-page">
      <section className="profile-hero">
        <span className="profile-avatar" aria-hidden="true">{displayName.trim().slice(0, 1).toUpperCase()}</span>
        <div className="profile-hero-copy">
          <p className="eyebrow">SolarGrid account</p>
          <h1>{displayName}</h1>
          <p className="profile-handle">@{user.username || displayName}</p>
          <div className="profile-chips">
            <span className="status-chip">{roleLabel}</span>
            <span className={`status-chip ${statusTone(statusLabel)}`}>{statusLabel}</span>
          </div>
        </div>
      </section>

      {error ? <p className="form-error" role="alert">{error}</p> : null}
      {notice ? <p className="form-success" role="status">{notice}</p> : null}

      <section className="profile-facts" aria-label="Account summary">
        <article>
          <span>Role</span>
          <strong>{roleLabel}</strong>
        </article>
        <article>
          <span>Status</span>
          <strong>{statusLabel}</strong>
        </article>
        <article>
          <span>Username</span>
          <strong>{user.username || "—"}</strong>
        </article>
      </section>

      <form className="account-form profile-form" onSubmit={save}>
        <div className="profile-form-head">
          <div>
            <h2>Contact details</h2>
            <p>{loading ? "Loading your saved details…" : "Keep the details on this account up to date."}</p>
          </div>
        </div>
        <div className="account-form-grid">
          <label>Full name<input name="name" value={form.name} onChange={updateField} disabled={!canEdit || loading} required /></label>
          <label>Email address<input name="email" type="email" value={form.email} onChange={updateField} disabled={!canEdit || loading} placeholder="name@example.com" /></label>
          <label>Contact number<input name="contactNumber" type="tel" value={form.contactNumber} onChange={updateField} disabled={!canEdit || loading} placeholder="+94 7X XXX XXXX" /></label>
          {user.role === "Prosumer" ? <label className="profile-span">Address<input name="address" value={form.address} onChange={updateField} disabled={loading} placeholder="Street, city" /></label> : null}
          {user.role === "Prosumer" ? <label>NIC<input value={profile?.nic || ""} disabled /></label> : null}
          <label>Role<input value={roleLabel} disabled /></label>
        </div>
        <div className="form-actions">
          {canEdit ? <button className="btn primary" type="submit" disabled={saving || loading}>{saving ? "Saving…" : "Save profile"}</button> : <p className="form-note">Staff profile editing is restricted to Backoffice-managed user records.</p>}
        </div>
        {user.role === "Prosumer" && statusLabel === "Active" ? (
          <div className="profile-deactivate">
            <div>
              <strong>Close this account</strong>
              <p>Send a deactivation request to Backoffice. You stay signed in until it is approved.</p>
            </div>
            <button className="btn ghost" type="button" onClick={requestDeactivation}>Request deactivation</button>
          </div>
        ) : null}
      </form>
    </div>
  );
}
