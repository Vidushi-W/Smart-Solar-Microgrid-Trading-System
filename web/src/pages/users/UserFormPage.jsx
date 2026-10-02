import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { createUser, getUser, updateUser } from "../../services/userService";
import { useAuth } from "../../context/AuthContext";

const emptyForm = {
  name: "",
  username: "",
  email: "",
  contactNumber: "",
  password: "",
  role: "GridOperator",
};

export default function UserFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user: signedInUser } = useAuth();
  const editing = Boolean(id);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(editing);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) return;
    let active = true;
    getUser(id)
      .then((account) => {
        if (active) setForm({
          name: account.name || "",
          username: account.username || "",
          email: account.email || "",
          contactNumber: account.contactNumber || "",
          password: "",
          role: account.role || "GridOperator",
        });
      })
      .catch((reason) => active && setError(reason.message))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [id]);

  function updateField(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  }

  async function submit(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    const payload = editing
      ? { name: form.name, email: form.email, contactNumber: form.contactNumber, role: form.role, password: form.password || null }
      : form;
    try {
      if (editing) await updateUser(id, payload);
      else await createUser(payload);
      navigate("/users", { replace: true });
    } catch (reason) {
      setError(reason.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="page account-page">
      <Link to="/users" className="back-link">← User directory</Link>
      <header className="account-page-head">
        <div>
          <p className="eyebrow">Backoffice · staff access</p>
          <h1>{editing ? "Edit user" : "Create user"}</h1>
          <p className="lede">{editing ? "Update staff details and access level." : "Add an operator or Backoffice account to the directory."}</p>
        </div>
      </header>
      {loading ? <p className="hint">Loading account…</p> : null}
      {error ? <p className="form-error" role="alert">{error}</p> : null}
      {!loading ? (
        <form className="account-form" onSubmit={submit}>
          <div className="account-form-grid">
            <label>Full name<input name="name" value={form.name} onChange={updateField} autoComplete="name" required /></label>
            <label>Username<input name="username" value={form.username} onChange={updateField} autoComplete="username" disabled={editing} required={!editing} /></label>
            <label>Email address<input name="email" type="email" value={form.email} onChange={updateField} autoComplete="email" required /></label>
            <label>Contact number<input name="contactNumber" type="tel" value={form.contactNumber} onChange={updateField} autoComplete="tel" /></label>
            <label>Access role<select name="role" value={form.role} onChange={updateField} disabled={editing && id === signedInUser.id}><option value="GridOperator">Grid Operator</option><option value="Backoffice">Backoffice</option></select></label>
            <label>{editing ? "Reset password (optional)" : "Temporary password"}<input name="password" type="password" value={form.password} onChange={updateField} autoComplete="new-password" minLength={8} required={!editing} /></label>
          </div>
          <p className="form-note">Passwords must be at least 8 characters. They are stored as hashes by the API.</p>
          <div className="form-actions">
            <Link className="btn ghost" to="/users">Cancel</Link>
            <button className="btn primary" type="submit" disabled={saving}>{saving ? "Saving…" : editing ? "Save changes" : "Create account"}</button>
          </div>
        </form>
      ) : null}
    </div>
  );
}