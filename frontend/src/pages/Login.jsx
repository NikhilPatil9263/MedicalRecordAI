import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { login } from "../services/api";
import { decodeJwt } from "../utils/auth";

export default function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();

    setError("");

    if (!email || !password) {
      setError("Please enter both email and password.");
      return;
    }

    setLoading(true);

    try {
      const data = await login(email, password);

      const payload = decodeJwt(data.access_token);

      if (!payload || !payload.role) {
        throw new Error("Unexpected response from server.");
      }

      localStorage.setItem("access_token", data.access_token);
      localStorage.setItem("role", payload.role);

      navigate(`/${payload.role}`, {
        replace: true,
      });
    } catch (err) {
      setError(
        err.message ||
          "Login failed. Please check your credentials and try again."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modern-login-shell">
      {/* =====================================================
          LEFT BRAND PANEL
          ===================================================== */}

      <section className="login-visual-panel">
        <div className="login-visual-glow login-glow-one" />
        <div className="login-visual-glow login-glow-two" />

        <div className="login-visual-content">
          {/* Brand */}
          <div className="modern-login-brand">
            <div className="modern-login-brand-mark">
              <span>+</span>
            </div>

            <div>
              <div className="modern-login-brand-title">
                Medical Record AI
              </div>

              <div className="modern-login-brand-subtitle">
                Clinical Intelligence Platform
              </div>
            </div>
          </div>

          {/* Main message */}
          <div className="login-visual-heading">
            <div className="login-visual-eyebrow">
              AI-POWERED CLINICAL INTELLIGENCE
            </div>

            <h1>
              Intelligent medical
              <br />
              records, <span>simplified.</span>
            </h1>

            <p>
              Securely organize historical medical records and make relevant
              clinical information easier to access when it matters.
            </p>
          </div>

          {/* Feature list */}
          <div className="login-feature-list">
            <div className="login-feature">
              <div className="login-feature-icon">✓</div>

              <div>
                <strong>Secure patient records</strong>
                <span>Access is restricted to authorized users.</span>
              </div>
            </div>

            <div className="login-feature">
              <div className="login-feature-icon">⌁</div>

              <div>
                <strong>AI-assisted retrieval</strong>
                <span>Find relevant historical information faster.</span>
              </div>
            </div>

            <div className="login-feature">
              <div className="login-feature-icon">◈</div>

              <div>
                <strong>Source-backed information</strong>
                <span>Clinical context remains connected to records.</span>
              </div>
            </div>
          </div>

          {/* Decorative medical data card */}
          <div className="login-data-card">
            <div className="login-data-card-top">
              <div className="login-data-icon">+</div>

              <div>
                <span>CLINICAL WORKSPACE</span>
                <strong>Protected patient context</strong>
              </div>

              <div className="login-live-dot">
                <span />
                Secure
              </div>
            </div>

            <div className="login-data-lines">
              <span />
              <span />
              <span />
              <span />
              <span />
            </div>
          </div>
        </div>

        <div className="login-visual-footer">
          <span>Medical Record AI</span>
          <span className="login-footer-separator">•</span>
          <span>Secure Clinical Workspace</span>
        </div>
      </section>

      {/* =====================================================
          RIGHT LOGIN PANEL
          ===================================================== */}

      <section className="login-form-panel">
        <div className="login-form-container">
          {/* Mobile / compact brand */}
          <div className="login-mobile-brand">
            <div className="login-mobile-brand-mark">
              <span>+</span>
            </div>

            <div>
              <strong>Medical Record AI</strong>
              <span>Clinical Intelligence Platform</span>
            </div>
          </div>

          {/* Heading */}
          <div className="modern-login-heading">
            <div className="modern-login-eyebrow">
              SECURE ACCESS
            </div>

            <h2>Welcome back</h2>

            <p>
              Sign in to access your authorized clinical workspace.
            </p>
          </div>

          {/* Error */}
          {error && (
            <div
              className="modern-login-error"
              role="alert"
            >
              <div className="modern-login-error-icon">
                !
              </div>

              <div>
                <strong>Unable to sign in</strong>
                <span>{error}</span>
              </div>
            </div>
          )}

          {/* Form */}
          <form
            className="modern-login-form"
            onSubmit={handleSubmit}
          >
            {/* Email */}
            <div className="modern-login-field">
              <label htmlFor="email">
                Email address
              </label>

              <div className="modern-login-input-wrapper">
                <div className="modern-login-input-icon">
                  @
                </div>

                <input
                  id="email"
                  type="email"
                  className="modern-login-input"
                  placeholder="you@hospital.com"
                  value={email}
                  onChange={(event) =>
                    setEmail(event.target.value)
                  }
                  autoComplete="username"
                  disabled={loading}
                />
              </div>
            </div>

            {/* Password */}
            <div className="modern-login-field">
              <div className="modern-login-field-header">
                <label htmlFor="password">
                  Password
                </label>

                <span>
                  Authorized users only
                </span>
              </div>

              <div className="modern-login-input-wrapper">
                <div className="modern-login-input-icon password-icon">
                  •••
                </div>

                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  className="modern-login-input password-input"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(event) =>
                    setPassword(event.target.value)
                  }
                  autoComplete="current-password"
                  disabled={loading}
                />

                <button
                  type="button"
                  className="modern-password-toggle"
                  onClick={() =>
                    setShowPassword((current) => !current)
                  }
                  disabled={loading}
                  aria-label={
                    showPassword
                      ? "Hide password"
                      : "Show password"
                  }
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            {/* Sign in */}
            <button
              type="submit"
              className="modern-login-submit"
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="modern-login-spinner" />
                  Signing in...
                </>
              ) : (
                <>
                  <span>Sign in securely</span>
                  <span className="modern-login-arrow">
                    →
                  </span>
                </>
              )}
            </button>
          </form>

          {/* Security note */}
          <div className="modern-security-card">
            <div className="modern-security-icon">
              ✓
            </div>

            <div>
              <strong>Secure clinical environment</strong>

              <p>
                Your access is authenticated and limited to
                the permissions assigned to your account.
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="modern-login-bottom">
            <span className="modern-login-status">
              <span />
              Secure session
            </span>

            <span className="modern-login-bottom-divider">
              |
            </span>

            <span>
              Medical Record AI
            </span>
          </div>
        </div>
      </section>
    </div>
  );
}