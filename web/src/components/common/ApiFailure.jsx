import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

export default function ApiFailure({ error, onRetry }) {
  const { logout } = useAuth();
  const navigate = useNavigate();
  if (!error) return null;
  const labels = { 0: "Connection unavailable", 400: "Check your request", 401: "Sign in required", 403: "Access denied", 404: "Record not found", 409: "Record changed or action unavailable" };
  return <div className="form-error" role="alert">
    <strong>{labels[error.status] || "Request failed"}</strong>
    <p>{error.message}</p>
    {error.status === 401 ? <button className="btn ghost" type="button" onClick={() => { logout(); navigate("/login"); }}>Sign in</button> : null}
    {onRetry ? <button className="btn ghost" type="button" onClick={onRetry}>Retry</button> : null}
  </div>;
}
