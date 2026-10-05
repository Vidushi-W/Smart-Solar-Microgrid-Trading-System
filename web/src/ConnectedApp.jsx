/**
 * App shell providers. AuthProvider keeps the signed-in user from the JWT and sits above the router so every page can read it.
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