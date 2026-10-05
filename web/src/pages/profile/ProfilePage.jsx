/**
 * Signed-in user's profile. A prosumer loads /prosumers/me/profile, Backoffice loads their user record, and a Grid Operator sees the token identity. Only a prosumer or Backoffice user can save changes.
 */
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { ROLE_LABELS } from "../../constants/roles";
import { getCurrentUser } from "../../services/authService";
import {
  getProsumerProfile,
  getMyStaffProfile,
  requestProsumerDeactivation,
  updateProsumerProfile,
  updateMyStaffProfile,
} from "../../services/userService";
import { isPasswordStrong, passwordRequirements } from "../../utils/passwordPolicy";

function statusTone(status) {
  if (status === "Active") return "active";
  if (status === "Deactivated") return "off";
  return "pending";
}

export default function ProfilePage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
const [form, setForm] = useState({
  name: user.name || user.username || "",
  email: "",
  contactNumber: "",
  address: "",
  password: "",
  confirmPassword: "",
});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const canEdit = user.role === "Backoffice" || user.role === "Prosumer";
  const displayName = form.name || user.name || user.username || "Member";
  const roleLabel = ROLE_LABELS[user.role] || user.role;
  const statusLabel = profile?.accountStatus || (profile?.isActive === false ? "Inactive" : "Active");
  const [showPassword, setShowPassword] = useState(false);
  const isStaff = user.role === "Backoffice" || user.role === "GridOperator";
  const canEdit = isStaff || user.role === "Prosumer";
  const passwordRules = passwordRequirements(form.password);

  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(() => {
      if (active) setLoading(false);
    }, 2500);
    const load = user.role === "Prosumer"
      ? getProsumerProfile()
      : getMyStaffProfile();
    load.then((record) => {
      if (!active) return;
      setProfile(record);
      setForm({
        name: record.name || record.username || user.name,
        email: record.email || "",
        contactNumber: record.contactNumber || "",
        address: record.address || "",
        password: "",
        confirmPassword: "",
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
    setError("");
    setNotice("");
    if (isStaff && form.password) {
      if (!isPasswordStrong(form.password)) {
        setError("Choose a password that meets every requirement below.");
        return;
      }
      if (form.password !== form.confirmPassword) {
        setError("The passwords do not match.");
        return;
      }
    }

    setSaving(true);
    try {
      if (user.role === "Prosumer") {
        setProfile(await updateProsumerProfile(form));
      } else {
        const updated = await updateMyStaffProfile({
          name: form.name,
          email: form.email,
          contactNumber: form.contactNumber,
          role: user.role,
          password: form.password || null,
          address: form.address,
        });
        setProfile(updated);
        setForm((current) => ({ ...current, password: "", confirmPassword: "" }));
      }
      setNotice("Profile updated.");
    } catch (reason) {
      setError(reason.message);
    } finally {
      setSaving(false);
    }
  }

  function signOut() {
    logout();
    navigate("/login", { replace: true });
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
  <Link to="/dashboard" className="back-link">← Back to dashboard</Link>

  <header className="account-page-head">
    <div>
      <p className="eyebrow">Account</p>
      <h1>My profile</h1>
      <p className="lede">
        Your identity and access within the SolarGrid network.
      </p>
    </div>
    <button className="btn ghost" type="button" onClick={signOut}>
      Sign out
    </button>
  </header>

  {error ? <p className="form-error" role="alert">{error}</p> : null}
  {notice ? <p className="form-success" role="status">{notice}</p> : null}

  {loading ? (
    <p className="hint">Loading profile…</p>
  ) : (
    <div className="profile-layout">
      <aside className="profile-summary">
        <span className="profile-monogram" aria-hidden="true">
          {displayName.trim().slice(0, 1).toUpperCase()}
        </span>

        <p className="eyebrow">SOLARGRID ACCOUNT</p>
        <h2>{displayName}</h2>

        <span className="status-chip">
          {roleLabel}
        </span>

        <span className={`status-chip ${statusTone(statusLabel)}`}>
          {statusLabel}
        </span>

        <dl>
          <div>
            <dt>Username</dt>
            <dd>{user.username || "—"}</dd>
          </div>

          <div>
            <dt>Account ID</dt>
            <dd>{user.id}</dd>
          </div>

          <div>
            <dt>Account status</dt>
            <dd>{statusLabel}</dd>
          </div>
        </dl>
      </aside>

      <form className="account-form profile-form" onSubmit={save}>
        <div className="profile-form-head">
          <div>
            <h2>Profile details</h2>
            <p>Keep your contact information current.</p>
          </div>
        </div>

        <div className="account-form-grid">
          <label>
            Full name
            <input
              name="name"
              value={form.name}
              onChange={updateField}
              disabled={!canEdit}
              required
            />
          </label>

          <label>
            Username
            <input
              value={user.username || ""}
              disabled
            />
          </label>

          <label>
            Email address
            <input
              name="email"
              type="email"
              value={form.email}
              onChange={updateField}
              disabled={!canEdit}
            />
          </label>

          <label>
            Contact number
            <input
              name="contactNumber"
              type="tel"
              value={form.contactNumber}
              onChange={updateField}
              disabled={!canEdit}
              placeholder="+94 7X XXX XXXX"
            />
          </label>

          {user.role === "Prosumer" ? (
            <>
              <label className="profile-span">
                Address
                <input
                  name="address"
                  value={form.address}
                  onChange={updateField}
                  disabled={loading}
                  placeholder="Street, city"
                />
              </label>

              <label>
                NIC
                <input
                  value={profile?.nic || ""}
                  disabled
                />
              </label>
            </>
          ) : null}

          <label>
            Role
            <input
              value={roleLabel}
              disabled
            />
          </label>

          {isStaff ? (
            <>
              <label>
                Change password (optional)
                <span className="user-password-input">
                  <input
                    name="password"
                    type={showPassword ? "text" : "password"}
                    value={form.password}
                    onChange={updateField}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    aria-label={
                      showPassword ? "Hide password" : "Show password"
                    }
                    onClick={() =>
                      setShowPassword((visible) => !visible)
                    }
                  >
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </span>
              </label>

              <label>
                Confirm new password
                <input
                  name="confirmPassword"
                  type={showPassword ? "text" : "password"}
                  value={form.confirmPassword}
                  onChange={updateField}
                  autoComplete="new-password"
                />
              </label>
            </>
          ) : null}
        </div>

        {isStaff ? (
          <ul
            className="password-rules staff-password-rules"
            aria-label="Password requirements"
          >
            {passwordRules.map((rule) => (
              <li
                key={rule.label}
                className={rule.met ? "met" : ""}
              >
                <span aria-hidden="true">
                  {rule.met ? "✓" : "·"}
                </span>
                {rule.label}
              </li>
            ))}
          </ul>
        ) : null}

        <div className="form-actions">
          {canEdit ? (
            <button
              className="btn primary"
              type="submit"
              disabled={saving}
            >
              {saving ? "Saving…" : "Save profile"}
            </button>
          ) : (
            <p className="form-note">
              Staff profile editing is restricted to
              Backoffice-managed user records.
            </p>
          )}

          {user.role === "Prosumer" &&
          profile?.accountStatus === "Active" ? (
            <button
              className="btn ghost"
              type="button"
              onClick={requestDeactivation}
            >
              Request account deactivation
            </button>
          ) : null}
        </div>
      </form>
    </div>
  )}
</div>
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
