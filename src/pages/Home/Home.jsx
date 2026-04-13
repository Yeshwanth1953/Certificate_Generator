// src/pages/Home/Home.jsx
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// WHAT THIS PAGE DOES:
// The main dashboard after login. It has two sections:
//
// 1. HERO / ABOUT â€” Explains what CertifyPro is, how to use it (the 5-step workflow)
//    and showcases the key features with animated cards.
//
// 2. UPLOAD TEMPLATE â€” User uploads their certificate background image (PNG/JPG).
//    - The image is uploaded to Firebase Storage
//    - The download URL is saved in localStorage (so Customize page can use it)
//    - User is then navigated to /customize
//
// All pages in the workflow (Customize, Recipients, Generate) share data
// through localStorage under "cp_" prefixed keys.
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { storage } from "../../firebase/config";
import { useAuth } from "../../context/AuthContext";
import Navbar from "../../components/Navbar/Navbar";
import "./Home.css";

const STEPS = [
  { num: "01", title: "Upload Template",     desc: "Upload your certificate background image (PNG or JPG)." },
  { num: "02", title: "Customize Fields",    desc: "Place text fields on your template â€” name, date, course, etc." },
  { num: "03", title: "Add Recipients",      desc: "Type recipients manually or upload a CSV file with all names." },
  { num: "04", title: "Generate",            desc: "We generate individual certificates with unique QR codes." },
  { num: "05", title: "Download & Share",    desc: "Download PDFs, share to LinkedIn, or send verification links." },
];

const FEATURES = [
  { icon: "ðŸ”", title: "QR Verification",    desc: "Every certificate gets a unique QR code. Scan it to verify authenticity." },
  { icon: "ðŸ“¦", title: "Bulk CSV Upload",     desc: "Generate 100s of certificates at once from a simple CSV file." },
  { icon: "ðŸ”—", title: "LinkedIn Sharing",   desc: "Recipients can add their certificate directly to LinkedIn." },
  { icon: "âš¡", title: "Instant PDF Export", desc: "Download print-ready PDF certificates instantly in your browser." },
  { icon: "ðŸŽ¨", title: "Live Canvas Editor", desc: "Drag and place text fields visually on your certificate template." },
  { icon: "ðŸ‘¤", title: "Generation History", desc: "Access all your past certificate batches from your profile." },
];

