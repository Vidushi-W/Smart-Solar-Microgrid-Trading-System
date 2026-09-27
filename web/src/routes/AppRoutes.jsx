import { useEffect } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useData } from "../context/DataContext";
import AppShell from "../components/layout/AppShell";
import LoginPage from "../pages/auth/LoginPage";
import DashboardPage from "../pages/dashboard/DashboardPage";
import UsersPage from "../pages/users/UsersPage";
import ProsumersPage from "../pages/prosumers/ProsumersPage";
import StationsPage from "../pages/stations/StationsPage";
import BookingsPage from "../pages/bookings/BookingsPage";
import ReservationsPage from "../pages/reservations/ReservationsPage";
import ReservationDetailPage from "../pages/reservations/ReservationDetailPage";
import TransactionsPage from "../pages/transactions/TransactionsPage";
import TransactionDetailPage from "../pages/transactions/TransactionDetailPage";
import ContractsPage from "../pages/team/ContractsPage";

function GuestOnly() {
  const { user } = useAuth();
  if (user) return <Navigate to="/" replace />;
  return <LoginPage />;
}

function Protected({ roles, children }) {
  const { user, logout } = useAuth();
  const { users } = useData();
  const record = user ? users.find((item) => item.id === user.id) : null;
  const sessionEnded = Boolean(user) && (!record || record.status !== "Active");

  useEffect(() => {
    if (sessionEnded) logout();
  }, [sessionEnded, logout]);

  if (!user || sessionEnded) return <Navigate to="/login" replace />;
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
        <Route path="slots" element={<BookingsPage />} />
        <Route path="reservations" element={<ReservationsPage />} />
        <Route path="reservations/:id" element={<ReservationDetailPage />} />
        <Route path="transactions" element={<TransactionsPage />} />
        <Route path="transactions/:id" element={<TransactionDetailPage />} />
        <Route path="contracts" element={<ContractsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
