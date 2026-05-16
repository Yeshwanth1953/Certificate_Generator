// src/pages/Portal/Portal.jsx
// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC page — no login required.
// Participants come here to find their certificate using their Certificate ID.
//
// Flow:
// 1. Participant enters their short Certificate ID (e.g. "A3F8BC12")
// 2. We search Firestore for a document in "certificates" collection
//    where certId.startsWith(shortId.toLowerCase())
// 3. Show certificate details + "View Certificate" and "Verify" buttons
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from "react";
import { collection, query, where, getDocs, orderBy, limit } from "firebase/firestore";
import { db } from "../../firebase/config";
import "./Portal.css";

export default function Portal() {
  const [searchId,  setSearchId]  = useState("");
  const [status,    setStatus]    = useState("idle"); // idle | searching | found | notfound | error
  const [certData,  setCertData]  = useState(null);

  const formatDate = (ts) => {
    if (!ts) return "—";
    try {
      const d = ts.toDate ? ts.toDate() : new Date(ts);
      return d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
    } catch { return "—"; }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    const id = searchId.trim().toUpperCase();
    if (!id || id.length < 4) return;

    setStatus("searching");
    setCertData(null);

    try {
      // Firestore doesn't support startsWith natively, so we query all and filter client-side.
      // For small collections this is fine; for large scale use Algolia/Typesense.
      // We query by the first 8 chars stored as certId in Firestore.
      const snap = await getDocs(
        query(
          collection(db, "certificates"),
          orderBy("issuedAt", "desc"),
          limit(500)
        )
      );

      const match = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .find(c => c.certId?.toUpperCase().startsWith(id) ||
                   c.certId?.slice(0, 8).toUpperCase() === id);

      if (match) {
        setCertData(match);
        setStatus("found");
      } else {
        setStatus("notfound");
      }
    } catch (err) {
      console.error("Portal search error:", err);
      setStatus("error");
    }
  };

  return (
    <div className="portal-page">
      <div className="portal-bg-orbs" />

      {/* Header */}
      <header className="portal-header">
        <div className="portal-logo">
          <span>⬡</span>
          <span>Certify<span className="gold">Pro</span></span>
        </div>
        <div className="portal-header-badge">Participant Portal</div>
      </header>

      <div className="portal-container">

        {/* Hero */}
        <div className="portal-hero animate-fade">
          <div className="portal-hero-icon">🔍</div>
          <h1 className="portal-title">Find Your <span className="gold">Certificate</span></h1>
          <p className="portal-sub">
            Enter the Certificate ID you received by email to view and verify your certificate.
          </p>
        </div>

        {/* Search Form */}
        <form className="portal-search-form glass animate-fade" onSubmit={handleSearch}>
          <label className="portal-search-label">Your Certificate ID</label>
          <div className="portal-search-row">
            <input
              className="portal-search-input"
              type="text"
              placeholder="e.g. A3F8BC12"
              value={searchId}
              onChange={e => setSearchId(e.target.value.toUpperCase())}
              maxLength={36}
              autoFocus
              spellCheck={false}
            />
            <button
              type="submit"
              className="portal-search-btn"
              disabled={status === "searching" || searchId.trim().length < 4}
            >
              {status === "searching" ? <span className="portal-spinner" /> : "Search →"}
            </button>
          </div>
          <p className="portal-search-hint">
            Your ID was sent to you via email after certificate generation. It looks like <code>A3F8BC12</code>.
          </p>
        </form>

        {/* Not Found */}
        {status === "notfound" && (
          <div className="portal-result glass animate-fade portal-notfound">
            <div className="portal-result-icon">❌</div>
            <h2>Certificate Not Found</h2>
            <p>No certificate found matching <strong>{searchId}</strong>. Please double-check the ID from your email.</p>
            <button className="portal-try-again" onClick={() => { setStatus("idle"); setSearchId(""); }}>
              Try Again
            </button>
          </div>
        )}

        {/* Error */}
        {status === "error" && (
          <div className="portal-result glass animate-fade portal-notfound">
            <div className="portal-result-icon">⚠️</div>
            <h2>Something went wrong</h2>
            <p>Could not connect to the verification service. Please check your internet and try again.</p>
          </div>
        )}

        {/* Found */}
        {status === "found" && certData && (
          <div className="portal-result glass animate-fade portal-found">

            {/* Verified Badge */}
            <div className="portal-verified-badge">
              <div className="portal-check">✓</div>
              <div>
                <div className="portal-badge-title">Verified Certificate</div>
                <div className="portal-badge-sub">Issued via CertifyPro</div>
              </div>
            </div>

            <h2 className="portal-recipient">{certData.recipientName}</h2>
            <p className="portal-recipient-sub">Has been awarded this certificate</p>

            {/* Details */}
            <div className="portal-details">
              {certData.recipientData?.course && (
                <div className="portal-detail-row">
                  <span className="pd-label">Course / Program</span>
                  <span className="pd-value">{certData.recipientData.course}</span>
                </div>
              )}
              <div className="portal-detail-row">
                <span className="pd-label">Issued By</span>
                <span className="pd-value">{certData.issuerName || certData.organization || "CertifyPro"}</span>
              </div>
              <div className="portal-detail-row">
                <span className="pd-label">Issue Date</span>
                <span className="pd-value">{formatDate(certData.issuedAt)}</span>
              </div>
              <div className="portal-detail-row">
                <span className="pd-label">Certificate ID</span>
                <span className="pd-value">
                  <code className="portal-cert-id">{certData.certId?.slice(0, 8).toUpperCase()}</code>
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="portal-actions">
              <a
                href={certData.verifyUrl}
                target="_blank"
                rel="noreferrer"
                className="portal-btn portal-btn-primary"
              >
                ✅ View Full Verification
              </a>
              <button
                className="portal-btn portal-btn-ghost"
                onClick={() => navigator.clipboard.writeText(certData.verifyUrl).then(() => alert("Link copied!"))}
              >
                📋 Copy Verify Link
              </button>
              <a
                href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(certData.verifyUrl)}`}
                target="_blank"
                rel="noreferrer"
                className="portal-btn portal-btn-linkedin"
              >
                🔗 Add to LinkedIn
              </a>
            </div>

            <div className="portal-footer-note">
              This certificate was digitally issued and verified by CertifyPro.
              Scan the QR code on your certificate PDF for instant verification.
            </div>
          </div>
        )}

        {/* Info cards */}
        <div className="portal-info-grid animate-fade">
          {[
            { icon: "📧", title: "Check Your Email", desc: "Your Certificate ID was sent to you when the certificate was generated." },
            { icon: "🔒", title: "Tamper-Proof", desc: "Every certificate is stored securely and cannot be faked or altered." },
            { icon: "📱", title: "QR Code", desc: "Scan the QR code on your certificate PDF to instantly verify it." },
          ].map((c, i) => (
            <div key={i} className="portal-info-card glass">
              <div className="pic-icon">{c.icon}</div>
              <div className="pic-title">{c.title}</div>
              <div className="pic-desc">{c.desc}</div>
            </div>
          ))}
        </div>

      </div>

      <footer className="portal-footer">
        <p>Secure verification powered by <strong className="gold">CertifyPro</strong></p>
      </footer>
    </div>
  );
}
