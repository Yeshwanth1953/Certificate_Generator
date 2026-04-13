// src/pages/Verify/Verify.jsx
// ─────────────────────────────────────────────────────────────────────────────
// WHAT THIS PAGE DOES:
// PUBLIC page — no login required. This is what appears when someone scans the
// QR code on a certificate.
//
// URL format: /verify?id=CERTIFICATE_UUID
//
// Flow:
// 1. Read the "id" parameter from the URL
// 2. Look up that ID in Firestore's "certificates" collection
// 3. If found → show green ✅ "Verified Certificate" with all details
// 4. If not found → show red ❌ "Invalid or Not Found"
//
// This page proves the certificate is REAL and not fabricated because:
// - Only CertifyPro (via authenticated user accounts) can write to Firestore
// - The certificate record contains the issuer's UID, so it's traceable
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../firebase/config";
import "./Verify.css";

export default function Verify() {
  const [searchParams] = useSearchParams();
  const certId = searchParams.get("id"); // Read ?id=... from URL

  const [status, setStatus] = useState("loading"); // loading | verified | invalid | no-id
  const [certData, setCertData] = useState(null);

  useEffect(() => {
    if (!certId) {
      setStatus("no-id");
      return;
    }
    // Look up the certificate in Firestore
    lookupCertificate(certId);
  }, [certId]);

  const lookupCertificate = async (id) => {
    try {
      const certRef = doc(db, "certificates", id);
      const snap = await getDoc(certRef);

      if (snap.exists()) {
        setCertData(snap.data());
        setStatus("verified");
      } else {
        setStatus("invalid");
      }
    } catch (err) {
      setStatus("invalid");
    }
  };

  // Format Firestore timestamp to readable date
  const formatDate = (timestamp) => {
    if (!timestamp) return "Unknown date";
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch { return "Unknown date"; }
  };

  return (
    <div className="verify-page">
      <div className="verify-bg-orbs" />

      {/* Header */}
      <header className="verify-header">
        <div className="verify-logo">
          <span>⬡</span>
          <span>Certify<span className="gold">Pro</span></span>
        </div>
      </header>

      <div className="verify-container">

        {/* ── LOADING ── */}
        {status === "loading" && (
          <div className="verify-card glass animate-scale">
            <div className="verify-spinner" />
            <p className="verify-loading-text">Verifying certificate...</p>
            <p className="verify-id-display">ID: {certId}</p>
          </div>
        )}

        {/* ── NO ID ── */}
        {status === "no-id" && (
          <div className="verify-card glass animate-scale">
            <div className="verify-status-icon">❓</div>
            <h1 className="verify-title">No Certificate ID</h1>
            <p className="verify-desc">
              This page requires a certificate ID in the URL.
              If you scanned a QR code, please try again.
            </p>
          </div>
        )}

        {/* ── INVALID ── */}
        {status === "invalid" && (
          <div className="verify-card verify-invalid glass animate-scale">
            <div className="verify-status-icon invalid-icon">✕</div>
            <h1 className="verify-title">Certificate Not Found</h1>
            <p className="verify-desc">
              This certificate could not be verified. It may be invalid,
              expired, or not issued through CertifyPro.
            </p>
            <div className="verify-id-box">
              <span className="verify-id-label">Searched ID:</span>
              <code className="verify-id-code">{certId}</code>
            </div>
            <div className="invalid-warning">
              ⚠ If you believe this is an error, contact the organization that issued this certificate.
            </div>
          </div>
        )}

        {/* ── VERIFIED ── */}
        {status === "verified" && certData && (
          <div className="verify-card verify-valid glass animate-scale">
            {/* Verified Badge */}
            <div className="verified-badge">
              <div className="verified-check">✓</div>
              <div>
                <div className="verified-badge-title">Verified Certificate</div>
                <div className="verified-badge-sub">Issued via CertifyPro</div>
              </div>
            </div>

            {/* Certificate Details */}
            <h1 className="verify-recipient">{certData.recipientName}</h1>
            <p className="verify-subtitle">Has been awarded this certificate</p>

            <div className="verify-details stagger-children">
              {certData.recipientData?.course && (
                <div className="verify-detail-item">
                  <span className="vd-label">Course / Program</span>
                  <span className="vd-value">{certData.recipientData.course}</span>
                </div>
              )}
              <div className="verify-detail-item">
                <span className="vd-label">Issued By</span>
                <span className="vd-value">
                  {certData.issuerName || certData.organization || "CertifyPro"}
                </span>
              </div>
              <div className="verify-detail-item">
                <span className="vd-label">Issue Date</span>
                <span className="vd-value">{formatDate(certData.issuedAt)}</span>
              </div>
              <div className="verify-detail-item">
                <span className="vd-label">Certificate ID</span>
                <span className="vd-value">
                  <code className="verify-id-code">
                    {certData.certId?.slice(0, 8).toUpperCase()}
                  </code>
                </span>
              </div>
            </div>

            {/* Additional recipient fields */}
            {certData.recipientData && Object.keys(certData.recipientData).length > 0 && (
              <div className="verify-extra">
                {Object.entries(certData.recipientData)
                  .filter(([k]) => !["name", "course"].includes(k))
                  .map(([key, val]) => (
                    <div key={key} className="verify-extra-item">
                      <span className="ve-key">{key}</span>
                      <span className="ve-val">{val}</span>
                    </div>
                  ))}
              </div>
            )}

            <div className="verify-footer-note">
              This certificate was digitally issued and verified by CertifyPro.
              The QR code links directly to this verification page.
            </div>
          </div>
        )}

        {/* Powered by */}
        <div className="verify-poweredby">
          Secure verification powered by <strong>CertifyPro</strong>
        </div>
      </div>
    </div>
  );
}
