import { createContext, useCallback, useContext, useState } from "react";
import { useEffect } from "react";
import { getCurrentUser, login as loginRequest } from "../services/authService";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!localStorage.getItem("authToken")) {
      setLoading(false);
      return;
    }
    getCurrentUser()
      .then((identity) => setUser({
        id: identity.userId,
        name: identity.username || identity.userId,
        username: identity.username,
        role: identity.role,
      }))
      .catch(() => {
        localStorage.removeItem("authToken");
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (identifier, password) => {
    const result = await loginRequest(identifier, password);
    localStorage.setItem("authToken", result.token);
    try {
      const identity = await getCurrentUser();
      const session = {
        id: identity.userId,
        name: identity.username || identity.userId,
        username: identity.username,
        role: identity.role || result.role,
      };
      setUser(session);
      return session;
    } catch (error) {
      localStorage.removeItem("authToken");
      throw error;
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("authToken");
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>{children}</AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return context;
}
