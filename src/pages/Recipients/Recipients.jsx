// src/pages/Recipients/Recipients.jsx
// ─────────────────────────────────────────────────────────────────────────────
// WHAT THIS PAGE DOES:
// Collects the list of people for whom certificates will be generated.
//
// TWO WAYS TO ADD RECIPIENTS:
// 1. MANUAL — A table where user types each person's details row by row
// 2. CSV UPLOAD — User uploads a CSV file, we auto-parse it with Papa Parse
//    The CSV columns must match the placeholder keys from the Customize page
//    e.g., if they added {{name}} and {{course}}, CSV must have "name","course" columns
//
// After adding recipients, click "Generate Certificates →" to go to /generate
// The recipients list is saved to localStorage as "cp_recipients"
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Papa from "papaparse";
import Navbar from "../../components/Navbar/Navbar";
import "./Recipients.css";

const STEP_LABELS = ["Upload", "Customize", "Recipients", "Generate"];


// Contact columns always shown in manual entry (not tied to template placeholders)
// These are used for email delivery — email is required to send certificates
const CONTACT_COLS = [
  { key: "email", label: "Email", type: "email", placeholder: "participant@example.com", required: false },
  { key: "phone", label: "Phone (optional)", type: "tel", placeholder: "+91 9876543210", required: false },
];

