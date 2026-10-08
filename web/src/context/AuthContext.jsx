/**
 * Signed-in user for the console. The JWT is kept in localStorage under authToken. On refresh, /auth/me rebuilds the user. A rejected token is deleted so a stale login does not stick.
 */
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { getCurrentUser, login as loginRequest } from "../services/authService";

const AuthContext = createContext(null);

// The API identity uses userId. The console stores that value as id.
function mapIdentity(identity) {
  return {
    id: identity.userId,
    name: identity.name || identity.username || identity.userId,
    username: identity.username,
    role: identity.role,
    profilePictureData: identity.profilePictureData || null,
  };
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
    getCurrentUser()
      .then((identity) => setUser(mapIdentity(identity)))
      .catch(() => {
        localStorage.removeItem("authToken");
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  // Store the token, then load /auth/me. If that call fails, delete the token so a half-finished login is not kept.
  const login = useCallback(async (identifier, password) => {
    const result = await loginRequest(identifier, password);
    localStorage.setItem("authToken", result.token);
    try {
      const identity = await getCurrentUser();
      const session = { ...mapIdentity(identity), role: identity.role || result.role };
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

  const updateUser = useCallback((updates) => {
    setUser((current) => current ? { ...current, ...updates } : current);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, updateUser }}>{children}</AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return context;
}
