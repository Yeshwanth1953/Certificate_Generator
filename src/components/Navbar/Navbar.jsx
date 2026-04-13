// src/components/Navbar/Navbar.jsx
// The top navigation bar — shows on all protected pages.
// Contains: logo, page links, and logout button.

import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import "./Navbar.css";

export default function Navbar() {
  const { user, userProfile, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  const navLinks = [
    { path: "/home",    label: "Home",    icon: "🏠" },
    { path: "/profile", label: "Profile", icon: "👤" },
  ];

  return (
    <nav className="navbar glass">
      <div className="navbar-inner">
        {/* Logo */}
        <Link to="/home" className="navbar-logo">
          <span className="logo-icon">⬡</span>
          <span>Certify<span className="logo-gold">Pro</span></span>
        </Link>

        {/* Navigation Links */}
        <div className="navbar-links">
          {navLinks.map(link => (
            <Link
              key={link.path}
              to={link.path}
              className={`nav-link ${location.pathname === link.path ? "active" : ""}`}
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* Right side: user + logout */}
        <div className="navbar-right">
          <div className="nav-user">
            <div className="nav-avatar">
              {userProfile?.photoURL
                ? <img src={userProfile.photoURL} alt="avatar" />
                : <span>{(userProfile?.name || user?.email || "U")[0].toUpperCase()}</span>
              }
            </div>
            <span className="nav-username">{userProfile?.name || "User"}</span>
          </div>
          <button className="btn-ghost nav-logout" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </div>
    </nav>
  );
}
