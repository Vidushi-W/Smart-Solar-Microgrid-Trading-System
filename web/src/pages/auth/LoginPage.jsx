import { useState } from "react";
import { ROLE_LABELS } from "../../constants/roles";
import { useAuth } from "../../context/AuthContext";
import { useData } from "../../context/DataContext";
import SunMark from "../../components/common/SunMark";

const AREAS = [
  ["01", "Accounts", "Staff users and prosumer activation"],
  ["02", "Stations", "Nodes, coordinates, and energy slots"],
  ["03", "Reservations", "Requests, approval, and history"],
  ["04", "Transfers", "QR check and energy completion"],
];

export default function LoginPage() {
  const { login } = useAuth();
  const { users } = useData();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const demos = users.filter((user) => user.status === "Active");

  function submit(event) {
    event.preventDefault();
    const result = login(email, password);
    if (!result.ok) setError(result.message);
  }

  function signInAs(account) {
    const result = login(account.email, account.password);
    if (!result.ok) setError(result.message);
  }

  return (
    <div className="login-screen">
      <section className="login-panel">
        <div className="brand">
          <SunMark size={36} />
          <div>
            <strong>Smart Solar</strong>
            <span>Microgrid console</span>
          </div>
        </div>
        <h1>Welcome back</h1>
        <p>Backoffice and Grid Operator sign in here. Prosumers use the Android app.</p>
        <ul className="login-areas">
          {AREAS.map(([index, title, text]) => (
            <li key={index}>
              <span>{index}</span>
              <div>
                <strong>{title}</strong>
                <p>{text}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="login-form-wrap">
        <form className="login-card" onSubmit={submit}>
          <p className="login-kicker">Please enter your details</p>
          <h2>Sign in</h2>
          <label>
            Email
            <input
              type="email"
              autoComplete="username"
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                setError("");
              }}
              required
            />
          </label>
          <label>
            Password
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => {
                setPassword(event.target.value);
                setError("");
              }}
              required
            />
          </label>
          {error ? <p className="form-error">{error}</p> : null}
          <button type="submit" className="btn primary wide">
            Sign in
          </button>
          <p className="hint">Demo password: demo1234</p>
          <div className="demo-grid">
            {demos.map((account) => (
              <button key={account.id} type="button" className="demo-card" onClick={() => signInAs(account)}>
                <strong>{account.name}</strong>
                <span>{ROLE_LABELS[account.role]}</span>
              </button>
            ))}
          </div>
        </form>
      </section>
    </div>
  );
}
