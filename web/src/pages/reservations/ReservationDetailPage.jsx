/**
 * Reservation details. Prosumers and staff each read GET /api/reservations/{id}.
 */
import { useAuth } from "../../context/AuthContext";
import ProsumerReservationDetailPage from "./ProsumerReservationDetailPage";
import StaffReservationDetailPage from "./StaffReservationDetailPage";

export default function ReservationDetailPage() {
  const { user } = useAuth();
  if (user.role === "Prosumer") return <ProsumerReservationDetailPage />;
  return <StaffReservationDetailPage />;
}
