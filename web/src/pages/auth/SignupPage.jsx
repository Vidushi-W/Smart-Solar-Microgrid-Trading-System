import { useState } from "react";
import { Link } from "react-router-dom";
import Icon from "../../components/common/Icon";
import SunMark from "../../components/common/SunMark";
import { ROLE_LABELS, SIGN_UP_ROLES } from "../../constants/roles";
import { registerProsumer } from "../../services/userService";
import { isPasswordStrong, passwordRequirements } from "../../utils/passwordPolicy";

const initialForm = {
  fullName: "",
  nic: "",
  email: "",
  phoneNumber: "",
  address: "",
  password: "",
  confirmPassword: "",
};

const nicPattern = /^(?:\d{12}|\d{9}[VX])$/i;
const phonePattern = /^\+?[0-9\s().-]+$/;

function isPhoneNumberValid(phoneNumber) {
  const normalized = phoneNumber.trim();
  const digitCount = normalized.replace(/\D/g, "").length;
  return phonePattern.test(normalized) && digitCount >= 7 && digitCount <= 15;
}

export default function SignupPage() {
  const [form, setForm] = useState(initialForm);
  const [role, setRole] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const rules = passwordRequirements(form.password);

  function updateField(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  }

  function resetForm() {
    setForm(initialForm);
    setRole("");
    setError("");
    setShowPassword(false);
    setShowConfirmPassword(false);
  }

  async function submit(event) {
    event.preventDefault();
    setError("");
    const nic = form.nic.trim().toUpperCase();
    if (!nicPattern.test(nic)) {
      setError("Enter a new-format NIC as 12 digits with no letters, or an older NIC as 9 digits followed by V or X. The letter must be at the end.");
      return;
    }
    if (!isPhoneNumberValid(form.phoneNumber)) {
      setError("Enter a valid phone number with 7 to 15 digits. You may include a leading +, spaces, parentheses, periods, or hyphens.");
      return;
    }
    if (!isPasswordStrong(form.password)) {
      setError("Choose a password that meets every requirement below.");
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError("The passwords do not match.");
      return;
    }
    if (!SIGN_UP_ROLES.some((choice) => choice.value === role)) {
      setError("Choose Backoffice Officer, Grid Operator, or Solar Prosumer.");
      return;
    }

    setSubmitting(true);
    try {
      const result = await registerProsumer({ ...form, nic, role });
      setSuccess(result.message || `Registration received as ${ROLE_LABELS[role]}. Your account is awaiting activation.`);
      setForm(initialForm);
      setRole("");
    } catch (reason) {
      setError(reason.message || "Registration could not be submitted.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="auth-page signup-page">
      <section className="auth-visual">
        <Link to="/" className="wordmark wordmark-light" aria-label="SolarGrid home"><SunMark size={34} /><span>Solar<span>Grid</span></span></Link>
        <div className="auth-visual-copy">
          <p className="hero-overline"><span /> COMMUNITY ENERGY</p>
          <h1>Make room<br />for <em>brighter.</em></h1>
          <p>Join a local network connecting solar energy, storage and the people who power their communities.</p>
        </div>
        <span className="auth-photo-credit">SOLAR MICROGRID TRADING · SRI LANKA</span>
      </section>
      <section className="auth-form-side signup-form-side">
        <Link className="auth-back" to="/">← Back to SolarGrid</Link>
        <div className="auth-card signup-card">
          {success ? (
            <div className="signup-success" role="status">
              <p className="eyebrow">REGISTRATION RECEIVED</p>
              <h2>You’re on the grid.</h2>
              <p className="auth-intro">{success}</p>
              <p className="signup-next-step">Your NIC will be your sign-in ID after your account is activated.</p>
              <Link className="btn primary auth-submit signup-back-login" to="/login">Return to sign in <span aria-hidden="true">↗</span></Link>
            </div>
          ) : (
            <>
              <p className="eyebrow">CREATE YOUR ACCOUNT</p>
              <h2>Join SolarGrid</h2>
              <p className="auth-intro">Choose your role once. After activation, sign-in opens that role.</p>
              <form onSubmit={submit} className="auth-form signup-form">
                <div className="role-picker" role="group" aria-label="Register as">
                  <p className="role-picker-label">Register as</p>
                  {SIGN_UP_ROLES.map((choice) => (
                    <button
                      key={choice.value}
                      type="button"
                      className={role === choice.value ? "role-card selected" : "role-card"}
                      aria-pressed={role === choice.value}
                      onClick={() => setRole(choice.value)}
                    >
                      <Icon name={choice.icon} size={18} />
                      <span>{choice.label}</span>
                    </button>
                  ))}
                </div>
                <label htmlFor="signup-name">Full name</label>
                <input id="signup-name" name="fullName" value={form.fullName} onChange={updateField} autoComplete="name" required />
                <label htmlFor="signup-nic">National ID (NIC)</label>
                <input id="signup-nic" name="nic" value={form.nic} onChange={updateField} autoComplete="off" pattern="(?:[0-9]{12}|[0-9]{9}[VvXx])" title="New format: 12 digits with no letters. Older format: 9 digits followed by V or X; the letter must be at the end." required />
                <p className="signup-field-note">New-format NICs contain exactly 12 digits and no letters. Older NICs contain 9 digits followed by V or X (at the end). Your NIC becomes your username after activation.</p>
                <label htmlFor="signup-email">Email address</label>
                <input id="signup-email" name="email" type="email" value={form.email} onChange={updateField} autoComplete="email" required />
                <label htmlFor="signup-phone">Phone number</label>
                <input id="signup-phone" name="phoneNumber" type="tel" value={form.phoneNumber} onChange={updateField} autoComplete="tel" aria-describedby="signup-phone-note" required />
                <p id="signup-phone-note" className="signup-field-note">Use 7 to 15 digits. A leading + and common separators are allowed.</p>
                <label htmlFor="signup-address">Address</label>
                <input id="signup-address" name="address" value={form.address} onChange={updateField} autoComplete="street-address" required />
                <label htmlFor="signup-password">Password</label>
                <div className="auth-password-field">
                  <input id="signup-password" name="password" type={showPassword ? "text" : "password"} value={form.password} onChange={updateField} autoComplete="new-password" required />
                  <button className="auth-password-toggle" type="button" aria-label={showPassword ? "Hide password" : "Show password"} aria-pressed={showPassword} onClick={() => setShowPassword((visible) => !visible)}>
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>
                <ul className="password-rules" aria-label="Password requirements">
                  {rules.map((rule) => <li key={rule.label} className={rule.met ? "met" : ""}><span aria-hidden="true">{rule.met ? "✓" : "·"}</span>{rule.label}</li>)}
                </ul>
                <label htmlFor="signup-confirm">Confirm password</label>
                <div className="auth-password-field">
                  <input id="signup-confirm" name="confirmPassword" type={showConfirmPassword ? "text" : "password"} value={form.confirmPassword} onChange={updateField} autoComplete="new-password" required />
                  <button className="auth-password-toggle" type="button" aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"} aria-pressed={showConfirmPassword} onClick={() => setShowConfirmPassword((visible) => !visible)}>
                    {showConfirmPassword ? "Hide" : "Show"}
                  </button>
                </div>
                {error ? <p className="form-error" role="alert">{error}</p> : null}
                <div className="signup-form-actions">
                  <button className="btn primary auth-submit" type="submit" disabled={submitting || !role}>
                    {submitting ? "Submitting…" : "Create account"}<span aria-hidden="true">↗</span>
                  </button>
                  <button className="signup-reset" type="button" onClick={resetForm} disabled={submitting}>Clear form</button>
                </div>
              </form>
              <div className="oauth-divider"><span />OR<span /></div>
              <button className="google-signup" type="button" disabled title="Google OAuth is not configured for this API.">
                <span className="google-mark" aria-hidden="true">G</span>Continue with Google
              </button>
              <p className="oauth-note">Google sign-up needs OAuth credentials and a backend callback, which are not configured yet.</p>
              <p className="auth-signup-link">Already registered? <Link to="/login">Sign in</Link></p>
            </>
          )}
        </div>
      </section>
    </main>
  );
}