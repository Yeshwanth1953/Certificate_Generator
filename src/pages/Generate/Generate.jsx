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
        setProgress(Math.round(((i) / recipients.length) * 100));

        // 1. Generate unique certificate ID
        const certId = crypto.randomUUID();

        // 2. Build the verification URL that the QR code will point to
        const verifyUrl = `${VERIFY_BASE}?id=${certId}`;

        // 3. Generate QR code as a base64 PNG data URL
        const qrDataUrl = await QRCode.toDataURL(verifyUrl, {
          width: 100,
          margin: 1,
          color: { dark: "#000000", light: "#ffffff" },
        });

        // 4. Create an off-screen fabric canvas
        const tempCanvas = document.createElement("canvas");
        tempCanvas.width  = size.w;
        tempCanvas.height = size.h;
        const fCanvas = new fabric.Canvas(tempCanvas, {
          width: size.w,
          height: size.h,
          backgroundColor: "#ffffff",
          renderOnAddRemove: false,
        });

        // 5. Load the template image as background
        if (templateURL) {
          try {
            const bgImg = await fabric.Image.fromURL(templateURL, { crossOrigin: "anonymous" });
            bgImg.scaleToWidth(size.w);
            bgImg.scaleToHeight(size.h);
            fCanvas.backgroundImage = bgImg;
          } catch (_) { /* Continue without background if CORS fails */ }
        }

        // 6. Load the saved canvas config (text fields etc.)
        await new Promise((resolve) => {
          fCanvas.loadFromJSON(canvasConfig, () => resolve());
        });

        // 7. Replace {{placeholder}} text with real recipient data
        fCanvas.getObjects().forEach(obj => {
          if (obj.type === "textbox" || obj.type === "i-text" || obj.type === "text") {
            let text = obj.text || "";
            // Replace each {{key}} with the corresponding recipient value
            Object.entries(recipient).forEach(([key, val]) => {
              text = text.replace(new RegExp(`{{${key}}}`, "g"), val || "");
            });
            // Replace {{id}} with the generated certId
            text = text.replace(/{{id}}/g, certId.slice(0, 8).toUpperCase());
            obj.set("text", text);
          }
        });

        // 8. Add QR code to the bottom-right corner of the certificate
        const qrImg = await fabric.Image.fromURL(qrDataUrl);
        qrImg.set({
          left: size.w - 110,
          top:  size.h - 110,
          scaleX: 100 / (qrImg.width || 100),
          scaleY: 100 / (qrImg.height || 100),
          selectable: false,
          evented: false,
        });
        fCanvas.add(qrImg);
        fCanvas.renderAll();

        // 9. Export canvas to PNG data URL
        const pngDataUrl = fCanvas.toDataURL({ format: "png", multiplier: 2 });

        // 10. Convert PNG to PDF using jsPDF
        const orientation = size.w > size.h ? "l" : "p";
        const pdf = new jsPDF({
          orientation,
          unit: "px",
          format: [size.w, size.h],
          hotfixes: ["px_scaling"],
        });
        pdf.addImage(pngDataUrl, "PNG", 0, 0, size.w, size.h);
        const pdfDataUrl = pdf.output("datauristring");

        // 11. Save certificate record to Firestore
        await setDoc(doc(db, "certificates", certId), {
          certId,
          recipientName,
          recipientData: recipient,
          issuerUID:  user.uid,
          issuerName: userProfile?.name || user.email,
          organization: userProfile?.organization || "",
          issuedAt: serverTimestamp(),
          verifyUrl,
          verified: true,
          canvasSize,
        });

        // 12. Cleanup the temp canvas
        fCanvas.dispose();

        generated.push({ name: recipientName, certId, pdfDataUrl, verifyUrl, pngDataUrl });

      } catch (err) {
        console.error(`Error generating for ${recipientName}:`, err);
        generated.push({ name: recipientName, certId: null, pdfDataUrl: null, error: true });
      }
    }

    // 13. Update user's total certificate count in Firestore
    try {
      await updateDoc(doc(db, "users", user.uid), {
        totalCertificates: increment(generated.filter(g => !g.error).length),
        totalRecipients:   increment(generated.filter(g => !g.error).length),
      });
    } catch (_) {}

    setProgress(100);
    setStatus("done");
    setCertificates(generated);
    showToast(`🎉 ${generated.filter(g => !g.error).length} certificates generated!`);
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

  // ── DOWNLOAD ALL CERTIFICATES AS ZIP ────────────────────
  const downloadAll = () => {
    certificates.filter(c => !c.error).forEach((cert, i) => {
      setTimeout(() => downloadCert(cert), i * 200); // Stagger downloads
    });
    showToast("Downloading all certificates...", "info");
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
                <button className="btn-primary" onClick={downloadAll}>
                  ⬇ Download All
                </button>
              </div>
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
                    <div className="cert-error-msg">⚠ Failed to generate</div>
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
                        className="cert-action-btn"
                        title="Download PDF"
                        onClick={() => downloadCert(cert)}
                      >
                        ⬇ Download
                      </button>
                      <button
                        className="cert-action-btn"
                        title="Share to LinkedIn"
                        onClick={() => shareLinkedIn(cert)}
                      >
                        🔗 LinkedIn
                      </button>
                      <button
                        className="cert-action-btn"
                        title="Copy Verify Link"
                        onClick={() => copyVerifyLink(cert)}
                      >
                        📋 Copy Link
                      </button>
                      <a
                        className="cert-action-btn"
                        href={cert.verifyUrl}
                        target="_blank"
                        rel="noreferrer"
                        title="View Verification Page"
                      >
                        👁 Verify
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
    </div>
  );
}
