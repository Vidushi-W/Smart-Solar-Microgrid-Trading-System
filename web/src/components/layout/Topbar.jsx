import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { titleForPath } from "../../constants/navigation";
import { useData } from "../../context/DataContext";

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
  const { resetDemo } = useData();
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
        <button type="button" className="btn ghost light" onClick={resetDemo}>
          Reset
        </button>
      </div>
    </header>
  );
}
