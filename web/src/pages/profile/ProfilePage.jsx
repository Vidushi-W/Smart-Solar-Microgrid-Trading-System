/**
 * Signed-in user's profile. A prosumer loads /prosumers/me/profile, Backoffice loads their user record, and a Grid Operator sees the token identity. Only a prosumer or Backoffice user can save changes.
 */
import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { getCurrentUser } from "../../services/authService";
import {
  getProsumerProfile,
  getUser,
  requestProsumerDeactivation,
  updateProsumerProfile,
  updateUser,
} from "../../services/userService";

export default function ProfilePage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState({ name: "", email: "", contactNumber: "", address: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const canEdit = user.role === "Backoffice" || user.role === "Prosumer";

  useEffect(() => {
    let active = true;
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
    }).catch((reason) => active && setError(reason.message))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [user.id, user.name, user.role]);

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
    <div className="page account-page">
      <header className="account-page-head">
        <div><p className="eyebrow">Account</p><h1>My profile</h1><p className="lede">Your identity and access within the SolarGrid network.</p></div>
      </header>
      {error ? <p className="form-error" role="alert">{error}</p> : null}
      {notice ? <p className="form-success" role="status">{notice}</p> : null}
      {loading ? <p className="hint">Loading profile…</p> : (
        <div className="profile-layout">
          <aside className="profile-summary">
            <span className="profile-monogram">{(form.name || "S").slice(0, 1).toUpperCase()}</span>
            <p className="eyebrow">SIGNED IN AS</p>
            <h2>{form.name || user.name}</h2>
            <span className="status-chip active">{user.role}</span>
            <dl><div><dt>Account ID</dt><dd>{user.id}</dd></div><div><dt>Status</dt><dd>{profile?.accountStatus || (profile?.isActive ? "Active" : "—")}</dd></div></dl>
          </aside>
          <form className="account-form profile-form" onSubmit={save}>
            <div className="profile-form-head"><div><h2>Profile details</h2><p>Keep your contact information current.</p></div></div>
            <div className="account-form-grid">
              <label>Full name<input name="name" value={form.name} onChange={updateField} disabled={!canEdit} required /></label>
              <label>Email address<input name="email" type="email" value={form.email} onChange={updateField} disabled={!canEdit} /></label>
              <label>Contact number<input name="contactNumber" type="tel" value={form.contactNumber} onChange={updateField} disabled={!canEdit} /></label>
              {user.role === "Prosumer" ? <label>Address<input name="address" value={form.address} onChange={updateField} /></label> : null}
              {user.role === "Prosumer" ? <label>NIC<input value={profile?.nic || ""} disabled /></label> : null}
              <label>Role<input value={user.role} disabled /></label>
            </div>
            <div className="form-actions">
              {canEdit ? <button className="btn primary" type="submit" disabled={saving}>{saving ? "Saving…" : "Save profile"}</button> : <p className="form-note">Staff profile editing is restricted to Backoffice-managed user records.</p>}
              {user.role === "Prosumer" && profile?.accountStatus === "Active" ? <button className="btn ghost" type="button" onClick={requestDeactivation}>Request account deactivation</button> : null}
            </div>
          </form>
        </div>
      )}
    </div>
  );
}