// src/pages/Generate/Generate.jsx
// ─────────────────────────────────────────────────────────────────────────────
// WHAT THIS PAGE DOES:
// The certificate factory! This page:
//
// 1. Loads canvas config + recipients from localStorage
// 2. For EACH recipient:
//    a. Recreates the fabric.js canvas (off-screen, hidden)
//    b. Loads the template image as background
//    c. Replaces all {{placeholders}} with real data
//    d. Generates a unique Certificate ID (UUID)
//    e. Generates a QR code PNG pointing to /verify?id=CERT_ID
//    f. Adds the QR code image to the canvas corner
//    g. Exports canvas -> PNG -> PDF via jsPDF
//    h. Saves the certificate record to Firestore
// 3. Shows a gallery of all generated certificates
// 4. Each certificate has: Download PDF, View, Share to LinkedIn buttons
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import * as fabric from "fabric";
import jsPDF from "jspdf";
import JSZip from "jszip";
import QRCode from "qrcode";
import { doc, setDoc, serverTimestamp, updateDoc, increment } from "firebase/firestore";
import { db } from "../../firebase/config";
import { useAuth } from "../../context/AuthContext";
import Navbar from "../../components/Navbar/Navbar";
import "./Generate.css";

const STEP_LABELS = ["Upload", "Customize", "Recipients", "Generate"];

// The base URL for verification — use the current origin (works local + deployed)
const VERIFY_BASE = `${window.location.origin}/verify`;

