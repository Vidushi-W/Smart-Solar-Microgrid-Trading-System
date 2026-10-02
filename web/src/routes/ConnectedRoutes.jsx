import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import AppShell from "../components/layout/AppShell";
import LandingPage from "../pages/LandingPage";
import ConnectedLoginPage from "../pages/auth/ConnectedLoginPage";
import AccountDashboardPage from "../pages/dashboard/AccountDashboardPage";
import AccountUsersPage from "../pages/users/AccountUsersPage";
import UserFormPage from "../pages/users/UserFormPage";
import ProsumerQueuePage from "../pages/prosumers/ProsumerQueuePage";
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

export default function ConnectedRoutes() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<GuestOnly />} />
      <Route element={<Protected><AppShell /></Protected>}>
        <Route path="dashboard" element={<AccountDashboardPage />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="users" element={<Protected roles={["Backoffice"]}><AccountUsersPage /></Protected>} />
        <Route path="users/new" element={<Protected roles={["Backoffice"]}><UserFormPage /></Protected>} />
        <Route path="users/:id/edit" element={<Protected roles={["Backoffice"]}><UserFormPage /></Protected>} />
        <Route path="prosumers/pending" element={<Protected roles={["Backoffice"]}><ProsumerQueuePage mode="pending" /></Protected>} />
        <Route path="prosumers/deactivated" element={<Protected roles={["Backoffice"]}><ProsumerQueuePage mode="deactivated" /></Protected>} />
        <Route path="stations" element={<StationsPage />} />
        <Route path="stations/:stationId/slots" element={<Protected roles={["Backoffice"]}><StationSlotsPage /></Protected>} />
        <Route path="slots" element={<BookingsPage />} />
        <Route path="reservations" element={<ReservationsPage />} />
        <Route path="reservations/new" element={<Protected roles={["Backoffice", "Prosumer"]}><CreateReservationPage /></Protected>} />
        <Route path="reservations/:id" element={<ReservationDetailPage />} />
        <Route path="transactions" element={<TransactionsPage />} />
        <Route path="transactions/:id" element={<TransactionDetailPage />} />
      </Route>
      <Route path="prosumers" element={<Navigate to="/prosumers/pending" replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}