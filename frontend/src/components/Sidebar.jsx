import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { clearSession, getRole } from "../services/api";

export default function Sidebar({
  links = [],
  roleLabel,
  historyLinks = [],
}) {
  const navigate = useNavigate();

  const role = roleLabel || getRole() || "Workspace";
  const isDoctor = role.toLowerCase() === "doctor";

  const [historyOpen, setHistoryOpen] = useState(false);

  function handleLogout() {
    clearSession();
    navigate("/login", { replace: true });
  }

  function handleHistoryItemClick(onClick) {
    if (typeof onClick === "function") {
      onClick();
    }

    setHistoryOpen(false);
  }

  return (
    <aside
      className={`sidebar${isDoctor ? " sidebar-doctor" : ""}${
        historyOpen ? " history-open" : ""
      }`}
    >
      {isDoctor ? (
        <>
          {/* =====================================================
              DOCTOR SIDEBAR
              ===================================================== */}

          <div className="sidebar-doctor-brand">
            <div className="sidebar-brand-mark">
              <span>+</span>
            </div>

            <div className="sidebar-brand-text">
              <span className="sidebar-brand-title">
                Medical Record AI
              </span>

              <span className="sidebar-brand-subtitle">
                Clinical Workspace
              </span>
            </div>
          </div>

          <div className="sidebar-doctor-role">
            <span className="sidebar-doctor-role-dot" />
            <span>Doctor Workspace</span>
          </div>

          <nav className="sidebar-nav">
            {links
              .filter((link) => link.type !== "section")
              .map((link) => (
                <button
                  key={link.label}
                  type="button"
                  className={`sidebar-link${
                    link.active ? " active" : ""
                  }`}
                  onClick={link.onClick}
                >
                  <span
                    className="sidebar-link-icon"
                    aria-hidden="true"
                  >
                    {link.icon}
                  </span>

                  <span>{link.label}</span>
                </button>
              ))}
          </nav>

          {/* History */}

          <div className="sidebar-history-section">
            <button
              type="button"
              className={`sidebar-history-toggle${
                historyOpen ? " active" : ""
              }`}
              onClick={() => setHistoryOpen((open) => !open)}
              aria-expanded={historyOpen}
            >
              <span
                className="sidebar-link-icon"
                aria-hidden="true"
              >
                ◷
              </span>

              <span>History</span>

              <span
                className={`sidebar-history-chevron${
                  historyOpen ? " open" : ""
                }`}
                aria-hidden="true"
              >
                ›
              </span>
            </button>
          </div>

          <div className="sidebar-footer">
            <button
              type="button"
              className="sidebar-link sidebar-logout"
              onClick={handleLogout}
            >
              <span
                className="sidebar-link-icon"
                aria-hidden="true"
              >
                ↪
              </span>

              <span>Logout</span>
            </button>
          </div>

          {/* =====================================================
              HISTORY DRAWER
              ===================================================== */}

          {historyOpen && (
            <div
              className="sidebar-history"
              role="dialog"
              aria-label="History"
            >
              <div className="sidebar-history-header">
                <div>
                  <strong>History</strong>

                  <span>
                    Patient records and conversations
                  </span>
                </div>

                <button
                  type="button"
                  className="sidebar-history-close"
                  onClick={() => setHistoryOpen(false)}
                  aria-label="Close history"
                  title="Close"
                >
                  ×
                </button>
              </div>

              <div className="sidebar-history-list">
                {historyLinks.length > 0 ? (
                  historyLinks.map((item) => (
                    <button
                      key={item.label}
                      type="button"
                      className={`sidebar-history-item${
                        item.active ? " active" : ""
                      }`}
                      onClick={() =>
                        handleHistoryItemClick(item.onClick)
                      }
                    >
                      <span
                        className="sidebar-history-icon"
                        aria-hidden="true"
                      >
                        {item.icon}
                      </span>

                      <span>{item.label}</span>
                    </button>
                  ))
                ) : (
                  <div className="sidebar-history-empty">
                    No history available.
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      ) : (
        <>
          {/* =====================================================
              PATIENT / ADMIN SIDEBAR
              ===================================================== */}

          <div className="sidebar-brand">
            <div className="sidebar-brand-mark">
              <span>+</span>
            </div>

            <div className="sidebar-brand-text">
              <span className="sidebar-brand-title">
                Medical Record AI
              </span>

              <span className="sidebar-brand-subtitle">
                Clinical Workspace
              </span>
            </div>
          </div>

          <nav className="sidebar-nav">
            {links.map((link) => {
              if (link.type === "section") {
                return (
                  <div
                    key={`section-${link.label}`}
                    className="sidebar-section-label"
                  >
                    {link.label}
                  </div>
                );
              }

              return (
                <button
                  key={link.label}
                  type="button"
                  className={`sidebar-link${
                    link.active ? " active" : ""
                  }`}
                  onClick={link.onClick}
                >
                  <span
                    className="sidebar-link-icon"
                    aria-hidden="true"
                  >
                    {link.icon}
                  </span>

                  <span>{link.label}</span>
                </button>
              );
            })}
          </nav>

          <div className="sidebar-footer">
            <div className="sidebar-session-card">
              <span className="sidebar-session-dot" />

              <div>
                <strong>Secure session</strong>

                <span>
                  {role.charAt(0).toUpperCase() +
                    role.slice(1)}{" "}
                  workspace
                </span>
              </div>
            </div>

            <button
              type="button"
              className="sidebar-link sidebar-logout"
              onClick={handleLogout}
            >
              <span
                className="sidebar-link-icon"
                aria-hidden="true"
              >
                ↪
              </span>

              <span>Logout</span>
            </button>
          </div>
        </>
      )}
    </aside>
  );
}