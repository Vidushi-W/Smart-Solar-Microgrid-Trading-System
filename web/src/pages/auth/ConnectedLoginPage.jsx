/**
 * Sign-in form. Submits a username, email, or NIC and a password, then opens the role-aware dashboard after AuthContext stores the session.
 */
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Icon from "../../components/common/Icon";
import SunMark from "../../components/common/SunMark";
import { homeForVerifiedRole, ROLES, SIGN_UP_ROLES } from "../../constants/roles";
import { useAuth } from "../../context/AuthContext";

export default function ConnectedLoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [role, setRole] = useState("");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setError("");
    if (!SIGN_UP_ROLES.some((choice) => choice.value === role)) {
      setError("Choose Backoffice, Grid Operator, or Solar Prosumer before signing in.");
      return;
    }
    setSubmitting(true);
    try {
      const session = await login(identifier, password, role);
      navigate(homeForVerifiedRole(session.role), { replace: true });
    } catch (reason) {
      setError(reason.message || "Unable to sign in.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-visual">
        <Link to="/" className="wordmark wordmark-light" aria-label="SolarGrid home"><SunMark size={34} /><span>Solar<span>Grid</span></span></Link>
        <div className="auth-visual-copy">
          <p className="hero-overline"><span /> OPERATIONS PORTAL</p>
          <h1>Energy, in<br /><em>good hands.</em></h1>
          <p>Connected workspaces for the people building a brighter, more resilient grid.</p>
        </div>
        <span className="auth-photo-credit">SOLAR MICROGRID TRADING · SRI LANKA</span>
      </section>
      <section className="auth-form-side">
        <Link className="auth-back" to="/">← Back to SolarGrid</Link>
        <div className="auth-card">
          <p className="eyebrow">Secure access</p>
          <h2>Welcome back</h2>
          <p className="auth-intro">Use your assigned username, email, or NIC to continue.</p>
          <form onSubmit={submit} className="auth-form">
            <div className="role-picker" role="group" aria-label="Sign in as (required)">
              <p className="role-picker-label">Sign in as (required)</p>
              {SIGN_UP_ROLES.map((choice) => (
                <button
                  key={choice.value}
                  type="button"
                  className={role === choice.value ? "role-card selected" : "role-card"}
                  aria-pressed={role === choice.value}
                  disabled={submitting}
                  onClick={() => setRole(choice.value)}
                >
                  <Icon name={choice.icon} size={18} />
                  <span>{choice.value === ROLES.BACKOFFICE ? "Backoffice" : choice.label}</span>
                </button>
              ))}
            </div>
            <label htmlFor="auth-identifier">Username, email, or NIC</label>
            <input id="auth-identifier" value={identifier} onChange={(event) => setIdentifier(event.target.value)} autoComplete="username" required />
            <label htmlFor="auth-password">Password</label>
            <div className="auth-password-field">
              <input id="auth-password" type={showPassword ? "text" : "password"} value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" required />
              <button
                className="auth-password-toggle"
                type="button"
                aria-label={showPassword ? "Hide password" : "Show password"}
                aria-pressed={showPassword}
                onClick={() => setShowPassword((visible) => !visible)}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
            {error ? <p className="form-error" role="alert">{error}</p> : null}
            <button className="btn primary auth-submit" type="submit" disabled={submitting || !role}>
              {submitting ? "Signing in…" : "Sign in"}<span aria-hidden="true">↗</span>
            </button>
          </form>
          <p className="auth-signup-link">Don&apos;t have an account? <Link to="/signup">Sign Up</Link></p>
          <p className="auth-security">Role-based access · encrypted session</p>
        </div>
      </section>
    </main>
  );
}