export default function Home() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const fileInputRef = useRef(null);

  const [dragOver, setDragOver] = useState(false);
  const [preview, setPreview] = useState(null);       // Local preview URL (before upload)
  const [file, setFile] = useState(null);             // The actual File object
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState("");

  // Handle file selection (from input or drag-drop)
  const handleFileSelect = (selectedFile) => {
    setError("");
    if (!selectedFile) return;

    // Validate: only image files
    if (!selectedFile.type.startsWith("image/")) {
      return setError("Please upload an image file (PNG, JPG, JPEG).");
    }
    // Validate: max 10MB
    if (selectedFile.size > 10 * 1024 * 1024) {
      return setError("File is too large. Maximum size is 10MB.");
    }

    setFile(selectedFile);
    // Create a local preview URL so user can see their template
    setPreview(URL.createObjectURL(selectedFile));
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    handleFileSelect(e.dataTransfer.files[0]);
  };

  // â”€â”€ UPLOAD TO FIREBASE STORAGE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const handleUploadAndContinue = async () => {
    if (!file) return setError("Please select a template image first.");
    setUploading(true);
    setError("");

    try {
      // Create a unique path in Firebase Storage for this user's template
      // Path: templates/{userId}/{timestamp}_{filename}
      const storageRef = ref(storage, `templates/${user.uid}/${Date.now()}_${file.name}`);

      // Start the upload and track progress
      const uploadTask = uploadBytesResumable(storageRef, file);

      uploadTask.on("state_changed",
        (snapshot) => {
          // Update progress bar (0â€“100%)
          const pct = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
          setUploadProgress(pct);
        },
        (err) => {
          setError("Upload failed. Please check your internet connection.");
          setUploading(false);
        },
        async () => {
          // Upload completed! Get the public download URL
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);

          // Save URL to localStorage so Customize page can load it
          localStorage.setItem("cp_template_url", downloadURL);
          // Clear any previous workflow data
          localStorage.removeItem("cp_canvas_config");
          localStorage.removeItem("cp_recipients");
          localStorage.removeItem("cp_placeholders");

          // Navigate to the customization page
          navigate("/customize");
        }
      );

    } catch (err) {
      setError("Something went wrong during upload. Please try again.");
      setUploading(false);
    }
  };

  return (
    <div className="page-wrapper">
      <Navbar />

      {/* â”€â”€ HERO SECTION â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <section className="home-hero">
        <div className="container">
          <div className="hero-content animate-fade">
            <div className="badge badge-gold" style={{ marginBottom: "20px" }}>
              âœ¦ Professional Certificate Platform
            </div>
            <h1 className="hero-title">
              Generate Verified<br />
              <span className="gold-text">Certificates</span> at Scale
            </h1>
            <p className="hero-sub">
              Upload your template, customize text fields, add recipients â€” and
              generate professionally signed certificates with embedded QR verification codes.
            </p>
          </div>
        </div>
      </section>

      {/* â”€â”€ HOW IT WORKS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <section className="section home-steps">
        <div className="container">
          <div className="section-header">
            <h2 className="section-title">How It <span>Works</span></h2>
            <p className="section-sub">Five simple steps from template to verified certificate</p>
          </div>
          <div className="steps-grid stagger-children">
            {STEPS.map((step, i) => (
              <div key={i} className="step-card glass">
                <span className="step-card-num">{step.num}</span>
                <h3 className="step-card-title">{step.title}</h3>
                <p className="step-card-desc">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* â”€â”€ FEATURES â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <section className="section home-features">
        <div className="container">
          <div className="section-header">
            <h2 className="section-title">Why <span>CertifyPro?</span></h2>
            <p className="section-sub">Everything you need for professional certificate management</p>
          </div>
          <div className="features-grid stagger-children">
            {FEATURES.map((feat, i) => (
              <div key={i} className="feature-card glass">
                <div className="feat-icon">{feat.icon}</div>
                <h3 className="feat-title">{feat.title}</h3>
                <p className="feat-desc">{feat.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* â”€â”€ UPLOAD TEMPLATE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <section className="section home-upload" id="upload">
        <div className="container-sm">
          <div className="section-header">
            <h2 className="section-title">Start <span>Here</span></h2>
            <p className="section-sub">
              Upload your certificate template image to begin. Use PNG or JPG format.
              Design it in Canva, Photoshop, or any tool â€” then upload here.
            </p>
          </div>

          {/* Drop Zone */}
          <div
            className={`upload-zone glass ${dragOver ? "drag-over" : ""} ${preview ? "has-preview" : ""}`}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => !preview && fileInputRef.current.click()}
          >
            {preview ? (
              <div className="upload-preview">
                <img src={preview} alt="Template preview" className="preview-img" />
                <div className="preview-overlay">
                  <button className="btn-ghost" onClick={(e) => {
                    e.stopPropagation();
                    setPreview(null);
                    setFile(null);
                    setUploadProgress(0);
                  }}>âœ• Change Template</button>
                </div>
              </div>
            ) : (
              <div className="upload-empty">
                <div className="upload-icon animate-float">ðŸ“„</div>
                <h3 className="upload-title">Drop your template here</h3>
                <p className="upload-hint">or click to browse files</p>
                <p className="upload-formats">PNG, JPG, JPEG Â· Max 10MB</p>
              </div>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            style={{ display: "none" }}
            onChange={e => handleFileSelect(e.target.files[0])}
          />

          {/* Error */}
          {error && (
            <div className="upload-error">âš  {error}</div>
          )}

          {/* Upload Progress */}
          {uploading && (
            <div className="upload-progress-wrap">
              <div className="upload-progress-bar">
                <div
                  className="upload-progress-fill"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
              <span className="upload-progress-label">Reading file {uploadProgress}%...</span>
            </div>
          )}

          {/* CTA Button */}
          {file && !uploading && (
            <div className="upload-actions animate-fade">
              <div className="file-info glass">
                <span>ðŸ“„ {file.name}</span>
                <span className="file-size">{(file.size / 1024).toFixed(0)} KB</span>
              </div>
              <button className="btn-primary upload-cta" onClick={handleUploadAndContinue}>
                Upload & Customize Fields â†’
              </button>
            </div>
          )}
        </div>
      </section>

      <footer className="home-footer">
        <p>Â© 2025 CertifyPro Â· Built for professional certificate generation</p>
      </footer>
    </div>
  );
}
