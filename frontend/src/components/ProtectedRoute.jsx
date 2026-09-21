import { Navigate } from "react-router-dom";
import { getToken, getRole } from "../services/api";
import { isTokenExpired } from "../utils/auth";

/**
 * Guards a route so only an authenticated user with the right role can see it.
 * Redirects to /login when there's no valid token, or to the user's own
 * portal when the role doesn't match.
 */
export default function ProtectedRoute({ role, children }) {
  const token = getToken();
  const currentRole = getRole();

  if (!token || isTokenExpired(token)) {
    return <Navigate to="/login" replace />;
  }

  if (role && currentRole !== role) {
    return <Navigate to={`/${currentRole || "login"}`} replace />;
  }

  return children;
}
