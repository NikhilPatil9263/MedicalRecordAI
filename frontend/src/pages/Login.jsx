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
      <section className="login-visual-panel">
        <div className="login-visual-glow login-glow-one" />
        <div className="login-visual-glow login-glow-two" />

        <div className="login-visual-content">
          <div className="modern-login-brand">
            <div className="modern-login-brand-mark">
              <span>+</span>
            </div>

            <div>
              <div className="modern-login-brand-title">
                Medical Record AI
              </div>

              <div className="modern-login-brand-subtitle">
                Clinical Workspace
              </div>
            </div>
          </div>

          <div className="login-visual-heading">
            <div className="login-visual-eyebrow">
              SECURE CLINICAL PLATFORM
            </div>

            <h1>
              Medical records,
              <br />
              <span>organized intelligently.</span>
            </h1>

            <p>
              A focused workspace for patients, doctors, and
              administrators to manage historical medical
              records securely.
            </p>
          </div>

          <div className="login-feature-list">
            <div className="login-feature">
              <div className="login-feature-icon">
                ✓
              </div>

              <div>
                <strong>Secure patient records</strong>

                <span>
                  Role-based access and protected sessions.
                </span>
              </div>
            </div>

            <div className="login-feature">
              <div className="login-feature-icon">
                ✦
              </div>

              <div>
                <strong>AI-assisted retrieval</strong>

                <span>
                  Find relevant historical context faster.
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="login-form-panel">
        <div className="login-form-container">
          <div className="login-mobile-brand">
            <div className="login-mobile-brand-mark">
              <span>+</span>
            </div>

            <div>
              <strong>Medical Record AI</strong>

              <span>Clinical Workspace</span>
            </div>
          </div>

          <div className="modern-login-heading">
            <div className="modern-login-eyebrow">
              WELCOME BACK
            </div>

            <h2>Sign in to your workspace</h2>

            <p>
              Use your registered account to continue.
            </p>
          </div>

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

          <form
            className="modern-login-form"
            onSubmit={handleSubmit}
          >
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
                  placeholder="you@example.com"
                  value={email}
                  onChange={(event) =>
                    setEmail(event.target.value)
                  }
                  autoComplete="username"
                  disabled={loading}
                />
              </div>
            </div>

            <div className="modern-login-field">
              <label htmlFor="password">
                Password
              </label>

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
                  title={
                    showPassword
                      ? "Hide password"
                      : "Show password"
                  }
                >
                  {showPassword ? (
                    <svg
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path d="M3 3l18 18" />
                      <path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" />
                      <path d="M9.9 5.2A10.7 10.7 0 0 1 12 5c5 0 8.7 3.4 10 7-0.5 1.4-1.4 2.6-2.5 3.7" />
                      <path d="M6.2 6.2C4.6 7.3 3.4 9 2 12c1.3 3.6 5 7 10 7 1 0 1.9-.1 2.8-.4" />
                    </svg>
                  ) : (
                    <svg
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path d="M2 12s3.7-7 10-7 10 7 10 7-3.7 7-10 7S2 12 2 12Z" />
                      <circle cx="12" cy="12" r="2.5" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

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
        </div>
      </section>
    </div>
  );
}
