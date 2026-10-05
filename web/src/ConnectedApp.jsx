/**
 * AuthProvider restores the server identity. Operational data is loaded by API screens.
 */
import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import ConnectedRoutes from "./routes/ConnectedRoutes";

export default function ConnectedApp() {
  return (
      <AuthProvider>
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <ConnectedRoutes />
        </BrowserRouter>
      </AuthProvider>
  );
}
