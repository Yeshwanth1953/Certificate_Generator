// src/pages/Home/Home.jsx
// Three-mode Home page: Upload Template | Default Templates | Build From Scratch

import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import Navbar from "../../components/Navbar/Navbar";
import { DEFAULT_TEMPLATES } from "../../templates/defaultTemplates";
import "./Home.css";

const STEPS = [
  { num: "01", title: "Choose Template",  desc: "Upload your own design, pick a pre-built template, or build from scratch." },
  { num: "02", title: "Customize Fields", desc: "Place text fields on your template — name, date, course, etc." },
  { num: "03", title: "Add Recipients",   desc: "Type recipients manually or upload a CSV file with all names." },
  { num: "04", title: "Generate",         desc: "We generate individual certificates with unique QR codes." },
  { num: "05", title: "Download & Share", desc: "Download PDFs, share to LinkedIn, or send verification links." },
];

const FEATURES = [
  { icon: "QR",  title: "QR Verification",    desc: "Every certificate gets a unique QR code. Scan it to verify authenticity instantly." },
  { icon: "CSV", title: "Bulk CSV Upload",     desc: "Generate hundreds of certificates at once from a simple CSV file." },
  { icon: "LI",  title: "LinkedIn Sharing",   desc: "Recipients can add their certificate directly to their LinkedIn profile." },
  { icon: "PDF", title: "Instant PDF Export", desc: "Download print-ready PDF certificates instantly — no server needed." },
  { icon: "ED",  title: "Canvas Editor",      desc: "Drag and place text fields visually on your certificate template." },
  { icon: "HX",  title: "History",            desc: "Access all your past certificate batches from your profile page." },
];

// Helper: clear previous session data
function clearSession() {
  ["cp_template_url", "cp_canvas_config", "cp_recipients",
   "cp_placeholders", "cp_canvas_size"].forEach(k => localStorage.removeItem(k));
}

