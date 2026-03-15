// src/components/RequireRole.jsx
import React from "react";
import { useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import { Navigate, useLocation, useNavigate } from "react-router-dom";

/**
 * RequireRole
 * - roles: string or array of allowed roles (e.g. "admin" or ["admin","artist"])
 * - children: protected content
 *
 * Behavior:
 * - Shows Loading while AuthContext hydrates.
 * - If not authenticated, redirects to /login with redirectTo. 
 * - If authenticated but role not allowed, shows Access Denied UI.
 */
export default function RequireRole({ roles = [], children }) {
  const { user, loading } = useContext(AuthContext);
  const location = useLocation();
  const navigate = useNavigate();

  // Normalize roles to array
  const allowed = Array.isArray(roles) ? roles : [roles];

  if (loading) {
    return (
      <div style={{ padding: 24, textAlign: "center" }}>
        Loading...
      </div>
    );
  }

  // If not authenticated, send to login
  if (!user) {
    const redirectTo = encodeURIComponent(location.pathname + (location.search || ""));
    return <Navigate to={`/login?redirectTo=${redirectTo}`} replace />;
  }

  // If user has no role or role not in allowed list → Access Denied
  if (!user.role || !allowed.includes(user.role)) {
    return (
      <div style={{ padding: 32, textAlign: "center" }}>
        <h2>Access Denied</h2>
        <p>You do not have permission to view this page.</p>
        <div style={{ marginTop: 16 }}>
          <button
            type="button"
            onClick={() => navigate('/')}
            style={{
              padding: '8px 14px',
              borderRadius: 6,
              border: '1px solid #ccc',
              background: '#fff',
              cursor: 'pointer'
            }}
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  // Allowed — render children
  return children;
}
