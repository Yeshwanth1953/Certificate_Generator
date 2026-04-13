// src/context/AuthContext.jsx
// ─────────────────────────────────────────────────────────────────────────────
// WHAT THIS DOES:
// AuthContext acts like a "global store" for the logged-in user's data.
// Instead of passing the user object down through every component via props,
// any component can simply call useAuth() to access: user, logout, etc.
//
// Think of it like a bulletin board at the center of the app:
//   - When the user logs in → we pin their info on the board
//   - When they log out → we clear the board
//   - Any page can read from the board anytime
// ─────────────────────────────────────────────────────────────────────────────

import { createContext, useContext, useEffect, useState } from "react";
import { auth, db } from "../firebase/config";
import {
  onAuthStateChanged,
  signOut,
  browserLocalPersistence,
  setPersistence,
} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

// Create the context (the "bulletin board")
const AuthContext = createContext(null);

// AuthProvider wraps the whole app — it listens for login/logout changes
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);         // Firebase user object
  const [userProfile, setUserProfile] = useState(null); // Extra profile data from Firestore
  const [loading, setLoading] = useState(true);   // True while we check if user is logged in

  useEffect(() => {
    // Tell Firebase to remember login in the browser (even after refresh)
    setPersistence(auth, browserLocalPersistence);

    // onAuthStateChanged fires every time login/logout happens
    // Firebase calls this automatically — we don't need to manually check
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // A user IS logged in — now check the 24-hour session rule
        try {
          const userRef = doc(db, "users", firebaseUser.uid);
          const userSnap = await getDoc(userRef);

          if (userSnap.exists()) {
            const data = userSnap.data();
            const lastLogin = data.lastLogin?.toDate(); // Convert Firestore timestamp to JS Date
            const now = new Date();
            const hoursSinceLogin = lastLogin
              ? (now - lastLogin) / (1000 * 60 * 60) // Convert ms to hours
              : 0;

            if (hoursSinceLogin > 24) {
              // 🔴 Session expired — force logout
              await signOut(auth);
              setUser(null);
              setUserProfile(null);
            } else {
              // ✅ Session valid — set the user state
              setUser(firebaseUser);
              setUserProfile(data);
            }
          } else {
            setUser(firebaseUser);
          }
        } catch (err) {
          setUser(firebaseUser);
        }
      } else {
        // No user is logged in
        setUser(null);
        setUserProfile(null);
      }
      setLoading(false); // Done checking — app can now render
    });

    // Cleanup: stop listening when the component unmounts
    return () => unsubscribe();
  }, []);

  // Logout function — any page can call this with: const { logout } = useAuth()
  const logout = async () => {
    await signOut(auth);
    setUser(null);
    setUserProfile(null);
    // Clear workflow data from localStorage on logout
    localStorage.removeItem("cp_template_url");
    localStorage.removeItem("cp_canvas_config");
    localStorage.removeItem("cp_recipients");
    localStorage.removeItem("cp_placeholders");
  };

  // Refresh the user's profile from Firestore (call after profile updates)
  const refreshProfile = async () => {
    if (user) {
      const userRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) setUserProfile(userSnap.data());
    }
  };

  return (
    <AuthContext.Provider value={{ user, userProfile, loading, logout, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

// Custom hook — the clean way to read from the context
// Usage: const { user, logout } = useAuth();
export const useAuth = () => useContext(AuthContext);