export default function Recipients() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  // Load placeholder keys from previous step (e.g., [{key:"name", label:"Recipient Name"}])
  const placeholders = JSON.parse(localStorage.getItem("cp_placeholders") || "[]");

  // Recipients list — each item is an object with keys matching placeholders + email + phone
  const [rows, setRows] = useState([createEmptyRow(placeholders)]);

  const [csvError, setCsvError] = useState("");
  const [csvSuccess, setCsvSuccess] = useState("");
  const [activeTab, setActiveTab] = useState("manual"); // "manual" | "csv"
  const [error, setError] = useState("");

  // Create an empty row object with all placeholder keys + contact fields set to ""
  function createEmptyRow(pKeys) {
    const base = Object.fromEntries((pKeys || []).map(p => [p.key, ""]));
    CONTACT_COLS.forEach(c => { base[c.key] = ""; });
    return base;
  }

  // ── MANUAL ENTRY ─────────────────────────────────────────
  const updateRow = (rowIndex, key, value) => {
    setRows(prev => {
      const next = [...prev];
      next[rowIndex] = { ...next[rowIndex], [key]: value };
      return next;
    });
  };

  const addRow = () => {
    setRows(prev => [...prev, createEmptyRow(placeholders)]);
  };

  const removeRow = (index) => {
    setRows(prev => prev.filter((_, i) => i !== index));
  };

  // ── CSV UPLOAD ───────────────────────────────────────────
  const handleCSVUpload = (file) => {
    setCsvError("");
    setCsvSuccess("");

    if (!file || !file.name.endsWith(".csv")) {
      return setCsvError("Please upload a valid .csv file.");
    }

    Papa.parse(file, {
      header: true,         // First row = column headers
      skipEmptyLines: true,
      complete: (results) => {
        if (results.errors.length > 0) {
          return setCsvError("Error reading CSV. Please check the file format.");
        }

        const parsedRows = results.data;

        // Validate that CSV has all required columns (placeholders only, not contact cols)
        const csvKeys = Object.keys(parsedRows[0] || {}).map(k => k.trim().toLowerCase());
        const missingKeys = placeholders
          .filter(p => p.key !== "id") // "id" is auto-generated, not needed in CSV
          .filter(p => !csvKeys.includes(p.key.toLowerCase()));

        if (missingKeys.length > 0) {
          return setCsvError(
            `CSV is missing columns: ${missingKeys.map(p => p.key).join(", ")}. ` +
            `Required columns: ${placeholders.map(p => p.key).join(", ")}`
          );
        }

        // Normalize keys to lowercase and trim values
        const normalizedRows = parsedRows.map(row => {
          const normalized = {};
          Object.entries(row).forEach(([k, v]) => {
            normalized[k.trim().toLowerCase()] = (v || "").trim();
          });
          // Ensure contact cols exist even if not in CSV
          CONTACT_COLS.forEach(c => { if (!normalized[c.key]) normalized[c.key] = ""; });
          return normalized;
        });

        setRows(normalizedRows);
        setCsvSuccess(`✓ ${normalizedRows.length} recipients loaded from CSV!`);
        setActiveTab("manual"); // Switch to manual view to see the loaded data
      },
      error: () => setCsvError("Failed to parse CSV. Check the file format."),
    });
  };

  // ── VALIDATE & CONTINUE ──────────────────────────────────
  const handleContinue = () => {
    setError("");

    if (rows.length === 0) return setError("Please add at least one recipient.");

    // Check that all rows have the "name" field filled (minimum requirement)
    const nameKey = placeholders.find(p => p.key === "name")?.key;
    if (nameKey) {
      const incomplete = rows.filter(r => !r[nameKey]?.trim());
      if (incomplete.length > 0) {
        return setError(`${incomplete.length} row(s) are missing the Name field. Please fill them in.`);
      }
    }

    // Save to localStorage
    localStorage.setItem("cp_recipients", JSON.stringify(rows));
    navigate("/generate");
  };

  // ── DOWNLOAD CSV TEMPLATE ────────────────────────────────
  const downloadTemplate = () => {
    // Include both template placeholder columns AND contact columns
    const allCols = [
      ...placeholders.map(p => p.key),
      ...CONTACT_COLS.map(c => c.key),
    ];
    const exampleVals = [
      ...placeholders.map(p => {
        if (p.key === "name") return "John Doe";
        if (p.key === "course") return "React Development";
        if (p.key === "date") return "January 1, 2025";
        if (p.key === "issuer") return "CertifyPro";
        return "example";
      }),
      "john@example.com",  // email
      "+91 9876543210",    // phone
    ];
    const csv = `${allCols.join(",")}\n${exampleVals.join(",")}`;
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "certifypro_template.csv"; a.click();
  };

  return (
    <div className="page-wrapper">
      <Navbar />
      <div className="container-sm" style={{ paddingTop: "40px", paddingBottom: "60px" }}>

        {/* Step Bar */}
        <div className="step-bar">
          {STEP_LABELS.map((label, i) => (
            <div key={i} className={`step-item ${i === 2 ? "active" : i < 2 ? "done" : ""}`}>
              <div className="step-circle">{i < 2 ? "✓" : i + 1}</div>
              <span className="step-label">{label}</span>
            </div>
          ))}
        </div>

        <div className="recip-header animate-fade">
          <h1 className="section-title">Add <span>Recipients</span></h1>
          <p className="section-sub">
            Add participant details. <strong>Name</strong> appears on the certificate.
            <strong> Email</strong> is used to send them their certificate link.
          </p>
        </div>

        {/* Name Zone Info Banner */}
        <div className="recip-info-banner animate-fade" style={{
          background: "rgba(245,200,66,0.08)",
          border: "1px solid rgba(245,200,66,0.3)",
          borderRadius: "12px",
          padding: "14px 18px",
          display: "flex",
          alignItems: "flex-start",
          gap: "12px",
          marginBottom: "20px",
          fontSize: "0.875rem",
          color: "#f5c842",
          lineHeight: "1.5",
        }}>
          <span style={{ fontSize: "1.2rem", flexShrink: 0 }}>📍</span>
          <span>
            <strong>Name Zone active</strong> — The <strong>name</strong> column here will automatically
            appear on each certificate at the position you defined in the editor.
            You don&apos;t need to type names in the editor at all.
          </span>
        </div>

        {/* Placeholder Guide */}
        {placeholders.length > 0 && (
          <div className="placeholder-guide glass animate-fade">
            <span className="pg-label">Certificate fields from your template:</span>
            <div className="pg-tags">
              {placeholders.map(p => (
                <span key={p.key} className="badge badge-purple">{p.label}</span>
              ))}
              <span className="badge" style={{ background: "rgba(34,197,94,0.15)", color: "#22c55e", border: "1px solid rgba(34,197,94,0.3)" }}>📧 email</span>
              <span className="badge" style={{ background: "rgba(99,102,241,0.15)", color: "#818cf8", border: "1px solid rgba(99,102,241,0.3)" }}>📱 phone</span>
            </div>
          </div>
        )}

        {/* Source Tabs */}
        <div className="recip-tabs animate-fade">
          <button
            className={`recip-tab ${activeTab === "manual" ? "active" : ""}`}
            onClick={() => setActiveTab("manual")}
          >
            ✏ Manual Entry
          </button>
          <button
            className={`recip-tab ${activeTab === "csv" ? "active" : ""}`}
            onClick={() => setActiveTab("csv")}
          >
            📊 Upload CSV
          </button>
        </div>

        {/* ── CSV Upload Tab ── */}
        {activeTab === "csv" && (
          <div className="csv-panel glass animate-fade">
            <div className="csv-header">
              <h3>Upload CSV File</h3>
              <button className="btn-ghost" onClick={downloadTemplate}>
                ⬇ Download Template
              </button>
            </div>
            <p className="csv-hint">
              Required columns: <strong>{placeholders.map(p => p.key).join(", ")}</strong>
              <span style={{ color: "#22c55e" }}>, email</span>
              <span style={{ color: "#818cf8" }}>, phone</span>
              <span style={{ color: "var(--text-muted)" }}> (phone optional)</span>
            </p>
            <div
              className="csv-drop"
              onClick={() => fileInputRef.current.click()}
              onDragOver={e => e.preventDefault()}
              onDrop={e => { e.preventDefault(); handleCSVUpload(e.dataTransfer.files[0]); }}
            >
              <span className="csv-drop-icon">📊</span>
              <p>Drop CSV file here or <span className="link-text">click to browse</span></p>
              <p className="csv-drop-hint">.csv files only</p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              style={{ display: "none" }}
              onChange={e => handleCSVUpload(e.target.files[0])}
            />
            {csvError && <div className="recip-alert alert-error">⚠ {csvError}</div>}
            {csvSuccess && <div className="recip-alert alert-success">{csvSuccess}</div>}
          </div>
        )}

        {/* ── Manual Entry Tab ── */}
        {activeTab === "manual" && (
          <div className="manual-panel animate-fade">
            <div className="table-wrap">
              <table className="recip-table">
                <thead>
                  <tr>
                    <th>#</th>
                    {/* Template placeholder columns */}
                    {placeholders.map(p => (
                      <th key={p.key}>{p.label}</th>
                    ))}
                    {/* Always-present contact columns */}
                    <th style={{ color: "#22c55e" }}>📧 Email</th>
                    <th style={{ color: "#818cf8" }}>📱 Phone <span style={{ fontWeight: 400, opacity: 0.6 }}>(optional)</span></th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, rIdx) => (
                    <tr key={rIdx}>
                      <td className="row-num">{rIdx + 1}</td>
                      {/* Template fields */}
                      {placeholders.map(p => (
                        <td key={p.key}>
                          <input
                            className="table-input"
                            type="text"
                            value={row[p.key] || ""}
                            placeholder={`Enter ${p.label}`}
                            onChange={e => updateRow(rIdx, p.key, e.target.value)}
                          />
                        </td>
                      ))}
                      {/* Contact fields */}
                      {CONTACT_COLS.map(c => (
                        <td key={c.key}>
                          <input
                            className="table-input"
                            type={c.type}
                            value={row[c.key] || ""}
                            placeholder={c.placeholder}
                            onChange={e => updateRow(rIdx, c.key, e.target.value)}
                          />
                        </td>
                      ))}
                      <td>
                        {rows.length > 1 && (
                          <button className="row-delete" onClick={() => removeRow(rIdx)}>✕</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <button className="btn-ghost add-row-btn" onClick={addRow}>
              + Add Another Recipient
            </button>
          </div>
        )}

        {error && <div className="recip-alert alert-error" style={{ marginTop: "16px" }}>⚠ {error}</div>}

        {/* Summary + CTA */}
        <div className="recip-footer animate-fade">
          <div className="recip-summary glass">
            <span>📋</span>
            <span><strong>{rows.length}</strong> recipient{rows.length !== 1 ? "s" : ""} ready</span>
            {rows.some(r => r.email?.trim()) && (
              <span style={{ fontSize: "0.8rem", color: "#22c55e", marginLeft: 8 }}>
                · {rows.filter(r => r.email?.trim()).length} with email
              </span>
            )}
          </div>
          <button className="btn-primary recip-cta" onClick={handleContinue}>
            Generate {rows.length} Certificate{rows.length !== 1 ? "s" : ""} →
          </button>
        </div>
      </div>
    </div>
  );
}

