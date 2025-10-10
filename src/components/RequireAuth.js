import { useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import { Navigate, useLocation } from "react-router-dom";

export default function RequireAuth({ children }) {
  const { user } = useContext(AuthContext);
  const location = useLocation();
  if (!user?.token) {
    return <Navigate to={`/login?redirectTo=${location.pathname}`} replace />;
  }
  return children;
}
