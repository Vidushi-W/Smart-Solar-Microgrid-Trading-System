/**
 * Route table. The landing page and login are public. Every other screen sits inside AppShell. GuestOnly waits until a stored token has been checked. Protected sends anonymous visitors to login and the wrong role back to the dashboard.
 */
import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import AppShell from "../components/layout/AppShell";
import LandingPage from "../pages/LandingPage";
import ConnectedLoginPage from "../pages/auth/ConnectedLoginPage";
import SignupPage from "../pages/auth/SignupPage";
import AccountDashboardPage from "../pages/dashboard/AccountDashboardPage";
import AccountUsersPage from "../pages/users/AccountUsersPage";
import UserDetailsPage from "../pages/users/UserDetailsPage";
import UserFormPage from "../pages/users/UserFormPage";
import ProsumerQueuePage from "../pages/prosumers/ProsumerQueuePage";
import ProsumerManagementPage from "../pages/prosumers/ProsumerManagementPage";
import ProsumerAccountPage from "../pages/prosumers/ProsumerAccountPage";
import ProfilePage from "../pages/profile/ProfilePage";
import StationsPage from "../pages/stations/StationsPage";
import StationSlotsPage from "../pages/stations/StationSlotsPage";
import BookingsPage from "../pages/bookings/BookingsPage";
import ReservationsPage from "../pages/reservations/ReservationsPage";
import CreateReservationPage from "../pages/reservations/CreateReservationPage";
import ReservationDetailPage from "../pages/reservations/ReservationDetailPage";
import TransactionsPage from "../pages/transactions/TransactionsPage";
import TransactionDetailPage from "../pages/transactions/TransactionDetailPage";

function GuestOnly() {
  const { user, loading } = useAuth();
  if (loading) return <main className="boot-screen">Checking secure session…</main>;
  return user ? <Navigate to="/dashboard" replace /> : <ConnectedLoginPage />;
}

function Protected({ roles, children }) {
  const { user, loading } = useAuth();
  if (loading) return <main className="boot-screen">Checking secure session…</main>;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/dashboard" replace />;
  return children;
}

function GuestSignup() {
  const { user, loading } = useAuth();
  if (loading) return <main className="boot-screen">Checking secure session…</main>;
  return user ? <Navigate to="/dashboard" replace /> : <SignupPage />;
}

export default function ConnectedRoutes() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<GuestOnly />} />
        <Route path="/signup" element={<GuestSignup />} />
      <Route element={<Protected><AppShell /></Protected>}>
        <Route path="dashboard" element={<AccountDashboardPage />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="users" element={<Protected roles={["Backoffice"]}><AccountUsersPage /></Protected>} />
        <Route path="users/new" element={<Protected roles={["Backoffice"]}><UserFormPage /></Protected>} />
        <Route path="users/:id/view" element={<Protected roles={["Backoffice"]}><UserDetailsPage /></Protected>} />
        <Route path="users/:id/profile" element={<Protected roles={["Backoffice"]}><UserDetailsPage /></Protected>} />
        <Route path="users/:id" element={<Protected roles={["Backoffice"]}><UserDetailsPage /></Protected>} />
        <Route path="users/:id/edit" element={<Protected roles={["Backoffice"]}><UserFormPage /></Protected>} />
        <Route path="prosumers" element={<Protected roles={["Backoffice"]}><ProsumerManagementPage /></Protected>} />
        <Route path="prosumers/pending" element={<Protected roles={["Backoffice"]}><ProsumerQueuePage mode="pending" /></Protected>} />
        <Route path="prosumers/deactivated" element={<Protected roles={["Backoffice"]}><ProsumerQueuePage mode="deactivated" /></Protected>} />
        <Route path="prosumers/:nic/edit" element={<Protected roles={["Backoffice"]}><ProsumerAccountPage editing /></Protected>} />
        <Route path="prosumers/:nic" element={<Protected roles={["Backoffice"]}><ProsumerAccountPage /></Protected>} />
        <Route path="stations" element={<Protected roles={["Backoffice", "GridOperator"]}><StationsPage /></Protected>} />
        <Route path="stations/:stationId/slots" element={<Protected roles={["Backoffice", "GridOperator"]}><StationSlotsPage /></Protected>} />
        <Route path="slots" element={<Protected roles={["Backoffice", "GridOperator"]}><BookingsPage /></Protected>} />
        <Route path="reservations" element={<ReservationsPage />} />
        <Route path="reservations/new" element={<Protected roles={["Backoffice", "Prosumer"]}><CreateReservationPage /></Protected>} />
        <Route path="reservations/:id" element={<ReservationDetailPage />} />
        <Route path="transactions" element={<Protected roles={["Backoffice", "GridOperator"]}><TransactionsPage /></Protected>} />
        <Route path="transactions/:id" element={<Protected roles={["Backoffice", "GridOperator"]}><TransactionDetailPage /></Protected>} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}