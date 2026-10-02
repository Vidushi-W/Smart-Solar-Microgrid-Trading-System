import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import AppShell from "../components/layout/AppShell";
import LoginPage from "../pages/auth/LoginPage";
import DashboardPage from "../pages/dashboard/DashboardPage";
import UsersPage from "../pages/users/UsersPage";
import ProsumersPage from "../pages/prosumers/ProsumersPage";
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
  if (user) return <Navigate to="/" replace />;
  return <LoginPage />;
}

function Protected({ roles, children }) {
  const { user, loading } = useAuth();
  if (loading) return <main className="boot-screen">Checking secure session…</main>;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return children;
}

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<GuestOnly />} />
      <Route
        element={
          <Protected>
            <AppShell />
          </Protected>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route
          path="users"
          element={
            <Protected roles={["Backoffice"]}>
              <UsersPage />
            </Protected>
          }
        />
        <Route
          path="prosumers"
          element={
            <Protected roles={["Backoffice"]}>
              <ProsumersPage />
            </Protected>
          }
        />
        <Route path="stations" element={<StationsPage />} />
        <Route
          path="stations/:stationId/slots"
          element={
            <Protected roles={["Backoffice"]}>
              <StationSlotsPage />
            </Protected>
          }
        />
        <Route path="slots" element={<BookingsPage />} />
        <Route path="reservations" element={<ReservationsPage />} />
        <Route
          path="reservations/new"
          element={
            <Protected roles={["Backoffice", "Prosumer"]}>
              <CreateReservationPage />
            </Protected>
          }
        />
        <Route path="reservations/:id" element={<ReservationDetailPage />} />
        <Route path="transactions" element={<TransactionsPage />} />
        <Route path="transactions/:id" element={<TransactionDetailPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
