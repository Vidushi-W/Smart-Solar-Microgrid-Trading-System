/**
 * Frame around signed-in pages: sidebar, top bar, and the session notice banner. The mobile menu closes when the route changes.
 */
import { useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { useData } from "../../context/DataContext";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";

export default function AppShell() {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const { notice, dismissNotice } = useData();

  useEffect(() => {
    setOpen(false);
    window.scrollTo(0, 0);
  }, [location.pathname]);

  return (
    <div className="shell">
      <Sidebar open={open} onNavigate={() => setOpen(false)} />
      {open ? (
        <button type="button" className="scrim" aria-label="Close menu" onClick={() => setOpen(false)} />
      ) : null}
      <div className="shell-main">
        <Topbar onMenu={() => setOpen(true)} />
        {notice ? (
          <div className={`banner ${notice.tone}`} role="status">
            <p>{notice.text}</p>
            <button type="button" onClick={dismissNotice}>
              Dismiss
            </button>
          </div>
        ) : null}
        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
