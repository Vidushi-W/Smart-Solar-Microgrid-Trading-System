/**
 * Signed-in user's profile. Profile details and updates are loaded through the
 * authenticated API; NIC remains read-only for Prosumers.
 */
import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ROLE_LABELS } from "../../constants/roles";
import { useAuth } from "../../context/AuthContext";
import {
  getMyStaffProfile,
  getProsumerProfile,
  requestProsumerDeactivation,
  updateMyStaffProfile,
  updateProsumerProfile,
} from "../../services/userService";
import { isPasswordStrong, passwordRequirements } from "../../utils/passwordPolicy";

function loadImage(fileUrl) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(fileUrl);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(fileUrl);
      reject(new Error("Image could not be loaded."));
    };
    image.src = fileUrl;
  });
}

function statusTone(status) {
  if (status === "Active") return "active";
  if (status === "Deactivated" || status === "Inactive") return "off";
  return "pending";
}

export default function ProfilePage() {
  const { user, logout, updateUser } = useAuth();
  const navigate = useNavigate();
  const pictureInput = useRef(null);
  const [profile, setProfile] = useState(null);
  const [profilePictureData, setProfilePictureData] = useState("");
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
  const [showPassword, setShowPassword] = useState(false);
  const isStaff = user.role === "Backoffice" || user.role === "GridOperator";
  const canEdit = isStaff || user.role === "Prosumer";
  const displayName = form.name || user.name || user.username || "Member";
  const roleLabel = ROLE_LABELS[user.role] || user.role;
  const statusLabel = profile?.accountStatus || (profile?.isActive === false ? "Inactive" : "Active");
  const passwordRules = passwordRequirements(form.password);

  useEffect(() => {
    let active = true;
    const loadProfile = user.role === "Prosumer"
      ? getProsumerProfile()
      : getMyStaffProfile();

    loadProfile
      .then((record) => {
        if (!active) return;
        setProfile(record);
        setProfilePictureData(record.profilePictureData || "");
        setForm({
          name: record.name || record.username || user.name || "",
          email: record.email || "",
          contactNumber: record.contactNumber || "",
          address: record.address || "",
          password: "",
          confirmPassword: "",
        });
      })
      .catch((reason) => {
        if (active) setError(reason.message || "Unable to load your profile.");
      })
      .finally(() => active && setLoading(false));

    return () => {
      active = false;
    };
  }, [user.id, user.name, user.role]);

  function updateField(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  }

  async function chooseProfilePicture(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Choose an image file.");
      return;
    }

    const fileUrl = URL.createObjectURL(file);
    try {
      const image = await loadImage(fileUrl);
      const scale = Math.min(1, 512 / Math.max(image.naturalWidth, image.naturalHeight));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Image processing is not available in this browser.");
      context.drawImage(image, 0, 0, canvas.width, canvas.height);

      const data = canvas.toDataURL("image/jpeg", 0.78);
      if (data.length > 1_000_000) {
        setError("That photo is too large. Choose a smaller image.");
        return;
      }
      setProfilePictureData(data);
      setError("");
    } catch (reason) {
      setError(reason.message || "That image could not be opened. Please choose another.");
    }
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
      const updated = user.role === "Prosumer"
        ? await updateProsumerProfile({ ...form, profilePictureData })
        : await updateMyStaffProfile({
          name: form.name,
          email: form.email,
          contactNumber: form.contactNumber,
          role: user.role,
          password: form.password || null,
          address: form.address,
          profilePictureData,
        });
      setProfile(updated);
      setProfilePictureData(updated.profilePictureData || "");
      updateUser({
        name: updated.name || user.name,
        profilePictureData: updated.profilePictureData || null,
      });
      setForm((current) => ({ ...current, password: "", confirmPassword: "" }));
      setNotice("Profile updated.");
    } catch (reason) {
      setError(reason.message || "Unable to save your profile.");
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
      setProfile((current) => ({
        ...current,
        accountStatus: updated.accountStatus || "DeactivationRequested",
      }));
      setNotice("Deactivation request sent to Backoffice.");
    } catch (reason) {
      setError(reason.message || "Unable to request account deactivation.");
    }
  }

  return (
    <div className="page account-page profile-page">
      <Link to="/dashboard" className="back-link">← Back to dashboard</Link>
      <header className="account-page-head">
        <div>
          <p className="eyebrow">Account</p>
          <h1>My profile</h1>
          <p className="lede">Your identity and access within the SolarGrid network.</p>
        </div>
        <button className="btn ghost" type="button" onClick={signOut}>Sign out</button>
      </header>

      {error ? <p className="form-error" role="alert">{error}</p> : null}
      {notice ? <p className="form-success" role="status">{notice}</p> : null}
      {loading ? <p className="hint">Loading profile…</p> : (
        <div className="profile-layout">
          <aside className="profile-summary">
            {profilePictureData
              ? <img className="profile-monogram profile-photo" src={profilePictureData} alt="Profile picture" />
              : <span className="profile-monogram" aria-hidden="true">{displayName.trim().slice(0, 1).toUpperCase()}</span>}
            <p className="eyebrow">{profilePictureData ? "PROFILE PICTURE" : "SOLARGRID ACCOUNT"}</p>
            <h2>{displayName}</h2>
            <div className="profile-chips">
              <span className="status-chip">{roleLabel}</span>
              <span className={`status-chip ${statusTone(statusLabel)}`}>{statusLabel}</span>
            </div>
            <dl>
              <div><dt>Username</dt><dd>{profile?.username || user.username || "—"}</dd></div>
              <div><dt>Account ID</dt><dd>{user.id}</dd></div>
              <div><dt>Account status</dt><dd>{statusLabel}</dd></div>
            </dl>
          </aside>

          <form className="account-form profile-form" onSubmit={save}>
            <div className="profile-form-head">
              <div><h2>Profile details</h2><p>Keep your contact information current.</p></div>
            </div>
            {canEdit ? (
              <div className="profile-picture-controls">
                <input
                  ref={pictureInput}
                  className="visually-hidden"
                  type="file"
                  accept="image/*"
                  onChange={chooseProfilePicture}
                  aria-label="Choose profile picture from gallery"
                />
                <button className="btn ghost" type="button" onClick={() => pictureInput.current?.click()}>
                  Choose profile picture
                </button>
                {profilePictureData ? (
                  <button className="btn ghost" type="button" onClick={() => setProfilePictureData("")}>
                    Remove photo
                  </button>
                ) : null}
                <span className="form-note">Choose an image from your device. It is resized before saving.</span>
              </div>
            ) : null}

            <div className="account-form-grid">
              <label>Full name<input name="name" value={form.name} onChange={updateField} disabled={!canEdit || loading} required /></label>
              <label>Username<input value={profile?.username || user.username || ""} disabled /></label>
              <label>Email address<input name="email" type="email" value={form.email} onChange={updateField} disabled={!canEdit || loading} required /></label>
              <label>Contact number<input name="contactNumber" type="tel" value={form.contactNumber} onChange={updateField} disabled={!canEdit || loading} required /></label>
              {user.role === "Prosumer" ? (
                <>
                  <label>Address<input name="address" value={form.address} onChange={updateField} disabled={loading} required /></label>
                  <label>NIC<input value={profile?.nic || ""} disabled /></label>
                </>
              ) : null}
              <label>Role<input value={roleLabel} disabled /></label>
              {isStaff ? (
                <>
                  <label>
                    Change password (optional)
                    <span className="user-password-input">
                      <input name="password" type={showPassword ? "text" : "password"} value={form.password} onChange={updateField} autoComplete="new-password" />
                      <button type="button" aria-label={showPassword ? "Hide password" : "Show password"} onClick={() => setShowPassword((visible) => !visible)}>
                        {showPassword ? "Hide" : "Show"}
                      </button>
                    </span>
                  </label>
                  <label>Confirm new password<input name="confirmPassword" type={showPassword ? "text" : "password"} value={form.confirmPassword} onChange={updateField} autoComplete="new-password" /></label>
                </>
              ) : null}
            </div>

            {isStaff ? (
              <ul className="password-rules staff-password-rules" aria-label="Password requirements">
                {passwordRules.map((rule) => (
                  <li key={rule.label} className={rule.met ? "met" : ""}>
                    <span aria-hidden="true">{rule.met ? "✓" : "·"}</span>{rule.label}
                  </li>
                ))}
              </ul>
            ) : null}

            <div className="form-actions">
              {canEdit ? (
                <button className="btn primary" type="submit" disabled={saving || loading}>
                  {saving ? "Saving…" : "Save profile"}
                </button>
              ) : (
                <p className="form-note">Profile editing is not available for this account.</p>
              )}
            </div>
            {user.role === "Prosumer" && statusLabel === "Active" ? (
              <div className="profile-deactivate">
                <div>
                  <strong>Close this account</strong>
                  <p>Send a deactivation request to Backoffice. You stay signed in until it is approved.</p>
                </div>
                <button className="btn ghost" type="button" onClick={requestDeactivation}>
                  Request deactivation
                </button>
              </div>
            ) : null}
          </form>
        </div>
      )}
    </div>
  );
}
