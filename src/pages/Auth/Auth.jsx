// src/pages/Auth/Auth.jsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
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

  useEffect(() => {
    if (user) navigate("/home");
  }, [user, navigate]);

  const [tab, setTab] = useState("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [verifyEmailSent, setVerifyEmailSent] = useState(false);
  const [showPass, setShowPass] = useState(false);

  const clearMessages = () => { setError(""); setSuccess(""); };

  // ── SIGN UP ──────────────────────────────────────────────
  const handleSignup = async (e) => {
    e.preventDefault();
    clearMessages();

    if (!name.trim()) return setError("Please enter your full name.");
    if (password.length < 6) return setError("Password must be at least 6 characters.");
    if (password !== confirmPassword) return setError("Passwords do not match.");

    setLoading(true);
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      await sendEmailVerification(cred.user);
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
      setVerifyEmailSent(true);
    } catch (err) {
      console.error("Signup error:", err.code, err.message);
      const msgs = {
        "auth/email-already-in-use": "An account with this email already exists. Please log in.",
        "auth/invalid-email": "Please enter a valid email address.",
        "auth/weak-password": "Password is too weak. Use at least 6 characters.",
        "auth/network-request-failed": "Network error. Check your internet connection.",
        "auth/operation-not-allowed": "Email/Password sign-in is not enabled. Enable it in Firebase Console > Authentication > Sign-in method.",
        "auth/api-key-not-valid.-please-pass-a-valid-api-key.": "Your Firebase API key in .env is invalid. Go to Firebase Console > Project Settings > copy the correct apiKey.",
      };
      setError(msgs[err.code] || `Error [${err.code}]: ${err.message}`);
    }
    setLoading(false);
  };

  // ── LOGIN ────────────────────────────────────────────────
  const handleLogin = async (e) => {
    e.preventDefault();
    clearMessages();
    setLoading(true);
    try {
      await setPersistence(auth, browserLocalPersistence);
      const cred = await signInWithEmailAndPassword(auth, email, password);

      if (!cred.user.emailVerified) {
        setError("Please verify your email first. Check your inbox.");
        setLoading(false);
        return;
      }

      const userRef = doc(db, "users", cred.user.uid);
      const snap = await getDoc(userRef);
      if (snap.exists()) {
        await setDoc(userRef, { lastLogin: serverTimestamp() }, { merge: true });
      } else {
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
      console.error("Login error:", err.code, err.message);
      const msgs = {
        "auth/user-not-found": "No account found with this email.",
        "auth/wrong-password": "Incorrect password.",
        "auth/invalid-credential": "Incorrect email or password.",
        "auth/too-many-requests": "Too many failed attempts. Try again later.",
        "auth/network-request-failed": "Network error. Check your internet connection.",
        "auth/api-key-not-valid.-please-pass-a-valid-api-key.": "Your Firebase API key in .env is invalid. Please fix it.",
      };
      setError(msgs[err.code] || `Error [${err.code}]: ${err.message}`);
    }
    setLoading(false);
  };

  const resendVerification = async () => {
    if (auth.currentUser) {
      await sendEmailVerification(auth.currentUser);
      setSuccess("Verification email resent! Check your inbox.");
    }
  };

  // ── FORGOT PASSWORD ──────────────────────────────────────
  const handleForgotPassword = async () => {
    clearMessages();
    if (!email.trim()) {
      return setError("Enter your email address above, then click Forgot Password.");
    }
    try {
      await sendPasswordResetEmail(auth, email.trim());
      setSuccess(`Password reset email sent to ${email}. Check your inbox!`);
    } catch (err) {
      const msgs = {
        "auth/user-not-found": "No account found with this email address.",
        "auth/invalid-email": "Please enter a valid email address.",
        "auth/network-request-failed": "Network error. Check your internet connection.",
      };
      setError(msgs[err.code] || `Reset failed: ${err.message}`);
    }
  };

  // ── VERIFY EMAIL SENT SCREEN ─────────────────────────────
  if (verifyEmailSent) {
    return (
      <div className="auth-page">
        <div className="auth-bg-orbs" />
        <div className="auth-card glass animate-scale">
          <div className="verify-icon">&#128231;</div>
          <h2 className="verify-title">Check Your Email</h2>
          <p className="verify-text">
            We sent a verification link to <strong>{email}</strong>.
            Click the link in that email to activate your account.
          </p>
          <div className="verify-steps">
            {["Open your email inbox", "Find the email from Firebase", "Click Verify Email in that email", "Come back here and log in"].map((s, i) => (
              <div key={i} className="verify-step">
                <span className="vs-num">{i + 1}</span>
                <span>{s}</span>
              </div>
            ))}
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

  // ── MAIN AUTH UI ─────────────────────────────────────────
  return (
    <div className="auth-page">
      <div className="auth-bg-orbs" />

      {/* Left branding */}
      <div className="auth-brand animate-fade">
        <div className="brand-logo">
          <span className="brand-icon">&#11041;</span>
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
          {[
            "QR Code Verification",
            "Bulk CSV Generation",
            "LinkedIn Sharing",
            "Instant Download",
          ].map(f => (
            <div key={f} className="brand-feat">{f}</div>
          ))}
        </div>
      </div>

      {/* Right auth form */}
      <div className="auth-form-side animate-scale">
        <div className="auth-card glass">
          <div className="auth-tabs">
            <button className={`auth-tab ${tab === "login" ? "active" : ""}`}
              onClick={() => { setTab("login"); clearMessages(); }}>Login</button>
            <button className={`auth-tab ${tab === "signup" ? "active" : ""}`}
              onClick={() => { setTab("signup"); clearMessages(); }}>Sign Up</button>
          </div>

          {error && <div className="auth-alert auth-alert-error">&#9888; {error}</div>}
          {success && <div className="auth-alert auth-alert-success">&#10003; {success}</div>}

          {/* LOGIN FORM */}
          {tab === "login" && (
            <form onSubmit={handleLogin} className="auth-form">
              <div className="input-group">
                <label className="input-label">Email Address</label>
                <input className="input-field" type="email" placeholder="you@example.com"
                  value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email" />
              </div>
              <div className="input-group">
                <label className="input-label">Password</label>
                <div className="input-password-wrap">
                  <input className="input-field" type={showPass ? "text" : "password"}
                    placeholder="Your password" value={password}
                    onChange={e => setPassword(e.target.value)} required autoComplete="current-password" />
                  <button type="button" className="pass-toggle" onClick={() => setShowPass(!showPass)}>
                    {showPass ? "Hide" : "Show"}
                  </button>
                </div>
              </div>
              <button className="btn-primary auth-submit" type="submit" disabled={loading}>
                {loading ? <span className="btn-spinner" /> : "Login to CertifyPro"}
              </button>
              <p className="auth-switch" style={{ marginTop: "10px" }}>
                <button type="button" className="link-btn" onClick={handleForgotPassword}
                  style={{ fontSize: "0.82rem", opacity: 0.8 }}>
                  Forgot Password?
                </button>
              </p>
              <p className="auth-switch">
                Don&apos;t have an account?{" "}
                <button type="button" className="link-btn"
                  onClick={() => { setTab("signup"); clearMessages(); }}>Sign Up</button>
              </p>
            </form>
          )}

          {/* SIGNUP FORM */}
          {tab === "signup" && (
            <form onSubmit={handleSignup} className="auth-form">
              <div className="input-group">
                <label className="input-label">Full Name</label>
                <input className="input-field" type="text" placeholder="John Doe"
                  value={name} onChange={e => setName(e.target.value)} required autoComplete="name" />
              </div>
              <div className="input-group">
                <label className="input-label">Email Address</label>
                <input className="input-field" type="email" placeholder="you@example.com"
                  value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email" />
              </div>
              <div className="input-group">
                <label className="input-label">Password</label>
                <div className="input-password-wrap">
                  <input className="input-field" type={showPass ? "text" : "password"}
                    placeholder="Minimum 6 characters" value={password}
                    onChange={e => setPassword(e.target.value)} required autoComplete="new-password" />
                  <button type="button" className="pass-toggle" onClick={() => setShowPass(!showPass)}>
                    {showPass ? "Hide" : "Show"}
                  </button>
                </div>
              </div>
              <div className="input-group">
                <label className="input-label">Confirm Password</label>
                <input className="input-field" type="password" placeholder="Repeat your password"
                  value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                  required autoComplete="new-password" />
              </div>
              <button className="btn-primary auth-submit" type="submit" disabled={loading}>
                {loading ? <span className="btn-spinner" /> : "Create Account & Verify Email"}
              </button>
              <p className="auth-switch">
                Already have an account?{" "}
                <button type="button" className="link-btn"
                  onClick={() => { setTab("login"); clearMessages(); }}>Login</button>
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