export default function Home() {
  const navigate     = useNavigate();
  const { user }     = useAuth();
  const fileInputRef = useRef(null);

  // ── Active start mode ──
  const [mode, setMode] = useState("upload"); // "upload" | "templates" | "scratch"

  // ── Upload tab state ──
  const [dragOver,       setDragOver]       = useState(false);
  const [preview,        setPreview]        = useState(null);
  const [file,           setFile]           = useState(null);
  const [uploading,      setUploading]      = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error,          setError]          = useState("");

  // ── Templates tab state ──
  const [templatePreviews, setTemplatePreviews] = useState({});
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [generatingPreview, setGeneratingPreview] = useState(false);

  // Generate template previews when that tab is opened
  useEffect(() => {
    if (mode !== "templates") return;
    if (Object.keys(templatePreviews).length > 0) return; // already generated
    setGeneratingPreview(true);
    // Defer so the UI renders first
    setTimeout(() => {
      const previews = {};
      DEFAULT_TEMPLATES.forEach(t => {
        try { previews[t.id] = t.generate(); }
        catch (e) { console.warn(`Template ${t.id} failed:`, e); }
      });
      setTemplatePreviews(previews);
      setGeneratingPreview(false);
    }, 50);
  }, [mode]);

  // ── Upload handlers ──
  const handleFileSelect = (selectedFile) => {
    setError("");
    if (!selectedFile) return;
    if (!selectedFile.type.startsWith("image/"))
      return setError("Please upload an image file (PNG, JPG, JPEG).");
    if (selectedFile.size > 10 * 1024 * 1024)
      return setError("File is too large. Maximum size is 10MB.");
    setFile(selectedFile);
    setPreview(URL.createObjectURL(selectedFile));
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    handleFileSelect(e.dataTransfer.files[0]);
  };

  const handleUploadAndContinue = () => {
    if (!file) return setError("Please select a template image first.");
    setUploading(true);
    setUploadProgress(0);
    setError("");

    const reader = new FileReader();
    reader.onprogress = (e) => {
      if (e.lengthComputable)
        setUploadProgress(Math.round((e.loaded / e.total) * 100));
    };
    reader.onload = (e) => {
      clearSession();
      localStorage.setItem("cp_template_url", e.target.result);
      setUploading(false);
      navigate("/customize");
    };
    reader.onerror = () => {
      setError("Failed to read the file. Please try again.");
      setUploading(false);
    };
    reader.readAsDataURL(file);
  };

  // ── Default template handler ──
  const handleUseDefaultTemplate = (template) => {
    const dataUrl = templatePreviews[template.id] || template.generate();
    clearSession();
    localStorage.setItem("cp_template_url", dataUrl);
    navigate("/customize");
  };

  // ── Build from scratch handler ──
  const handleBuildFromScratch = () => {
    clearSession();
    // No template URL — Customize page handles blank canvas with background picker
    navigate("/customize");
  };

  return (
    <div className="page-wrapper">
      <Navbar />

      {/* HERO */}
      <section className="home-hero">
        <div className="container">
          <div className="hero-content animate-fade">
            <div className="badge badge-gold" style={{ marginBottom: "20px" }}>
              Professional Certificate Platform
            </div>
            <h1 className="hero-title">
              Generate Verified<br />
              <span className="gold-text">Certificates</span> at Scale
            </h1>
            <p className="hero-sub">
              Upload your template, customize text fields, add recipients — and
              generate professionally signed certificates with embedded QR verification codes.
            </p>
            <a href="#start" className="btn-primary hero-cta">Get Started &#8594;</a>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
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

      {/* FEATURES */}
      <section className="section home-features">
        <div className="container">
          <div className="section-header">
            <h2 className="section-title">Why <span>CertifyPro?</span></h2>
            <p className="section-sub">Everything you need for professional certificate management</p>
          </div>
          <div className="features-grid stagger-children">
            {FEATURES.map((feat, i) => (
              <div key={i} className="feature-card glass">
                <div className="feat-icon-badge">{feat.icon}</div>
                <h3 className="feat-title">{feat.title}</h3>
                <p className="feat-desc">{feat.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── START SECTION ── */}
      <section className="section home-upload" id="start">
        <div className="container">
          <div className="section-header">
            <h2 className="section-title">Start Your <span>Certificate</span></h2>
            <p className="section-sub">Choose how you want to begin</p>
          </div>

          {/* ── Mode Tabs ── */}
          <div className="mode-tabs">
            <button
              className={`mode-tab ${mode === "upload" ? "active" : ""}`}
              onClick={() => setMode("upload")}
            >
              <span className="mode-tab-icon">&#128193;</span>
              <span className="mode-tab-title">Upload Template</span>
              <span className="mode-tab-desc">Use your own design</span>
            </button>
            <button
              className={`mode-tab ${mode === "templates" ? "active" : ""}`}
              onClick={() => setMode("templates")}
            >
              <span className="mode-tab-icon">&#127912;</span>
              <span className="mode-tab-title">Default Templates</span>
              <span className="mode-tab-desc">6 ready-made designs</span>
            </button>
            <button
              className={`mode-tab ${mode === "scratch" ? "active" : ""}`}
              onClick={() => setMode("scratch")}
            >
              <span className="mode-tab-icon">&#9999;&#65039;</span>
              <span className="mode-tab-title">Build From Scratch</span>
              <span className="mode-tab-desc">Blank canvas + tools</span>
            </button>
          </div>

          {/* ─────────── TAB 1: UPLOAD ─────────── */}
          {mode === "upload" && (
            <div className="mode-panel animate-fade">
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
                      }}>Change Template</button>
                    </div>
                  </div>
                ) : (
                  <div className="upload-empty">
                    <div className="upload-icon animate-float">[ IMG ]</div>
                    <h3 className="upload-title">Drop your template here</h3>
                    <p className="upload-hint">or click to browse files</p>
                    <p className="upload-formats">PNG, JPG, JPEG &middot; Max 10MB</p>
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

              {error && <div className="upload-error">&#9888; {error}</div>}

              {uploading && (
                <div className="upload-progress-wrap">
                  <div className="upload-progress-bar">
                    <div className="upload-progress-fill" style={{ width: `${uploadProgress}%` }} />
                  </div>
                  <span className="upload-progress-label">Reading file {uploadProgress}%...</span>
                </div>
              )}

              {file && !uploading && (
                <div className="upload-actions animate-fade">
                  <div className="file-info glass">
                    <span>{file.name}</span>
                    <span className="file-size">{(file.size / 1024).toFixed(0)} KB</span>
                  </div>
                  <button className="btn-primary upload-cta" onClick={handleUploadAndContinue}>
                    Customize Fields &#8594;
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ─────────── TAB 2: DEFAULT TEMPLATES ─────────── */}
          {mode === "templates" && (
            <div className="mode-panel animate-fade">
              {generatingPreview ? (
                <div className="templates-loading">
                  <div className="gen-spinner" />
                  <p>Generating template previews...</p>
                </div>
              ) : (
                <>
                  <div className="templates-grid">
                    {DEFAULT_TEMPLATES.map((t) => (
                      <div
                        key={t.id}
                        className={`template-card glass ${selectedTemplate === t.id ? "selected" : ""}`}
                        onClick={() => setSelectedTemplate(t.id)}
                      >
                        <div className="template-thumb">
                          {templatePreviews[t.id] ? (
                            <img src={templatePreviews[t.id]} alt={t.name} />
                          ) : (
                            <div className="template-thumb-placeholder" style={{ background: t.bgHint }} />
                          )}
                          {selectedTemplate === t.id && (
                            <div className="template-selected-badge">&#10003; Selected</div>
                          )}
                        </div>
                        <div className="template-info">
                          <div className="template-category badge badge-purple">{t.category}</div>
                          <h3 className="template-name">{t.name}</h3>
                          <p className="template-desc">{t.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {selectedTemplate && (
                    <div className="template-actions animate-fade">
                      <button
                        className="btn-primary"
                        onClick={() => {
                          const t = DEFAULT_TEMPLATES.find(x => x.id === selectedTemplate);
                          if (t) handleUseDefaultTemplate(t);
                        }}
                      >
                        Use This Template &#8594;
                      </button>
                      <button className="btn-ghost" onClick={() => setSelectedTemplate(null)}>
                        Clear Selection
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* ─────────── TAB 3: BUILD FROM SCRATCH ─────────── */}
          {mode === "scratch" && (
            <div className="mode-panel animate-fade">
              <div className="scratch-panel glass">
                <div className="scratch-icon">&#9999;&#65039;</div>
                <h3 className="scratch-title">Build Your Own Certificate</h3>
                <p className="scratch-desc">
                  Start with a blank canvas. Choose a background color or gradient,
                  add shapes, text fields, upload your logo, and design your certificate
                  exactly the way you want it — all within the editor.
                </p>

                <div className="scratch-features">
                  {[
                    ["&#127912;", "Background color & gradient presets"],
                    ["&#9632;",   "Add shapes: rectangles, circles, lines"],
                    ["&#128247;", "Upload your logo or seal image"],
                    ["&#128065;&#65039;", "All canvas sizes: A4, Letter, Square, A3, Banner"],
                    ["&#128464;&#65039;", "Full font library with 20+ typefaces"],
                  ].map(([icon, text], i) => (
                    <div key={i} className="scratch-feature">
                      <span dangerouslySetInnerHTML={{ __html: icon }} />
                      <span>{text}</span>
                    </div>
                  ))}
                </div>

                <button className="btn-primary scratch-cta" onClick={handleBuildFromScratch}>
                  Open Canvas Editor &#8594;
                </button>
              </div>
            </div>
          )}
        </div>
      </section>

      <footer className="home-footer">
        <p>&#169; 2025 CertifyPro &middot; Built for professional certificate generation</p>
      </footer>
    </div>
  );
}
