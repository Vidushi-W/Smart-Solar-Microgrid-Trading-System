/**
 * Create a web user, or edit one. On edit, the password field is optional and is omitted when left blank.
 */
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { createUser, getUser, updateUser, updateUserStatus } from "../../services/userService";
import { useAuth } from "../../context/AuthContext";
import { isPasswordStrong, passwordRequirements } from "../../utils/passwordPolicy";

const emptyForm = {
  name: "",
  username: "",
  email: "",
  contactNumber: "",
  address: "",
  password: "",
  confirmPassword: "",
  role: "GridOperator",
};
const phonePattern = /^\+?[0-9\s().-]+$/;

// Count digits only, so spaces and separators do not change the 7 to 15 length check.
function isPhoneNumberValid(phoneNumber) {
  const normalized = phoneNumber.trim();
  const digitCount = normalized.replace(/\D/g, "").length;
  return phonePattern.test(normalized) && digitCount >= 7 && digitCount <= 15;
}

export default function UserFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user: signedInUser } = useAuth();
  const editing = Boolean(id);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(editing);
  const [saving, setSaving] = useState(false);
  const [changingStatus, setChangingStatus] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [account, setAccount] = useState(null);
  const passwordRules = passwordRequirements(form.password);

  useEffect(() => {
    if (!id) return;
    let active = true;
    getUser(id)
      .then((account) => {
        if (active) {
          setAccount(account);
          setForm({
          name: account.name || "",
          username: account.username || "",
          email: account.email || "",
          contactNumber: account.contactNumber || "",
          address: account.address || "",
          password: "",
          confirmPassword: "",
          role: account.role || "GridOperator",
          });
        }
      })
      .catch((reason) => active && setError(reason.message))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [id]);

  function updateField(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  }

  async function changeStatus() {
    setChangingStatus(true);
    setError("");
    setNotice("");
    try {
      const updated = await updateUserStatus(id, !account.isActive);
      setAccount(updated);
      setNotice(`Account status changed to ${updated.accountStatus || (updated.isActive ? "Active" : "Inactive")}.`);
    } catch (reason) {
      setError(reason.message);
    } finally {
      setChangingStatus(false);
    }
  }

  // On edit, a blank password is sent as null so the stored password is left unchanged. A new password must meet the checklist.
  async function submit(event) {
    event.preventDefault();
    setError("");
    setNotice("");
    if (!isPhoneNumberValid(form.contactNumber)) {
      setError("Enter a valid phone number with 7 to 15 digits. You may include a leading +, spaces, parentheses, periods, or hyphens.");
      return;
    }
    if ((!editing || form.password) && !isPasswordStrong(form.password)) {
      setError("Choose a password that meets every requirement below.");
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError("The passwords do not match.");
      return;
    }
    setSaving(true);
    const payload = editing
      ? { name: form.name, email: form.email, contactNumber: form.contactNumber, address: form.address, role: form.role, password: form.password || null }
      : {
          name: form.name,
          username: form.username,
          email: form.email,
          contactNumber: form.contactNumber,
          password: form.password,
          role: form.role,
        };
    try {
      if (editing) await updateUser(id, payload);
      else await createUser(payload);
      navigate("/users", {
        replace: true,
        state: { notice: editing ? "User details updated." : "User created successfully." },
      });
    } catch (reason) {
      setError(reason.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="page account-page">
      <Link to="/users" className="back-link">← User directory</Link>
      <Link to="/dashboard" className="back-link">← Back to dashboard</Link>
      <header className="account-page-head">
        <div>
          <p className="eyebrow">Backoffice · staff access</p>
          <h1>{editing ? "Edit user" : "Create user"}</h1>
          <p className="lede">{editing ? "Update staff details and access level." : "Add a Backoffice or Grid Operator account to the directory."}</p>
        </div>
      </header>
      {loading ? <p className="hint">Loading account…</p> : null}
      {error ? <p className="form-error" role="alert">{error}</p> : null}
      {notice ? <p className="form-success" role="status">{notice}</p> : null}
      {!loading && (!editing || account) ? (
        <div className={editing ? "edit-user-layout" : ""}>
        {editing && account ? (
          <aside className="profile-summary edit-user-summary">
            <span className="profile-monogram">{(account?.name || form.name || "?").slice(0, 1).toUpperCase()}</span>
            <p className="eyebrow">DEFAULT AVATAR</p>
            <h2>{account?.name || form.name}</h2>
            <dl>
              <div><dt>User ID</dt><dd>{account?.id || id}</dd></div>
              {account?.role === "Prosumer" ? <div><dt>NIC</dt><dd>{account.nic || "—"}</dd></div> : null}
              <div><dt>Username</dt><dd>{account?.username || form.username}</dd></div>
              <div><dt>Role</dt><dd>{account?.role === "GridOperator" ? "Grid Operator" : account?.role}</dd></div>
              <div><dt>Status</dt><dd><span className={`status-chip ${account?.isActive ? "active" : "off"}`}>{account?.accountStatus || (account?.isActive ? "Active" : "Inactive")}</span></dd></div>
              <div><dt>Created</dt><dd>{account?.createdAtUtc ? new Date(account.createdAtUtc).toLocaleDateString() : "—"}</dd></div>
            </dl>
            {account.role !== "Prosumer" ? (
              <button className="btn ghost edit-status-button" type="button" onClick={changeStatus} disabled={changingStatus}>
                {changingStatus ? "Updating…" : account.isActive ? "Deactivate account" : "Activate account"}
              </button>
            ) : <p className="form-note">Prosumer account status is managed from Prosumer Management.</p>}
          </aside>
        ) : null}
        {editing && account?.role === "Prosumer" ? (
          <section className="account-form user-details-card">
            <h2>Prosumer accounts use a separate workflow</h2>
            <p className="form-note">NIC is the Prosumer’s primary identifier and cannot be edited here. Use Prosumer Management for account actions.</p>
            <Link className="btn primary" to={`/prosumers/${account.accountStatus === "Deactivated" ? "deactivated" : "pending"}`}>Open Prosumer Management</Link>
          </section>
        ) : (
        <form className={`account-form ${editing ? "edit-user-form" : ""}`} onSubmit={submit}>
          <div className="account-form-grid">
            <label>Full name<input name="name" value={form.name} onChange={updateField} autoComplete="name" required /></label>
            <label>Username<input name="username" value={form.username} onChange={updateField} autoComplete="username" disabled={editing} required={!editing} /></label>
            <label>Email address<input name="email" type="email" value={form.email} onChange={updateField} autoComplete="email" required /></label>
            <label>Phone number<input name="contactNumber" type="tel" value={form.contactNumber} onChange={updateField} autoComplete="tel" required aria-describedby="user-phone-note" /></label>
            {editing || form.address ? <label>Address<input name="address" value={form.address} onChange={updateField} autoComplete="street-address" /></label> : null}
            <label>Access role<select name="role" value={form.role} onChange={updateField} disabled={editing && id === signedInUser.id}><option value="GridOperator">Grid Operator</option><option value="Backoffice">Backoffice</option></select></label>
            <label>{editing ? "Reset password (optional)" : "Temporary password"}<span className="user-password-input"><input name="password" type={showPassword ? "text" : "password"} value={form.password} onChange={updateField} autoComplete="new-password" minLength={8} required={!editing} /><button type="button" aria-label={showPassword ? "Hide password" : "Show password"} onClick={() => setShowPassword((visible) => !visible)}>{showPassword ? "Hide" : "Show"}</button></span></label>
            {!editing ? <label>Confirm password<input name="confirmPassword" type={showPassword ? "text" : "password"} value={form.confirmPassword} onChange={updateField} autoComplete="new-password" required /></label> : null}
          </div>
          <p id="user-phone-note" className="form-note">Phone numbers must contain 7 to 15 digits. A leading + and common separators are allowed.</p>
          <ul className="password-rules staff-password-rules" aria-label="Password requirements">
            {passwordRules.map((rule) => <li key={rule.label} className={rule.met ? "met" : ""}><span aria-hidden="true">{rule.met ? "✓" : "·"}</span>{rule.label}</li>)}
          </ul>
          <p className="form-note">Passwords are stored as hashes by the API. Leave the reset field blank to keep the existing password.</p>
          <div className="form-actions">
            <Link className="btn ghost" to="/users">Cancel</Link>
            {!editing ? <button className="btn ghost" type="button" onClick={() => { setForm(emptyForm); setError(""); setShowPassword(false); }}>Clear form</button> : null}
            <button className="btn primary" type="submit" disabled={saving}>{saving ? "Saving…" : editing ? "Save changes" : "Create account"}</button>
          </div>
        </form>
        )}
        </div>
      ) : null}
    </div>
  );
}