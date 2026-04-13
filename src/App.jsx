// src/App.jsx
// ─────────────────────────────────────────────────────────────────────────────
// WHAT THIS DOES:
// App.jsx is the "router" — it maps every URL path to a React page component.
// 
// Example:
//   User visits /home → renders the <Home /> component
//   User visits /verify?id=abc123 → renders the <Verify /> component
//
// ProtectedRoute wraps pages that need login. If the user isn't logged in
// and tries to visit /home, ProtectedRoute sends them to / (the login page).
// ─────────────────────────────────────────────────────────────────────────────

import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute/ProtectedRoute";

// Pages
import Auth from "./pages/Auth/Auth";
import Home from "./pages/Home/Home";
import Customize from "./pages/Customize/Customize";
import Recipients from "./pages/Recipients/Recipients";
import Generate from "./pages/Generate/Generate";
import Verify from "./pages/Verify/Verify";
import Profile from "./pages/Profile/Profile";

export default function App() {
  return (
    <BrowserRouter>
      {/* AuthProvider must wrap everything so all pages can read auth state */}
      <AuthProvider>
        <Routes>
          {/* ── Public Routes (no login required) ─────────────── */}
          <Route path="/" element={<Auth />} />
          {/* Verify page is public so QR code works for anyone */}
          <Route path="/verify" element={<Verify />} />

          {/* ── Protected Routes (login required) ─────────────── */}
          <Route path="/home" element={
            <ProtectedRoute><Home /></ProtectedRoute>
          } />
          <Route path="/customize" element={
            <ProtectedRoute><Customize /></ProtectedRoute>
          } />
          <Route path="/recipients" element={
            <ProtectedRoute><Recipients /></ProtectedRoute>
          } />
          <Route path="/generate" element={
            <ProtectedRoute><Generate /></ProtectedRoute>
          } />
          <Route path="/profile" element={
            <ProtectedRoute><Profile /></ProtectedRoute>
          } />

          {/* ── Fallback: unknown URL → go to login ───────────── */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
