/**
 * Page title for the current path, a local clock, and a link to the profile.
 */
import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { titleForPath } from "../../constants/navigation";
import { useAuth } from "../../context/AuthContext";

function formatClock(date) {
  return new Intl.DateTimeFormat("en-LK", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(date);
}

export default function Topbar({ onMenu }) {
  const location = useLocation();
  const { user } = useAuth();
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <header className="topbar">
      <button type="button" className="menu-btn" onClick={onMenu}>
        Menu
      </button>
      <h1 className="top-title">{titleForPath(location.pathname)}</h1>
      <div className="top-meta">
        <span className="clock">{formatClock(now)}</span>
        <Link className="top-profile" to="/profile">
          <span className="top-profile-avatar">{(user.name || "S").slice(0, 1).toUpperCase()}</span>
          <span>{user.name || user.username}</span>
        </Link>
      </div>
    </header>
  );
}
