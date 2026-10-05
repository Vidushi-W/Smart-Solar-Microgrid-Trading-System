/**
 * Signed-in user for the console. The JWT is kept in localStorage under authToken. On refresh, /auth/me rebuilds the user. A rejected token is deleted so a stale login does not stick.
 */
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { getCurrentUser, login as loginRequest } from "../services/authService";

const AuthContext = createContext(null);

// Local sign-in for building screens while the account API is not ready. Vite strips this in production builds.
const DEV_TEST_TOKEN = "dev-test-session";
const DEV_TEST_USER = {
  id: "geethma-test",
  name: "Geethma Perera",
  username: "geethma",
  role: "Backoffice",
};

function isDevTestLogin(identifier, password) {
  return import.meta.env.DEV
    && identifier.trim().toLowerCase() === "geethma"
    && password === "geethma123";
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedToken = localStorage.getItem("authToken");
    if (!storedToken) {
      setLoading(false);
      return;
    }
    if (storedToken === DEV_TEST_TOKEN) {
      if (import.meta.env.DEV) setUser(DEV_TEST_USER);
      else localStorage.removeItem("authToken");
      setLoading(false);
      return;
    }
    getCurrentUser()
      .then((identity) => setUser({
        id: identity.userId,
        name: identity.name || identity.username || identity.userId,
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
    if (isDevTestLogin(identifier, password)) {
      localStorage.setItem("authToken", DEV_TEST_TOKEN);
      setUser(DEV_TEST_USER);
      return DEV_TEST_USER;
    }
    const result = await loginRequest(identifier, password);
    localStorage.setItem("authToken", result.token);
    try {
      const identity = await getCurrentUser();
      const session = {
        id: identity.userId,
        name: identity.name || identity.username || identity.userId,
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
