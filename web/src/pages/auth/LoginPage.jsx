import { useState } from 'react';
import { login } from '../../services/authService.js';

export default function LoginPage({ onLogin }) {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const result = await login(identifier, password);
      localStorage.setItem('authToken', result.token);
      onLogin(result);
    } catch (loginError) {
      setError(loginError.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="login-shell">
      <section className="login-panel">
        <p className="eyebrow">Solar Microgrid Trading</p>
        <h1>Welcome back.</h1>
        <p className="subtitle">Sign in to continue to your operations workspace.</p>
        <form onSubmit={handleSubmit}>
          <label htmlFor="identifier">Username or NIC</label>
          <input
            id="identifier"
            value={identifier}
            onChange={(event) => setIdentifier(event.target.value)}
            autoComplete="username"
            required
          />
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
            required
          />
          {error && <p className="error" role="alert">{error}</p>}
          <button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Signing in...' : 'Login'}
          </button>
        </form>
      </section>
      <aside className="login-aside">
        <span className="sun-mark">SM</span>
        <p>One connected view for cleaner energy operations.</p>
      </aside>
    </main>
  );
}
