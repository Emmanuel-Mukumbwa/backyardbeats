import { useContext } from "react";
import { AuthContext } from "../context/AuthContext";

export default function RequireRole({ roles, children }) {
  const { user } = useContext(AuthContext);
  if (!user || !roles.includes(user.role)) {
    return (
      <div style={{ padding: 32, textAlign: "center" }}>
        <h2>Access Denied</h2>
        <p>You do not have permission to view this page.</p>
        <button onClick={() => window.location.href = "/"}>Go Home</button>
      </div>
    );
  }
  return children;
}
