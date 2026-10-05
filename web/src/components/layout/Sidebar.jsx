/**
 * Navigation filtered by the signed-in role. Sign out clears the JWT and returns the user to the public pages.
 */
import { NavLink } from "react-router-dom";
import { NAV_ITEMS } from "../../constants/navigation";
import { ROLE_LABELS } from "../../constants/roles";
import { useAuth } from "../../context/AuthContext";
import Icon from "../common/Icon";
import SunMark from "../common/SunMark";

export default function Sidebar({ open, onNavigate }) {
  const { user, logout } = useAuth();
  const items = NAV_ITEMS.filter((item) => item.roles.includes(user.role));
  const initial = user.name.slice(0, 1);

  return (
    <aside className={`sidebar ${open ? "open" : ""}`}>
      <div className="brand">
        <SunMark size={28} />
        <div>
          <strong>Smart Solar</strong>
          <span>Microgrid</span>
        </div>
      </div>
      <div className="side-user">
        <span className="avatar">{initial}</span>
        <div>
          <strong>{user.name}</strong>
          <span>{ROLE_LABELS[user.role]}</span>
        </div>
      </div>
      <nav>
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            onClick={onNavigate}
            className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}
          >
            <Icon name={item.icon} />
            {item.roleLabels?.[user.role] || item.label}
          </NavLink>
        ))}
      </nav>
      <button type="button" className="nav-link side-logout" onClick={logout}>
        <Icon name="logout" />
        Sign out
      </button>
    </aside>
  );
}
