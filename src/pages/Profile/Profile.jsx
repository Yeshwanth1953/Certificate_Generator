// src/pages/Profile/Profile.jsx
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// WHAT THIS PAGE DOES:
// Shows the logged-in user's profile and generation history.
//
// SECTIONS:
// 1. Profile Card â€” Avatar (can upload photo), Name, Email, Organization
//    Clicking the avatar opens a file picker to change profile picture
//    The photo is uploaded to Firebase Storage and URL saved in Firestore
//
// 2. Stats Bar â€” Total certificates generated, total recipients, account age
//
// 3. Edit Profile â€” Update name and organization name
//
// 4. Generation History â€” List of all certificates this user has issued
//    From Firestore's "certificates" collection, filtered by issuerUID
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { doc, updateDoc, collection, query, where, orderBy, getDocs } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db } from "../../firebase/config";
import { useAuth } from "../../context/AuthContext";
import Navbar from "../../components/Navbar/Navbar";
import "./Profile.css";

export default function Profile() {
  const { user, userProfile, refreshProfile, logout } = useAuth();
  const navigate = useNavigate();
  const avatarInputRef = useRef(null);

  // Edit form state
  const [name, setName] = useState(userProfile?.name || "");
  const [organization, setOrganization] = useState(userProfile?.organization || "");
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  // History
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  const [toast, setToast] = useState(null);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Sync form with profile data when it loads
  useEffect(() => {
    if (userProfile) {
      setName(userProfile.name || "");
      setOrganization(userProfile.organization || "");
    }
  }, [userProfile]);

  // Load certificate history from Firestore
  useEffect(() => {
    if (!user) return;
    loadHistory();
  }, [user]);

  const loadHistory = async () => {
    setLoadingHistory(true);
    try {
      const q = query(
        collection(db, "certificates"),
        where("issuerUID", "==", user.uid),
        orderBy("issuedAt", "desc")
      );
      const snap = await getDocs(q);
      setHistory(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error("Failed to load history:", err);
    }
    setLoadingHistory(false);
  };

  // â”€â”€ SAVE PROFILE EDITS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const handleSaveProfile = async () => {
    if (!name.trim()) return showToast("Name cannot be empty.", "error");
    setSaving(true);
    try {
      await updateDoc(doc(db, "users", user.uid), {
        name: name.trim(),
        organization: organization.trim(),
      });
      await refreshProfile();
      setEditing(false);
      showToast("Profile updated successfully!");
    } catch {
      showToast("Failed to save profile.", "error");
    }
    setSaving(false);
  };

  // â”€â”€ UPLOAD PROFILE PHOTO â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const handlePhotoUpload = async (file) => {
    if (!file || !file.type.startsWith("image/")) return;
    setUploadingPhoto(true);
    try {
      const storageRef = ref(storage, `avatars/${user.uid}/${Date.now()}_${file.name}`);
      await uploadBytes(storageRef, file);
      const photoURL = await getDownloadURL(storageRef);
      await updateDoc(doc(db, "users", user.uid), { photoURL });
      await refreshProfile();
      showToast("Profile photo updated!");
    } catch {
      showToast("Photo upload failed.", "error");
    }
    setUploadingPhoto(false);
  };

  // â”€â”€ LOGOUT â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  const formatDate = (ts) => {
    if (!ts) return "â€”";
    try {
      const d = ts.toDate ? ts.toDate() : new Date(ts);
      return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
    } catch { return "â€”"; }
  };

  const avatarLetter = (userProfile?.name || user?.email || "U")[0].toUpperCase();

  return (
    <div className="page-wrapper">
      <Navbar />
      <div className="container" style={{ paddingTop: "40px", paddingBottom: "60px" }}>

        <div className="profile-grid animate-fade">

          {/* â”€â”€ LEFT: Profile Card â”€â”€ */}
          <div className="profile-card-col">
            <div className="profile-card glass">
              {/* Avatar */}
              <div className="avatar-wrap" onClick={() => avatarInputRef.current.click()}>
                {uploadingPhoto ? (
                  <div className="avatar-spinner" />
                ) : userProfile?.photoURL ? (
                  <img src={userProfile.photoURL} alt="Profile" className="avatar-img" />
                ) : (
                  <span className="avatar-letter">{avatarLetter}</span>
                )}
                <div className="avatar-overlay">ðŸ“·</div>
              </div>
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/*"
                style={{ display: "none" }}
                onChange={e => handlePhotoUpload(e.target.files[0])}
              />

              <h2 className="profile-name">{userProfile?.name || "User"}</h2>
              <p className="profile-email">{user?.email}</p>
              {userProfile?.organization && (
                <div className="profile-org badge badge-gold">
                  ðŸ¢ {userProfile.organization}
                </div>
              )}

              {/* Stats */}
              <div className="profile-stats">
                <div className="ps-item">
                  <span className="ps-val">{userProfile?.totalCertificates || 0}</span>
                  <span className="ps-lbl">Certificates</span>
                </div>
                <div className="ps-divider" />
                <div className="ps-item">
                  <span className="ps-val">{userProfile?.totalRecipients || 0}</span>
                  <span className="ps-lbl">Recipients</span>
                </div>
                <div className="ps-divider" />
                <div className="ps-item">
                  <span className="ps-val">{history.length}</span>
                  <span className="ps-lbl">Batches</span>
                </div>
              </div>

              {/* Edit Profile */}
              {!editing ? (
                <button className="btn-secondary" style={{ width: "100%" }}
                  onClick={() => setEditing(true)}>
                  âœ Edit Profile
                </button>
              ) : (
                <div className="profile-edit animate-fade">
                  <div className="input-group">
                    <label className="input-label">Full Name</label>
                    <input
                      className="input-field"
                      type="text"
                      value={name}
                      onChange={e => setName(e.target.value)}
                      placeholder="Your name"
                    />
                  </div>
                  <div className="input-group">
                    <label className="input-label">Organization</label>
                    <input
                      className="input-field"
                      type="text"
                      value={organization}
                      onChange={e => setOrganization(e.target.value)}
                      placeholder="Company / School name"
                    />
                  </div>
                  <div className="profile-edit-actions">
                    <button className="btn-ghost" onClick={() => setEditing(false)}>Cancel</button>
                    <button className="btn-primary" onClick={handleSaveProfile} disabled={saving}>
                      {saving ? "Saving..." : "Save Changes"}
                    </button>
                  </div>
                </div>
              )}

              <hr className="divider" />

              <button className="btn-danger" style={{ width: "100%" }} onClick={handleLogout}>
                ðŸšª Logout
              </button>
            </div>
          </div>

          {/* â”€â”€ RIGHT: History â”€â”€ */}
          <div className="profile-history-col">
            <div className="history-header">
              <h2 className="section-title">Certificate <span>History</span></h2>
              <button className="btn-ghost" onClick={() => navigate("/home")}>
                + New Batch
              </button>
            </div>

            {loadingHistory ? (
              <div className="history-loading glass">
                <div className="history-spinner" />
                <span>Loading your certificates...</span>
              </div>
            ) : history.length === 0 ? (
              <div className="history-empty glass">
                <div className="history-empty-icon">ðŸ“‹</div>
                <h3>No Certificates Yet</h3>
                <p>Generate your first batch to see history here.</p>
                <button className="btn-primary" onClick={() => navigate("/home")}>
                  Create First Batch â†’
                </button>
              </div>
            ) : (
              <div className="history-list stagger-children">
                {history.map((cert, i) => (
                  <div key={cert.id} className="history-item glass">
                    <div className="hi-left">
                      <div className="hi-icon">ðŸŽ“</div>
                      <div className="hi-details">
                        <div className="hi-name">{cert.recipientName}</div>
                        <div className="hi-meta">
                          {cert.recipientData?.course && (
                            <span className="badge badge-purple" style={{ fontSize: "0.7rem" }}>
                              {cert.recipientData.course}
                            </span>
                          )}
                          <span className="hi-date">{formatDate(cert.issuedAt)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="hi-right">
                      <code className="cert-id-small">{cert.certId?.slice(0, 8).toUpperCase()}</code>
                      <a
                        className="btn-ghost hi-verify-btn"
                        href={cert.verifyUrl}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Verify â†—
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {toast && (
        <div className={`toast toast-${toast.type}`}>{toast.msg}</div>
      )}
    </div>
  );
}
