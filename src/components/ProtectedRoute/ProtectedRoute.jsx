// src/components/ProtectedRoute/ProtectedRoute.jsx
// ─────────────────────────────────────────────────────────────────────────────
// WHAT THIS DOES:
// Acts as a "security guard" at each protected page door.
// 
// Flow:
//   1. Still loading auth? → Show a spinner (don't flash the page then redirect)
//   2. Not logged in? → Send to login page (/)
//   3. Logged in? → Let them through, render the page
// ─────────────────────────────────────────────────────────────────────────────

import { Navigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import Loader from "../Loader/Loader";

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  // Still checking if user is logged in — show spinner
  if (loading) return <Loader fullScreen />;

  // Not logged in — redirect to the auth page
  if (!user) return <Navigate to="/" replace />;

  // Logged in — render the protected page
  return children;
}
