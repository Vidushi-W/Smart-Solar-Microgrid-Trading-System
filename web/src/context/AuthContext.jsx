import { createContext, useCallback, useContext, useState } from "react";
import { useData } from "./DataContext";

const AuthContext = createContext(null);
const AUTH_KEY = "solar-grid-session";

function loadSession() {
  try {
    const raw = sessionStorage.getItem(AUTH_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const { users } = useData();
  const [user, setUser] = useState(loadSession);

  const login = useCallback((email, password) => {
    const account = users.find(
      (item) => item.email.toLowerCase() === email.trim().toLowerCase()
    );
    if (!account || account.password !== password) {
      return { ok: false, message: "Email or password does not match." };
    }
    if (account.status !== "Active") {
      return {
        ok: false,
        message: "This account is deactivated. A Backoffice Officer can reactivate it.",
      };
    }
    const session = {
      id: account.id,
      name: account.name,
      email: account.email,
      role: account.role,
    };
    sessionStorage.setItem(AUTH_KEY, JSON.stringify(session));
    setUser(session);
    return { ok: true };
  }, [users]);

  const logout = useCallback(() => {
    sessionStorage.removeItem(AUTH_KEY);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, logout }}>{children}</AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return context;
}
