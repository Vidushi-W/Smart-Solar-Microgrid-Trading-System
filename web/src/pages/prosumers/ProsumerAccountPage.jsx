import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import {
  activateProsumer,
  deactivateProsumer,
  getProsumerByNic,
  reactivateProsumer,
  requestProsumerDeactivationByBackoffice,
  updateProsumerByNic,
} from "../../services/userService";

const phonePattern = /^\+?[0-9\s().-]+$/;

function isPhoneNumberValid(phoneNumber) {
  const normalized = phoneNumber.trim();
  const digitCount = normalized.replace(/\D/g, "").length;
  return phonePattern.test(normalized) && digitCount >= 7 && digitCount <= 15;
}

export default function ProsumerAccountPage({ editing = false }) {
  const { nic } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [prosumer, setProsumer] = useState(null);
  const [form, setForm] = useState({ name: "", email: "", contactNumber: "", address: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (!location.state?.notice) return;
    setNotice(location.state.notice);
    navigate(location.pathname, { replace: true, state: null });
  }, [location.pathname, location.state, navigate]);

  useEffect(() => {
    let active = true;
    getProsumerByNic(nic)
      .then((record) => {
        if (!active) return;
        setProsumer(record);
        setForm({
          name: record.name || "",
          email: record.email || "",
          contactNumber: record.contactNumber || "",
          address: record.address || "",
        });
      })
      .catch((reason) => active && setError(reason.message))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [nic]);

  function updateField(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  }

  async function save(event) {
    event.preventDefault();
    setError("");
    setNotice("");
    if (!form.name.trim() || !form.email.trim() || !form.contactNumber.trim() || !form.address.trim()) {
      setError("Name, email, phone number, and address are required.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      setError("Enter a valid email address.");
      return;
    }
    if (!isPhoneNumberValid(form.contactNumber)) {
      setError("Enter a valid phone number with 7 to 15 digits. A leading + and common separators are allowed.");
      return;
    }

    setSaving(true);
    try {
      const updated = await updateProsumerByNic(nic, form);
      setProsumer(updated);
      navigate(`/prosumers/${encodeURIComponent(nic)}`, {
        replace: true,
        state: { notice: "Prosumer profile updated successfully." },
      });
    } catch (reason) {
      setError(reason.message);
    } finally {
      setSaving(false);
    }
  }

  async function processAction() {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      let updated;
      if (prosumer.accountStatus === "PendingActivation" || prosumer.accountStatus === "Registered") {
        updated = await activateProsumer(prosumer.nic);
      } else if (prosumer.accountStatus === "DeactivationRequested") {
        updated = await deactivateProsumer(prosumer.nic);
      } else if (prosumer.accountStatus === "Deactivated") {
        updated = await reactivateProsumer(prosumer.nic);
      } else {
        updated = await requestProsumerDeactivationByBackoffice(prosumer.nic);
      }
      setProsumer((current) => ({ ...current, ...updated }));
      setNotice("Prosumer account status updated.");
    } catch (reason) {
      setError(reason.message);
    } finally {
      setBusy(false);
    }
  }

  const actionLabel = prosumer?.accountStatus === "PendingActivation" || prosumer?.accountStatus === "Registered"
    ? "Activate"
    : prosumer?.accountStatus === "DeactivationRequested"
      ? "Process deactivation"
      : prosumer?.accountStatus === "Deactivated"
        ? "Reactivate"
        : "Request deactivation";

  return (
    <div className="page account-page">
      <Link to="/prosumers" className="back-link">← Prosumer Management</Link>
      <Link to="/dashboard" className="back-link">← Back to dashboard</Link>
      <header className="account-page-head">
        <div>
          <p className="eyebrow">Backoffice · Prosumer profile</p>
          <h1>{editing ? "Edit Prosumer" : prosumer?.name || (loading ? "Loading Prosumer…" : "Prosumer profile")}</h1>
          <p className="lede">NIC is the primary identifier and is read-only.</p>
        </div>
        {!editing && prosumer ? <Link className="btn primary" to={`/prosumers/${encodeURIComponent(nic)}/edit`}>Edit profile</Link> : null}
      </header>
      {error ? <p className="form-error" role="alert">{error}</p> : null}
      {notice ? <p className="form-success" role="status">{notice}</p> : null}
      {loading ? <p className="hint">Loading Prosumer profile…</p> : null}
      {prosumer ? (
        <div className="profile-layout">
          <aside className="profile-summary">
            <span className="profile-monogram">{(prosumer.name || "?").slice(0, 1).toUpperCase()}</span>
            <p className="eyebrow">DEFAULT AVATAR</p>
            <h2>{prosumer.name}</h2>
            <span className={`status-chip ${prosumer.accountStatus === "Active" ? "active" : prosumer.accountStatus === "DeactivationRequested" ? "warning" : prosumer.accountStatus === "PendingActivation" || prosumer.accountStatus === "Registered" ? "pending" : "off"}`}>{prosumer.accountStatus}</span>
            <dl>
              <div><dt>NIC</dt><dd>{prosumer.nic}</dd></div>
              <div><dt>Account ID</dt><dd>{prosumer.userId}</dd></div>
              <div><dt>Registered</dt><dd>{prosumer.createdAtUtc ? new Date(prosumer.createdAtUtc).toLocaleString() : "—"}</dd></div>
            </dl>
            {!editing ? <button className="btn ghost edit-status-button" type="button" onClick={processAction} disabled={busy}>{busy ? "Updating…" : actionLabel}</button> : null}
          </aside>
          {editing ? (
            <form className="account-form profile-form" onSubmit={save}>
              <div className="profile-form-head"><div><h2>Prosumer details</h2><p>Update permitted profile and contact information.</p></div></div>
              <div className="account-form-grid">
                <label>NIC<input value={prosumer.nic} readOnly disabled /></label>
                <label>Full name<input name="name" value={form.name} onChange={updateField} autoComplete="name" required /></label>
                <label>Email address<input name="email" type="email" value={form.email} onChange={updateField} autoComplete="email" required /></label>
                <label>Phone number<input name="contactNumber" type="tel" value={form.contactNumber} onChange={updateField} autoComplete="tel" required /></label>
                <label>Residential address<input name="address" value={form.address} onChange={updateField} autoComplete="street-address" required /></label>
                <label>Account status<input value={prosumer.accountStatus} readOnly disabled /></label>
              </div>
              <p className="form-note">Account status is changed from the profile view using the approved activation workflow.</p>
              <div className="form-actions">
                <Link className="btn ghost" to={`/prosumers/${encodeURIComponent(nic)}`}>Cancel</Link>
                <button className="btn primary" type="submit" disabled={saving}>{saving ? "Saving…" : "Save changes"}</button>
              </div>
            </form>
          ) : (
            <section className="account-form user-details-card">
              <div className="profile-form-head"><div><h2>Personal and contact information</h2><p>Profile information stored on this Prosumer account.</p></div></div>
              <dl className="user-details-list">
                <div><dt>NIC</dt><dd>{prosumer.nic}</dd></div>
                <div><dt>Full name</dt><dd>{prosumer.name}</dd></div>
                <div><dt>Email</dt><dd>{prosumer.email}</dd></div>
                <div><dt>Phone</dt><dd>{prosumer.contactNumber}</dd></div>
                <div><dt>Residential address</dt><dd>{prosumer.address}</dd></div>
                <div><dt>Account status</dt><dd>{prosumer.accountStatus}</dd></div>
                <div><dt>Registration date</dt><dd>{prosumer.createdAtUtc ? new Date(prosumer.createdAtUtc).toLocaleString() : "—"}</dd></div>
              </dl>
            </section>
          )}
        </div>
      ) : null}
    </div>
  );
}
