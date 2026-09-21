import { useNavigate } from "react-router-dom";
import { clearSession } from "../services/api";

export default function Sidebar({ links }) {
  const navigate = useNavigate();

  function handleLogout() {
    clearSession();
    navigate("/login", { replace: true });
  }

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="sidebar-brand-mark">
          <span>+</span>
        </div>

        <div className="sidebar-brand-text">
          <span className="sidebar-brand-title">Medical Record AI</span>
          <span className="sidebar-brand-subtitle">Clinical Workspace</span>
        </div>
      </div>

      <nav className="sidebar-nav">
        {links.map((link) => {
          if (link.type === "section") {
            return (
              <div key={link.label} className="sidebar-section-label">
                {link.label}
              </div>
            );
          }

          return (
            <button
              key={link.label}
              className={`sidebar-link${link.active ? " active" : ""}`}
              onClick={link.onClick}
              type="button"
            >
              <span className="sidebar-link-icon" aria-hidden="true">
                {link.icon}
              </span>

              <span>{link.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-user-status">
          <span className="status-dot" />
          <div>
            <strong>Admin Workspace</strong>
            <span>Secure session</span>
          </div>
        </div>

        <button
          className="sidebar-link sidebar-logout"
          onClick={handleLogout}
          type="button"
        >
          <span className="sidebar-link-icon" aria-hidden="true">
            ↪
          </span>
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
}