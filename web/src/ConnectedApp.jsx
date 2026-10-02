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