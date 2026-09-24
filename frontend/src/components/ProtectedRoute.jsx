import { Navigate } from "react-router-dom";
import { getRole, getToken } from "../services/api";
import { isTokenExpired } from "../utils/auth";

export default function ProtectedRoute({ role, children }) {
  const token = getToken();
  const currentRole = getRole();

  if (!token || isTokenExpired(token)) {
    return <Navigate to="/login" replace />;
  }

  if (currentRole !== role) {
    return <Navigate to={`/${currentRole || "login"}`} replace />;
  }

  return children;
}
