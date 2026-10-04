/**
 * App shell providers. DataProvider keeps reservation and transfer demo state in session storage. AuthProvider keeps the signed-in user from the JWT. Both sit above the router so every page can read them.
 */
import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { DataProvider } from "./context/DataContext";
import ConnectedRoutes from "./routes/ConnectedRoutes";

export default function ConnectedApp() {
  return (
    <DataProvider>
      <AuthProvider>
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <ConnectedRoutes />
        </BrowserRouter>
      </AuthProvider>
    </DataProvider>
  );
}