export default function Generate() {
  const navigate = useNavigate();
  const { user, userProfile } = useAuth();
  const hiddenCanvasRef = useRef(null); // Off-screen canvas for rendering

  const [status, setStatus] = useState("idle"); // idle | generating | done | error
  const [progress, setProgress] = useState(0);
  const [currentName, setCurrentName] = useState("");
  const [certificates, setCertificates] = useState([]); // [{name, certId, pdfDataUrl, verifyUrl}]
  const [toast, setToast] = useState(null);

  // Load data from previous steps
  const canvasConfig  = JSON.parse(localStorage.getItem("cp_canvas_config")  || "null");
  const recipients    = JSON.parse(localStorage.getItem("cp_recipients")      || "[]");
  const canvasSize    = localStorage.getItem("cp_canvas_size")                || "a4-landscape";
  const templateURL   = localStorage.getItem("cp_template_url");

  const CANVAS_SIZES = {
    "a4-landscape": { w: 842, h: 595 },
    "a4-portrait":  { w: 595, h: 842 },
    "letter":       { w: 792, h: 612 },
    "square":       { w: 700, h: 700 },
  };

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  // ── MAIN GENERATION FUNCTION ─────────────────────────────
  const generateAll = async () => {
    if (!canvasConfig || recipients.length === 0) return;
    setStatus("generating");
    setCertificates([]);

    const size = CANVAS_SIZES[canvasSize] || CANVAS_SIZES["a4-landscape"];
    const generated = [];

    for (let i = 0; i < recipients.length; i++) {
      const recipient = recipients[i];
      const recipientName = recipient.name || recipient[Object.keys(recipient)[0]] || `Recipient ${i + 1}`;

      try {
        setCurrentName(recipientName);
        setProgress(Math.round((i / recipients.length) * 100));

        // 1. Generate unique certificate ID
        const certId = crypto.randomUUID();
        const verifyUrl = `${VERIFY_BASE}?id=${certId}`;

        // 2. Generate QR code as base64 PNG — high resolution for HD output
        const qrDataUrl = await QRCode.toDataURL(verifyUrl, {
          width: 400, margin: 1,
          color: { dark: "#000000", light: "#ffffff" },
        });

        // 3. Create off-screen Fabric canvas
        const tempEl = document.createElement("canvas");
        tempEl.width  = size.w;
        tempEl.height = size.h;
        const fCanvas = new fabric.Canvas(tempEl, {
          width: size.w, height: size.h,
          backgroundColor: "#ffffff",
          renderOnAddRemove: false,
        });

        // 4. Load saved canvas config — Fabric.js v7 returns a Promise.
        //    IMPORTANT: Do NOT pass a callback here. In Fabric v7 the second
        //    parameter is a per-object *reviver*, NOT a completion callback.
        //    Passing () => resolve() as the reviver causes it to be called for
        //    the FIRST object loaded and resolves before the rest finish,
        //    so getObjects() returns an empty array and text is never replaced.
        await fCanvas.loadFromJSON(canvasConfig);

        // 5. Force-set the background image AFTER loadFromJSON so it always
        //    fills the canvas exactly regardless of saved scale values.
        //    This fixes a bug where scaleToWidth+scaleToHeight combo stored
        //    wrong scale in the JSON, causing partial template in the PDF.
        if (templateURL) {
          try {
            const bgImg = await fabric.Image.fromURL(templateURL, { crossOrigin: "anonymous" });
            bgImg.set({
              scaleX: size.w / bgImg.width,
              scaleY: size.h / bgImg.height,
              left: 0, top: 0,
              originX: "left", originY: "top",
              selectable: false, evented: false,
              lockMovementX: true, lockMovementY: true,
            });
            fCanvas.backgroundImage = bgImg;
          } catch (_) { /* continue without background */ }
        }

        // 6. Replace {{placeholder}} text with real recipient data
        // CRITICAL FIX: Fabric.js v7 uses PascalCase type names ("Textbox","IText","Text").
        // Checking lowercase ("textbox","i-text","text") NEVER matched in v7
        // which is why recipient names were NOT appearing in the generated certificate.
        // We normalize to lowercase to handle both v6 (lowercase) and v7 (PascalCase).
        fCanvas.getObjects().forEach(obj => {
          const t = (obj.type || "").toLowerCase();
          if (t === "textbox" || t === "i-text" || t === "itext" || t === "text") {
            let text = obj.text || "";
            Object.entries(recipient).forEach(([key, val]) => {
              // Escape braces so they are treated as literal characters in the regex
              const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
              text = text.replace(new RegExp("\\{\\{" + escaped + "\\}\\}", "gi"), val || "");
            });
            text = text.replace(/\{\{id\}\}/gi, certId.slice(0, 8).toUpperCase());
            obj.set("text", text);
            if (typeof obj.initDimensions === "function") obj.initDimensions();
          }
        });

        // 7. Add QR code at user-defined position (from cp_qr_zone) or default bottom-right
        const addQR = localStorage.getItem("cp_add_qr") !== "false";
        if (addQR) {
          const qrZone = JSON.parse(localStorage.getItem("cp_qr_zone") || "null");
          const qrImg = await fabric.Image.fromURL(qrDataUrl);
          // Use custom position if defined, otherwise fall back to bottom-right corner
          const qrSize = qrZone?.size
            ? Math.round(qrZone.size)
            : Math.round(Math.min(size.w, size.h) * 0.14);
          const qrLeft = qrZone ? qrZone.x : size.w - qrSize - 16;
          const qrTop  = qrZone ? qrZone.y : size.h - qrSize - 16;
          qrImg.set({
            left: qrLeft, top: qrTop,
            scaleX: qrSize / (qrImg.width  || 400),
            scaleY: qrSize / (qrImg.height || 400),
            selectable: false, evented: false,
          });
          fCanvas.add(qrImg);
        }
        fCanvas.renderAll();

        // 8. Export canvas at 3× resolution for HD/print quality output.
        //    multiplier:3 = ~300 DPI equivalent for A4 certificates.
        //    We then tell jsPDF to use the LOGICAL canvas size (not 3× pixel size)
        //    so the PDF page is the right dimensions and the image fills it exactly.
        const MULTIPLIER = 3;
        const pngDataUrl = fCanvas.toDataURL({ format: "png", multiplier: MULTIPLIER });

        // 9. Convert PNG to PDF — use logical canvas dimensions for page size.
        const pdf = new jsPDF({
          orientation: size.w > size.h ? "l" : "p",
          unit: "px",
          format: [size.w, size.h],
          hotfixes: [],
        });
        const pageW = pdf.internal.pageSize.getWidth();
        const pageH = pdf.internal.pageSize.getHeight();
        // Pass logical dimensions so jsPDF scales the 3× image back down to fit
        pdf.addImage(pngDataUrl, "PNG", 0, 0, pageW, pageH);
        const pdfDataUrl = pdf.output("datauristring");
        const pdfBlob   = pdf.output("blob");

        // 10. Save certificate record to Firestore
        await setDoc(doc(db, "certificates", certId), {
          certId,
          recipientName,
          recipientData: recipient,
          issuerUID:    user.uid,
          issuerName:   userProfile?.name || user.email,
          organization: userProfile?.organization || "",
          issuedAt:     serverTimestamp(),
          verifyUrl,
          verified: true,
          canvasSize,
        });

        fCanvas.dispose();
        generated.push({ name: recipientName, certId, pdfDataUrl, pdfBlob, verifyUrl, pngDataUrl, recipientData: recipient });

      } catch (err) {
        console.error(`Error generating for ${recipientName}:`, err);
        generated.push({ name: recipientName, certId: null, pdfDataUrl: null, error: true });
      }
    }

    // Update user's total certificate count
    try {
      await updateDoc(doc(db, "users", user.uid), {
        totalCertificates: increment(generated.filter(g => !g.error).length),
        totalRecipients:   increment(generated.filter(g => !g.error).length),
      });
    } catch (_) {}

    setProgress(100);
    setStatus("done");
    setCertificates(generated);
    showToast(`${generated.filter(g => !g.error).length} certificates generated!`);
  };

  // ── DOWNLOAD SINGLE CERTIFICATE ──────────────────────────
  const downloadCert = (cert) => {
    if (!cert.pdfDataUrl) return;
    const link = document.createElement("a");
    link.href = cert.pdfDataUrl;
    link.download = `CertifyPro_${cert.name.replace(/\s+/g, "_")}.pdf`;
    link.click();
    showToast(`Downloaded certificate for ${cert.name}`);
  };

  // ── DOWNLOAD ALL AS ZIP ──────────────────────────────────
  const downloadAll = async () => {
    const valid = certificates.filter(c => !c.error && c.pdfBlob);
    if (valid.length === 0) return;
    if (valid.length === 1) { downloadCert(valid[0]); return; }

    showToast("Creating ZIP file...", "info");
    const zip = new JSZip();
    valid.forEach(cert => {
      const fileName = `${cert.name.replace(/[^a-zA-Z0-9 _-]/g, "").replace(/\s+/g, "_")}.pdf`;
      zip.file(fileName, cert.pdfBlob);
    });
    const zipBlob = await zip.generateAsync({ type: "blob", compression: "DEFLATE" });
    const url = URL.createObjectURL(zipBlob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `CertifyPro_Certificates_${Date.now()}.zip`;
    a.click();
    URL.revokeObjectURL(url);
    showToast(`Downloaded ${valid.length} certificates as ZIP!`);
  };

  // ── SHARE TO LINKEDIN ────────────────────────────────────
  const shareLinkedIn = (cert) => {
    // LinkedIn URL API — opens LinkedIn with a pre-filled URL
    // The recipient can paste this link when adding to their profile
    const linkedInUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(cert.verifyUrl)}`;
    window.open(linkedInUrl, "_blank");
  };

  // ── COPY VERIFICATION LINK ───────────────────────────────
  const copyVerifyLink = (cert) => {
    navigator.clipboard.writeText(cert.verifyUrl).then(() => {
      showToast("Verification link copied!");
    });
  };

  // ── COPY PARTICIPANT PORTAL LINK ─────────────────────────
  const copyPortalLink = () => {
    const portalUrl = `${window.location.origin}/portal`;
    navigator.clipboard.writeText(portalUrl).then(() => {
      showToast("Portal link copied! Share this with all participants.");
    });
  };

  // ── SEND EMAILS MODAL STATE ───────────────────────────────
  const [showEmailModal,    setShowEmailModal]    = useState(false);
  const [emailModalTarget,  setEmailModalTarget]  = useState(null); // null = all, cert obj = single
  const [recipientEmailOverride, setRecipientEmailOverride] = useState(""); // manual entry for single
  const [senderEmail,       setSenderEmail]       = useState("");
  const [senderPassword,    setSenderPassword]    = useState("");
  const [showSenderPass,    setShowSenderPass]    = useState(false);
  const [showAdvanced,      setShowAdvanced]      = useState(false);
  const [smtpHost,          setSmtpHost]          = useState("");
  const [smtpPort,          setSmtpPort]          = useState("587");
  const [emailStatus,       setEmailStatus]       = useState("idle"); // idle|sending|done|error
  const [emailResult,       setEmailResult]       = useState(null);

  // Pre-fill sender email from logged-in user on first render
  // Also restore saved password from session (cleared on browser close)
  useEffect(() => {
    if (user?.email && !senderEmail) setSenderEmail(user.email);
    const saved = sessionStorage.getItem("cp_smtp_pass");
    if (saved) setSenderPassword(saved);
  }, [user]);

  // Open modal for ALL participants
  const openEmailModal = () => {
    setEmailModalTarget(null);
    setRecipientEmailOverride("");
    setEmailStatus("idle");
    setEmailResult(null);
    setShowEmailModal(true);
  };

  // Open modal for a SINGLE participant's card
  const openSingleEmailModal = (cert) => {
    setEmailModalTarget(cert);
    setRecipientEmailOverride(cert.recipientData?.email || "");
    setEmailStatus("idle");
    setEmailResult(null);
    setShowEmailModal(true);
  };

  const sendEmails = async () => {
    if (!senderEmail.trim() || !senderPassword.trim()) {
      showToast("Please enter your email and app password.", "error");
      return;
    }

    // Build recipient list — single cert or all certs
    let recipientList;
    if (emailModalTarget) {
      // Single participant
      const email = recipientEmailOverride.trim() || emailModalTarget.recipientData?.email;
      if (!email) {
        showToast("Please enter the participant's email address.", "error");
        return;
      }
      recipientList = [{
        name:      emailModalTarget.name,
        email,
        certId:    emailModalTarget.certId,
        verifyUrl: emailModalTarget.verifyUrl,
      }];
    } else {
      // All participants — use email from CSV, skip those without
      recipientList = certificates
        .filter(c => !c.error && c.recipientData?.email)
        .map(c => ({
          name:      c.name,
          email:     c.recipientData.email,
          certId:    c.certId,
          verifyUrl: c.verifyUrl,
        }));
      if (recipientList.length === 0) {
        showToast("No emails found in your CSV. Use per-card email buttons instead.", "error");
        return;
      }
    }

    setEmailStatus("sending");
    try {
      // Save password in session so user doesn't retype it this session
      sessionStorage.setItem("cp_smtp_pass", senderPassword.trim());
      const payload = {
        recipients:     recipientList,
        issuerName:     user?.displayName || senderEmail.split("@")[0],
        eventName:      certificates[0]?.recipientData?.course || "Certificate",
        portalUrl:      `${window.location.origin}/portal`,
        senderEmail:    senderEmail.trim(),
        senderPassword: senderPassword.trim(),
        smtpHost:       smtpHost.trim() || null,
        smtpPort:       smtpPort ? parseInt(smtpPort) : 587,
      };
      const res = await fetch("/api/send-emails", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(payload),
      });

      // Safe parse — empty or HTML body (e.g. 404 in local `npm run dev`) won't crash
      const text = await res.text();
      let data = {};
      try {
        data = text ? JSON.parse(text) : {};
      } catch (_) {
        throw new Error(
          res.status === 404
            ? "Email API not available in local dev. Run 'vercel dev' or deploy to Vercel to send emails."
            : `Unexpected server response (${res.status}). Make sure nodemailer is installed.`
        );
      }

      if (!res.ok) throw new Error(data.error || `Server error (${res.status})`);
      setEmailResult(data);
      setEmailStatus("done");
      setShowEmailModal(false);
      showToast(`✅ Sent ${data.sent} email${data.sent !== 1 ? "s" : ""}!${data.failed ? `  ⚠ ${data.failed} failed` : ""}`);
    } catch (err) {
      setEmailStatus("error");
      setEmailResult({ error: err.message });
    }
  };

  return (
    <div className="page-wrapper">
      <Navbar />
      <div className="container" style={{ paddingTop: "40px", paddingBottom: "60px" }}>

        {/* Step Bar */}
        <div className="step-bar" style={{ maxWidth: "680px" }}>
          {STEP_LABELS.map((label, i) => (
            <div key={i} className={`step-item ${i === 3 ? "active" : i < 3 ? "done" : ""}`}>
              <div className="step-circle">{i < 3 ? "✓" : i + 1}</div>
              <span className="step-label">{label}</span>
            </div>
          ))}
        </div>

        {/* ── IDLE: Ready to Generate ── */}
        {status === "idle" && (
          <div className="gen-ready animate-fade">
            <div className="gen-ready-card glass">
              <div className="gen-ready-icon">🎓</div>
              <h1 className="section-title">Ready to <span>Generate</span></h1>
              <p className="section-sub">
                {recipients.length} certificate{recipients.length !== 1 ? "s" : ""} will be created with
                unique QR verification codes.
              </p>
              <div className="gen-summary stagger-children">
                <div className="gen-stat glass">
                  <span className="gen-stat-val">{recipients.length}</span>
                  <span className="gen-stat-lbl">Recipients</span>
                </div>
                <div className="gen-stat glass">
                  <span className="gen-stat-val">QR</span>
                  <span className="gen-stat-lbl">Verification</span>
                </div>
                <div className="gen-stat glass">
                  <span className="gen-stat-val">PDF</span>
                  <span className="gen-stat-lbl">Export</span>
                </div>
              </div>
              <button className="btn-primary gen-cta" onClick={generateAll}>
                ⚡ Generate All Certificates
              </button>
              <button className="btn-ghost" onClick={() => navigate("/recipients")} style={{ marginTop: "12px" }}>
                ← Back to Recipients
              </button>
            </div>
          </div>
        )}

        {/* ── GENERATING: Progress ── */}
        {status === "generating" && (
          <div className="gen-progress-wrap animate-fade">
            <div className="gen-progress-card glass">
              <div className="gen-spinner" />
              <h2>Generating Certificates...</h2>
              <p className="gen-current">Processing: <strong>{currentName}</strong></p>
              <div className="gen-bar-wrap">
                <div className="gen-bar">
                  <div className="gen-bar-fill" style={{ width: `${progress}%` }} />
                </div>
                <span className="gen-pct">{progress}%</span>
              </div>
              <p className="gen-note">
                Please keep this tab open. Generating QR codes + PDFs in your browser.
              </p>
            </div>
          </div>
        )}

        {/* ── DONE: Certificate Gallery ── */}
        {status === "done" && (
          <div className="gen-done animate-fade">
            <div className="gen-done-header">
              <div>
                <h1 className="section-title">
                  <span>Certificates</span> Generated ✓
                </h1>
                <p className="section-sub">
                  {certificates.filter(c => !c.error).length} of {certificates.length} certificates created successfully.
                </p>
              </div>
              <div className="gen-done-actions">
                <button className="btn-secondary" onClick={() => navigate("/home")}>
                  + New Batch
                </button>
              </div>
            </div>

            {/* ── Share & Email Panel ── */}
            <div className="gen-share-panel glass" style={{ marginBottom: "28px", padding: "20px 24px", borderRadius: "var(--radius-lg)", border: "1px solid var(--border-glass)" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "12px" }}>
                <div>
                  <div style={{ fontWeight: 700, marginBottom: "4px" }}>📢 Share with Participants</div>
                  <div style={{ fontSize: "0.82rem", color: "var(--text-muted)", lineHeight: 1.5 }}>
                    Share the portal link so participants can find their certificate by ID,
                    or send emails directly from each card below.
                  </div>
                </div>
                <div style={{ display: "flex", gap: "10px", flexShrink: 0, flexWrap: "wrap" }}>
                  <button
                    className="btn-secondary"
                    onClick={copyPortalLink}
                    title={`${window.location.origin}/portal`}
                  >
                    📋 Copy Portal Link
                  </button>
                  <button
                    className="btn-primary"
                    onClick={openEmailModal}
                    disabled={emailStatus === "sending"}
                    style={{ minWidth: "160px" }}
                  >
                    {emailStatus === "done"
                      ? `✅ Sent ${emailResult?.sent || 0} Emails`
                      : `📧 Email All (${certificates.filter(c => !c.error).length})`
                    }
                  </button>
                </div>
              </div>

              {/* Email result details */}
              {emailStatus === "done" && emailResult && (
                <div style={{ marginTop: "14px", padding: "12px 16px", background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)", borderRadius: "var(--radius-md)", fontSize: "0.84rem" }}>
                  ✅ <strong>{emailResult.sent}</strong> emails sent successfully
                  {emailResult.failed > 0 && <span style={{ color: "var(--error)", marginLeft: 12 }}>⚠ {emailResult.failed} failed</span>}
                </div>
              )}
              {emailStatus === "error" && emailResult?.error && (
                <div style={{ marginTop: "14px", padding: "12px 16px", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: "var(--radius-md)", fontSize: "0.84rem", color: "var(--error)" }}>
                  ❌ {emailResult.error}
                </div>
              )}
            </div>

            {/* Certificate Cards */}
            <div className="cert-gallery stagger-children">
              {certificates.map((cert, idx) => (
                <div key={idx} className={`cert-card glass ${cert.error ? "cert-error" : ""}`}>
                  {/* Preview thumbnail */}
                  {cert.pngDataUrl && (
                    <div className="cert-thumb">
                      <img src={cert.pngDataUrl} alt={`Certificate for ${cert.name}`} />
                    </div>
                  )}

                  {cert.error && (
                    <div className="cert-error-msg">&#9888; Failed to generate</div>
                  )}

                  <div className="cert-info">
                    <h3 className="cert-name">{cert.name}</h3>
                    {cert.certId && (
                      <span className="cert-id badge badge-gold">
                        ID: {cert.certId.slice(0, 8).toUpperCase()}
                      </span>
                    )}
                  </div>

                  {!cert.error && (
                    <div className="cert-actions">
                      <button
                        className="cert-action-btn cert-email-btn"
                        title={`Send email to ${cert.name}`}
                        onClick={() => openSingleEmailModal(cert)}
                      >
                        &#128231; Email
                      </button>
                      <button
                        className="cert-action-btn"
                        title="Share to LinkedIn"
                        onClick={() => shareLinkedIn(cert)}
                      >
                        &#128279; LinkedIn
                      </button>
                      <button
                        className="cert-action-btn"
                        title="Copy verify link"
                        onClick={() => copyVerifyLink(cert)}
                      >
                        &#128203; Copy Link
                      </button>
                      <a
                        className="cert-action-btn"
                        href={cert.verifyUrl}
                        target="_blank"
                        rel="noreferrer"
                        title="Open verification page"
                      >
                        &#10003; Verify
                      </a>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Toast */}
        {toast && (
          <div className={`toast toast-${toast.type}`}>
            {toast.msg}
          </div>
        )}
      </div>

      {/* ── SEND EMAILS MODAL ── */}
      {showEmailModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }}
          onClick={e => { if (e.target === e.currentTarget) setShowEmailModal(false); }}>
          <div className="glass" style={{ width: "100%", maxWidth: "520px", borderRadius: "var(--radius-xl)", padding: "36px", border: "1px solid var(--border-glass)" }}>

            {/* Modal Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "24px" }}>
              <div>
                <h2 style={{ fontSize: "1.3rem", fontWeight: 800, margin: "0 0 6px" }}>
                  {emailModalTarget ? `📧 Email to ${emailModalTarget.name}` : `📧 Email All ${certificates.filter(c => !c.error).length} Participants`}
                </h2>
                <p style={{ fontSize: "0.84rem", color: "var(--text-muted)", margin: 0, lineHeight: 1.5 }}>
                  Emails go <strong>FROM your email address</strong> — Gmail, Outlook, university, anything.
                </p>
              </div>
              <button onClick={() => setShowEmailModal(false)}
                style={{ background: "transparent", border: "none", color: "var(--text-muted)", fontSize: "1.4rem", cursor: "pointer", padding: "4px 8px", lineHeight: 1 }}>×</button>
            </div>

            {/* If single participant — show/enter their email */}
            {emailModalTarget && (
              <div style={{ marginBottom: "16px" }}>
                <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--text-secondary)", marginBottom: "8px" }}>
                  Participant&apos;s Email Address
                </label>
                <input
                  type="email"
                  className="input-field"
                  placeholder="participant@example.com"
                  value={recipientEmailOverride}
                  onChange={e => setRecipientEmailOverride(e.target.value)}
                  style={{ width: "100%", boxSizing: "border-box" }}
                />
                <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "6px" }}>
                  Certificate ID: <strong style={{ color: "var(--gold)", fontFamily: "monospace" }}>{emailModalTarget.certId?.slice(0,8).toUpperCase()}</strong>
                </div>
              </div>
            )}

            {/* Sender Email — auto-filled from logged-in account */}
            <div style={{ marginBottom: "16px" }}>
              <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--text-secondary)", marginBottom: "8px" }}>
                Send From (Your Email)
                {senderEmail === user?.email && (
                  <span style={{ marginLeft: 8, fontSize: "0.7rem", fontWeight: 600, textTransform: "none", color: "#22c55e", background: "rgba(34,197,94,0.1)", padding: "2px 8px", borderRadius: "20px", letterSpacing: 0 }}>
                    ✓ Auto-filled from your account
                  </span>
                )}
              </label>
              <input
                type="email"
                className="input-field"
                placeholder="your-email@example.com"
                value={senderEmail}
                onChange={e => setSenderEmail(e.target.value)}
                style={{ width: "100%", boxSizing: "border-box" }}
              />
              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "6px" }}>
                Participants will receive email <strong>from this address</strong>. Change it if you want to use a different one.
              </div>
            </div>

            {/* Password */}
            <div style={{ marginBottom: "12px" }}>
              <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--text-secondary)", marginBottom: "8px" }}>
                Email Password
              </label>
              <div style={{ position: "relative" }}>
                <input
                  type={showSenderPass ? "text" : "password"}
                  className="input-field"
                  placeholder="Your email password"
                  value={senderPassword}
                  onChange={e => setSenderPassword(e.target.value)}
                  style={{ width: "100%", boxSizing: "border-box", paddingRight: "60px" }}
                />
                <button type="button" onClick={() => setShowSenderPass(!showSenderPass)}
                  style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", background: "transparent", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: "0.8rem" }}>
                  {showSenderPass ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            {/* Advanced Settings toggle */}
            <button type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              style={{ background: "transparent", border: "none", color: "var(--text-muted)", fontSize: "0.8rem", cursor: "pointer", padding: "4px 0", marginBottom: "12px", textDecoration: "underline", fontFamily: "inherit" }}>
              ⚙ {showAdvanced ? "Hide" : "Advanced Settings"} (for custom university mail servers)
            </button>

            {showAdvanced && (
              <div style={{ background: "rgba(108,99,255,0.06)", border: "1px solid rgba(108,99,255,0.2)", borderRadius: "var(--radius-md)", padding: "14px", marginBottom: "12px" }}>
                <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", margin: "0 0 12px", lineHeight: 1.5 }}>
                  Use this only if email fails. Your IT team can provide these details.
                  Leave blank to auto-detect from your email domain.
                </p>
                <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "10px" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", color: "var(--text-secondary)", marginBottom: "6px" }}>SMTP Host</label>
                    <input type="text" className="input-field" placeholder="smtp.youruniversity.edu"
                      value={smtpHost} onChange={e => setSmtpHost(e.target.value)}
                      style={{ width: "100%", boxSizing: "border-box" }} />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", color: "var(--text-secondary)", marginBottom: "6px" }}>Port</label>
                    <input type="number" className="input-field" placeholder="587"
                      value={smtpPort} onChange={e => setSmtpPort(e.target.value)}
                      style={{ width: "100%", boxSizing: "border-box" }} />
                  </div>
                </div>
                <p style={{ fontSize: "0.72rem", color: "var(--text-muted)", margin: "8px 0 0", lineHeight: 1.4 }}>
                  Common ports: <strong>587</strong> (TLS, most common) · <strong>465</strong> (SSL) · <strong>25</strong> (legacy)
                </p>
              </div>
            )}

            {/* Password guide — context-aware tip */}
            <div style={{ background: "rgba(245,200,66,0.06)", border: "1px solid rgba(245,200,66,0.15)", borderRadius: "var(--radius-md)", padding: "12px 14px", marginBottom: "20px", fontSize: "0.78rem", color: "var(--text-muted)", lineHeight: 1.8 }}>
              <strong style={{ color: "var(--gold)" }}>💡 Which password to enter?</strong><br />
              <strong>Personal Gmail</strong> (@gmail.com) → Not your login password. Go to
              &nbsp;<a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noreferrer" style={{ color: "var(--gold)" }}>myaccount.google.com/apppasswords</a>&nbsp;
              → create one named "CertifyPro" → paste the 16-char code here.<br />
              <strong>College / Club / Dept email</strong> (any @college.edu) → Just use your
              <strong style={{ color: "#e8eaf0" }}> normal email login password</strong> — same one you type to log in to your email.<br />
              <strong>Outlook / Hotmail</strong> → Normal login password.<br />
              <span style={{ color: "rgba(245,200,66,0.7)" }}>⚠ If it fails, your email server may need special SMTP access — click Advanced Settings below.</span>
            </div>

            {/* Error inside modal */}
            {emailStatus === "error" && emailResult?.error && (
              <div style={{ marginBottom: "16px", padding: "12px 14px", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)", borderRadius: "var(--radius-md)", fontSize: "0.84rem", color: "var(--error)", lineHeight: 1.5 }}>
                ❌ {emailResult.error}
                {emailResult.error.includes("connect") && (
                  <div style={{ marginTop: "8px", fontSize: "0.76rem", color: "var(--text-muted)" }}>
                    💡 Tip: Try enabling "Advanced Settings" and enter your SMTP host manually.
                  </div>
                )}
              </div>
            )}

            {/* Actions */}
            <div style={{ display: "flex", gap: "12px" }}>
              <button className="btn-ghost" onClick={() => setShowEmailModal(false)} style={{ flex: 1 }}>
                Cancel
              </button>
              <button
                className="btn-primary"
                onClick={sendEmails}
                disabled={emailStatus === "sending" || !senderEmail || !senderPassword}
                style={{ flex: 2 }}
              >
                {emailStatus === "sending"
                  ? <><span className="btn-spinner" style={{ width: 16, height: 16, borderWidth: 2, display: "inline-block", verticalAlign: "middle", marginRight: 8 }} />Sending...</>
                  : emailModalTarget
                    ? `📧 Send to ${emailModalTarget.name}`
                    : `📧 Send to ${certificates.filter(c => !c.error).length} Participants`
                }
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
