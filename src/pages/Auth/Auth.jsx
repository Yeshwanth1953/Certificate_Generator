// src/pages/Auth/Auth.jsx
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// WHAT THIS PAGE DOES:
// This is the entry page of CertifyPro â€” the login/signup gate.
//
// FLOW:
// [Tab: Login]
//   User enters email + password â†’ Firebase verifies â†’ if email IS verified â†’ go to /home
//   If email not verified â†’ show "Please verify your email first"
//
// [Tab: Sign Up]
//   User enters name + email + password + confirm password
//   â†’ Firebase creates account (blocks duplicates automatically)
//   â†’ Sends a verification email (this is our "OTP" step)
//   â†’ Shows "Check your email" state
//   â†’ User clicks link in email â†’ comes back and logs in
//
// Firebase handles NO DUPLICATE ACCOUNTS automatically.
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendEmailVerification,
  browserLocalPersistence,
  setPersistence,
} from "firebase/auth";
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../../firebase/config";
import { useAuth } from "../../context/AuthContext";
import "./Auth.css";

export default function Auth() {
  const navigate = useNavigate();
  const { user } = useAuth();

  // If already logged in, skip to home
  useEffect(() => {
    if (user) navigate("/home");
  }, [user, navigate]);

  // Which tab is open: "login" or "signup"
  const [tab, setTab] = useState("login");

  // Form fields
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // After signup, show "verify email" screen
  const [verifyEmailSent, setVerifyEmailSent] = useState(false);

  // Show/hide password
  const [showPass, setShowPass] = useState(false);

  const clearMessages = () => { setError(""); setSuccess(""); };

  // â”€â”€ SIGN UP â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const handleSignup = async (e) => {
    e.preventDefault();
    clearMessages();

    // Basic validation
    if (!name.trim()) return setError("Please enter your full name.");
    if (password.length < 6) return setError("Password must be at least 6 characters.");
    if (password !== confirmPassword) return setError("Passwords don't match.");

    setLoading(true);
    try {
      // 1. Create account in Firebase Authentication
      // Firebase automatically BLOCKS duplicate emails â€” returns error if already exists
      const cred = await createUserWithEmailAndPassword(auth, email, password);

      // 2. Send verification email (this is our email OTP step)
      await sendEmailVerification(cred.user);

      // 3. Save user profile to Firestore database
      await setDoc(doc(db, "users", cred.user.uid), {
        name: name.trim(),
        email: email.toLowerCase(),
        photoURL: "",
        organization: "",
        totalCertificates: 0,
        totalRecipients: 0,
        createdAt: serverTimestamp(),
        lastLogin: serverTimestamp(),
      });

      // 4. Show verification pending screen
      setVerifyEmailSent(true);

    } catch (err) {
      console.error("Signup error:", err.code, err.message);
      const msgs = {
        "auth/email-already-in-use": "An account with this email already exists. Please log in.",
        "auth/invalid-email": "Please enter a valid email address.",
        "auth/weak-password": "Password is too weak. Use at least 6 characters.",
        "auth/network-request-failed": "Network error. Check your internet connection.",
        "auth/operation-not-allowed": "Email/Password sign-in is not enabled in Firebase Console → Authentication → Sign-in method.",
        "auth/configuration-not-found": "Firebase Auth config error. Check your .env keys.",
      };
      setError(msgs[err.code] || ("Error [" + err.code + "]: " + err.message));
    }
    setLoading(false);
  };

  // â”€â”€ LOGIN â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const handleLogin = async (e) => {
    e.preventDefault();
    clearMessages();
    setLoading(true);

    try {
      // Keep user logged in across browser sessions
      await setPersistence(auth, browserLocalPersistence);

      // Sign in with Firebase
      const cred = await signInWithEmailAndPassword(auth, email, password);

      // Check if they verified their email yet
      if (!cred.user.emailVerified) {
        setError("Please verify your email first. Check your inbox for the verification link.");
        setLoading(false);
        return;
      }

      // âœ… Valid login â€” update lastLogin timestamp in Firestore
      // This is how we track the 24-hour session
      const userRef = doc(db, "users", cred.user.uid);
      const snap = await getDoc(userRef);

      if (snap.exists()) {
        await setDoc(userRef, { lastLogin: serverTimestamp() }, { merge: true });
      } else {
        // Create profile if missing (edge case)
        await setDoc(userRef, {
          name: cred.user.displayName || email.split("@")[0],
          email: email.toLowerCase(),
          photoURL: "",
          organization: "",
          totalCertificates: 0,
          totalRecipients: 0,
          createdAt: serverTimestamp(),
          lastLogin: serverTimestamp(),
        });
      }

      navigate("/home");

    } catch (err) {
      const msgs = {
        "auth/user-not-found": "No account found with this email. Please sign up first.",
        "auth/wrong-password": "Incorrect password. Please try again.",
        "auth/invalid-credential": "Incorrect email or password.",
        "auth/too-many-requests": "Too many failed attempts. Please try again later.",
        "auth/network-request-failed": "Network error. Check your internet connection.",
      };
      setError(msgs[err.code] || "Login failed. Please check your credentials.");
    }
    setLoading(false);
  };

  // Resend verification email
  const resendVerification = async () => {
    if (auth.currentUser) {
      await sendEmailVerification(auth.currentUser);
      setSuccess("Verification email resent! Check your inbox.");
    }
  };

  // â”€â”€ VERIFY EMAIL SENT SCREEN â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  if (verifyEmailSent) {
    return (
      <div className="auth-page">
        <div className="auth-bg-orbs" />
        <div className="auth-card glass animate-scale">
          <div className="verify-icon">ðŸ“§</div>
          <h2 className="verify-title">Check Your Email</h2>
          <p className="verify-text">
            We sent a verification link to <strong>{email}</strong>.
            Click the link in that email to activate your account.
          </p>
          <div className="verify-steps">
            <div className="verify-step">
              <span className="vs-num">1</span>
              <span>Open your email inbox</span>
            </div>
            <div className="verify-step">
              <span className="vs-num">2</span>
              <span>Find the email from CertifyPro</span>
            </div>
            <div className="verify-step">
              <span className="vs-num">3</span>
              <span>Click "Verify Email" in that email</span>
            </div>
            <div className="verify-step">
              <span className="vs-num">4</span>
              <span>Come back here and log in âœ“</span>
            </div>
          </div>
          <button className="btn-primary" style={{ width: "100%" }}
            onClick={() => { setVerifyEmailSent(false); setTab("login"); }}>
            Go to Login
          </button>
          <button className="btn-ghost" style={{ width: "100%", marginTop: "10px" }}
            onClick={resendVerification}>
            Resend Verification Email
          </button>
          {success && <p className="auth-success">{success}</p>}
        </div>
      </div>
    );
  }

  // â”€â”€ MAIN AUTH UI â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  return (
    <div className="auth-page">
      <div className="auth-bg-orbs" />

      {/* Left side â€” branding */}
      <div className="auth-brand animate-fade">
        <div className="brand-logo">
          <span className="brand-icon">â¬¡</span>
          <span>Certify<span style={{ color: "var(--gold)" }}>Pro</span></span>
        </div>
        <h1 className="brand-headline">
          Create Professional<br />
          <span className="gold-text">Certificates</span> That<br />
          Actually Matter
        </h1>
        <p className="brand-sub">
          Upload your template, add recipients, and generate
          verified, QR-signed certificates in minutes.
        </p>
        <div className="brand-features">
          {["ðŸ” QR Code Verification", "ðŸ“¦ Bulk CSV Generation", "ðŸ”— LinkedIn Sharing", "âš¡ Instant Download"].map(f => (
            <div key={f} className="brand-feat">{f}</div>
          ))}
        </div>
      </div>

      {/* Right side â€” auth form */}
      <div className="auth-form-side animate-scale">
        <div className="auth-card glass">
          {/* Tabs */}
          <div className="auth-tabs">
            <button
              className={`auth-tab ${tab === "login" ? "active" : ""}`}
              onClick={() => { setTab("login"); clearMessages(); }}
            >Login</button>
            <button
              className={`auth-tab ${tab === "signup" ? "active" : ""}`}
              onClick={() => { setTab("signup"); clearMessages(); }}
            >Sign Up</button>
          </div>

          {/* Error / Success Messages */}
          {error && <div className="auth-alert auth-alert-error">âš  {error}</div>}
          {success && <div className="auth-alert auth-alert-success">âœ“ {success}</div>}

          {/* â”€â”€ LOGIN FORM â”€â”€ */}
          {tab === "login" && (
            <form onSubmit={handleLogin} className="auth-form">
              <div className="input-group">
                <label className="input-label">Email Address</label>
                <input
                  className="input-field"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>
              <div className="input-group">
                <label className="input-label">Password</label>
                <div className="input-password-wrap">
                  <input
                    className="input-field"
                    type={showPass ? "text" : "password"}
                    placeholder="Your password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                  />
                  <button type="button" className="pass-toggle" onClick={() => setShowPass(!showPass)}>
                    {showPass ? "ðŸ™ˆ" : "ðŸ‘"}
                  </button>
                </div>
              </div>
              <button className="btn-primary auth-submit" type="submit" disabled={loading}>
                {loading ? <span className="btn-spinner" /> : "Login to CertifyPro"}
              </button>
              <p className="auth-switch">
                Don't have an account?{" "}
                <button type="button" className="link-btn"
                  onClick={() => { setTab("signup"); clearMessages(); }}>
                  Sign Up
                </button>
              </p>
            </form>
          )}

          {/* â”€â”€ SIGNUP FORM â”€â”€ */}
          {tab === "signup" && (
            <form onSubmit={handleSignup} className="auth-form">
              <div className="input-group">
                <label className="input-label">Full Name</label>
                <input
                  className="input-field"
                  type="text"
                  placeholder="John Doe"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  required
                  autoComplete="name"
                />
              </div>
              <div className="input-group">
                <label className="input-label">Email Address</label>
                <input
                  className="input-field"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>
              <div className="input-group">
                <label className="input-label">Password</label>
                <div className="input-password-wrap">
                  <input
                    className="input-field"
                    type={showPass ? "text" : "password"}
                    placeholder="Minimum 6 characters"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    autoComplete="new-password"
                  />
                  <button type="button" className="pass-toggle" onClick={() => setShowPass(!showPass)}>
                    {showPass ? "ðŸ™ˆ" : "ðŸ‘"}
                  </button>
                </div>
              </div>
              <div className="input-group">
                <label className="input-label">Confirm Password</label>
                <input
                  className="input-field"
                  type="password"
                  placeholder="Repeat your password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                />
              </div>
              <button className="btn-primary auth-submit" type="submit" disabled={loading}>
                {loading ? <span className="btn-spinner" /> : "Create Account & Verify Email"}
              </button>
              <p className="auth-switch">
                Already have an account?{" "}
                <button type="button" className="link-btn"
                  onClick={() => { setTab("login"); clearMessages(); }}>
                  Login
                </button>
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
