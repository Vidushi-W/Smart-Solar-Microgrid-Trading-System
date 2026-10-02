import { useEffect, useState } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { DataProvider } from './context/DataContext';
import AppRoutes from './routes/AppRoutes';
import LoginPage from './pages/auth/LoginPage.jsx';
import UserManagementPage from './pages/users/UserManagementPage.jsx';
import { getCurrentUser } from './services/authService.js';

function RoleHome({ session, onLogout }) {
  const titles = {
    Backoffice: 'Backoffice workspace',
    GridOperator: 'Grid Operator workspace',
    Prosumer: 'Prosumer accounts belong in the mobile app'
  };
  const title = titles[session.role] ?? 'Access unavailable';
  const isWebRole = session.role === 'Backoffice' || session.role === 'GridOperator';

  useEffect(() => {
    getCurrentUser().catch(() => {
      localStorage.removeItem('authToken');
      onLogout();
    });
  }, []);

  if (session.role === 'Backoffice') {
    return <UserManagementPage onLogout={onLogout} />;
  }

  return (
    <main className="workspace-shell">
      <header className="workspace-header">
        <div>
          <p className="eyebrow">Solar Microgrid Trading</p>
          <h1>{title}</h1>
        </div>
        <button className="secondary-button" onClick={onLogout}>Log out</button>
      </header>
      <section className="welcome-strip">
        <span className="status-dot" />
        <div>
          <strong>Login successful</strong>
          <p>{isWebRole ? `Signed in as ${session.role}.` : 'Prosumer workflows are available through Android.'}</p>
        </div>
      </section>
    </main>
  );
}

export default function App() {
  return (
    <DataProvider>
      <AuthProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </AuthProvider>
    </DataProvider>
  );
}
