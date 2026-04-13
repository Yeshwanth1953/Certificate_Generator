// src/pages/Customize/Customize.jsx
// ─────────────────────────────────────────────────────────────────────────────
// WHAT THIS PAGE DOES:
// This is the visual certificate editor powered by fabric.js (a canvas library).
//
// HOW IT WORKS:
// 1. Loads the template image (uploaded in Home page) as the canvas background
// 2. User can click "Add Field" buttons to drop text placeholders onto the canvas
//    - Each field (Name, Date, Course, etc.) becomes a draggable text box
//    - These are {{name}}, {{date}}, {{course}} placeholders — we replace them later
// 3. User can select a text box and change:
//    - Font family, font size, text color, Bold / Italic / Underline
//    - Position by dragging
// 4. On "Save & Continue" → serializes the canvas state to JSON → saves to localStorage
//    → navigates to /recipients
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import * as fabric from "fabric";
import Navbar from "../../components/Navbar/Navbar";
import "./Customize.css";

// Available placeholder fields the user can add to the certificate
const FIELD_TYPES = [
  { key: "name",         label: "Recipient Name",   color: "#f5c842" },
  { key: "course",       label: "Course / Event",   color: "#a78bfa" },
  { key: "date",         label: "Date",             color: "#34d399" },
  { key: "issuer",       label: "Issued By",        color: "#60a5fa" },
  { key: "id",           label: "Certificate ID",   color: "#f87171" },
  { key: "custom",       label: "+ Custom Field",   color: "#e2e8f0" },
];

const FONT_FAMILIES = [
  "Inter", "Georgia", "Times New Roman", "Courier New",
  "Arial", "Verdana", "Trebuchet MS", "Palatino",
];

const STEP_LABELS = ["Upload", "Customize", "Recipients", "Generate"];

export default function Customize() {
  const navigate = useNavigate();
  const canvasRef = useRef(null);
  const fabricRef = useRef(null); // Holds the fabric.Canvas instance

  // Selected object state (for the style toolbar)
  const [selected, setSelected] = useState(null);
  const [fontFamily, setFontFamily] = useState("Inter");
  const [fontSize, setFontSize] = useState(24);
  const [textColor, setTextColor] = useState("#ffffff");
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);

  // Canvas size presets
  const [canvasSize, setCanvasSize] = useState("a4-landscape");
  const [templateLoaded, setTemplateLoaded] = useState(false);
  const [error, setError] = useState("");

  const CANVAS_SIZES = {
    "a4-landscape": { w: 842, h: 595, label: "A4 Landscape" },
    "a4-portrait":  { w: 595, h: 842, label: "A4 Portrait"  },
    "letter":       { w: 792, h: 612, label: "Letter"        },
    "square":       { w: 700, h: 700, label: "Square"        },
  };

  // ── Initialize fabric.js canvas ──────────────────────────
  useEffect(() => {
    const size = CANVAS_SIZES[canvasSize];

    // Create the fabric canvas instance
    const canvas = new fabric.Canvas(canvasRef.current, {
      width: size.w,
      height: size.h,
      backgroundColor: "#ffffff",
      selection: true,
      preserveObjectStacking: true,
    });
    fabricRef.current = canvas;

    // Load the template image from localStorage (put there by Home page)
    const templateURL = localStorage.getItem("cp_template_url");
    if (templateURL) {
      fabric.Image.fromURL(templateURL, { crossOrigin: "anonymous" })
        .then((img) => {
          // Scale image to fill the canvas
          img.scaleToWidth(size.w);
          img.scaleToHeight(size.h);
          img.set({ selectable: false, evented: false, lockMovementX: true, lockMovementY: true });
          canvas.backgroundImage = img;
          canvas.renderAll();
          setTemplateLoaded(true);
        })
        .catch(() => {
          setTemplateLoaded(true); // Continue even without image
        });
    } else {
      setTemplateLoaded(true);
    }

    // When user selects an object → update the style toolbar
    canvas.on("selection:created", (e) => syncToolbar(e.selected[0]));
    canvas.on("selection:updated", (e) => syncToolbar(e.selected[0]));
    canvas.on("selection:cleared", () => setSelected(null));

    return () => {
      canvas.dispose();
    };
  }, []); // Only run once on mount

  // Sync toolbar controls when a text box is selected
  const syncToolbar = (obj) => {
    if (!obj) return;
    setSelected(obj);
    setFontFamily(obj.fontFamily || "Inter");
    setFontSize(obj.fontSize || 24);
    setTextColor(obj.fill || "#ffffff");
    setIsBold(obj.fontWeight === "bold");
    setIsItalic(obj.fontStyle === "italic");
  };

  // ── Add a field to the canvas ────────────────────────────
  const addField = (fieldType) => {
    const canvas = fabricRef.current;
    if (!canvas) return;

    let text = `{{${fieldType.key}}}`;
    if (fieldType.key === "custom") text = "{{custom_text}}";

    const textBox = new fabric.Textbox(text, {
      left: 100 + Math.random() * 200,
      top: 100 + Math.random() * 150,
      width: 280,
      fontSize: 24,
      fontFamily: "Inter",
      fill: fieldType.color,
      textAlign: "center",
      editable: true,
      // Store the field type as metadata so we can read it later
      fieldKey: fieldType.key,
      fieldLabel: fieldType.label,
    });

    canvas.add(textBox);
    canvas.setActiveObject(textBox);
    canvas.renderAll();
  };

  // ── Apply style to selected object ───────────────────────
  const applyStyle = (prop, value) => {
    const canvas = fabricRef.current;
    const obj = canvas?.getActiveObject();
    if (!obj) return;
    obj.set(prop, value);
    canvas.renderAll();
  };

  const handleFontFamily = (val) => {
    setFontFamily(val);
    applyStyle("fontFamily", val);
  };
  const handleFontSize = (val) => {
    setFontSize(Number(val));
    applyStyle("fontSize", Number(val));
  };
  const handleColor = (val) => {
    setTextColor(val);
    applyStyle("fill", val);
  };
  const handleBold = () => {
    const next = !isBold;
    setIsBold(next);
    applyStyle("fontWeight", next ? "bold" : "normal");
  };
  const handleItalic = () => {
    const next = !isItalic;
    setIsItalic(next);
    applyStyle("fontStyle", next ? "italic" : "normal");
  };

  // Delete selected object
  const deleteSelected = () => {
    const canvas = fabricRef.current;
    const obj = canvas?.getActiveObject();
    if (obj) { canvas.remove(obj); canvas.renderAll(); setSelected(null); }
  };

  // ── Save canvas config and continue ─────────────────────
  const handleSaveAndContinue = () => {
    const canvas = fabricRef.current;
    if (!canvas) return;

    // Check that at least one field is added
    const objects = canvas.getObjects();
    if (objects.length === 0) {
      return setError("Please add at least one text field to the certificate.");
    }

    // Extract placeholder keys so Recipients page knows which columns to ask for
    const placeholders = objects
      .filter(obj => obj.fieldKey)
      .map(obj => ({ key: obj.fieldKey, label: obj.fieldLabel || obj.fieldKey }));

    // Remove duplicates
    const uniquePlaceholders = [...new Map(placeholders.map(p => [p.key, p])).values()];

    // Serialize the entire canvas to JSON (fabric can reconstruct it from this)
    const canvasJSON = canvas.toJSON(["fieldKey", "fieldLabel"]);

    // Save to localStorage
    localStorage.setItem("cp_canvas_config", JSON.stringify(canvasJSON));
    localStorage.setItem("cp_placeholders", JSON.stringify(uniquePlaceholders));
    localStorage.setItem("cp_canvas_size", canvasSize);

    navigate("/recipients");
  };

  const size = CANVAS_SIZES[canvasSize];
  const scale = Math.min(1, (window.innerWidth - 380) / size.w);

  return (
    <div className="page-wrapper">
      <Navbar />
      <div className="cust-layout">

        {/* ── LEFT PANEL: Field Buttons + Size Selector ── */}
        <aside className="cust-sidebar glass">
          <h2 className="cust-sidebar-title">🎨 Template Editor</h2>

          {/* Step progress bar */}
          <div className="step-bar" style={{ padding: "0 0 20px" }}>
            {STEP_LABELS.map((label, i) => (
              <div key={i} className={`step-item ${i === 1 ? "active" : i < 1 ? "done" : ""}`}>
                <div className="step-circle">{i < 1 ? "✓" : i + 1}</div>
                <span className="step-label">{label}</span>
              </div>
            ))}
          </div>

          {/* Canvas Size */}
          <div className="cust-section">
            <label className="input-label">Canvas Size</label>
            <select
              className="input-field"
              value={canvasSize}
              onChange={e => setCanvasSize(e.target.value)}
            >
              {Object.entries(CANVAS_SIZES).map(([key, { label }]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
            <p className="hint-text">⚠ Changing size will reset fields</p>
          </div>

          {/* Add Fields */}
          <div className="cust-section">
            <label className="input-label">Add Text Fields</label>
            <p className="cust-hint">Click a field to place it on the certificate</p>
            <div className="field-buttons">
              {FIELD_TYPES.map(ft => (
                <button
                  key={ft.key}
                  className="field-btn"
                  style={{ borderColor: ft.color + "50", color: ft.color }}
                  onClick={() => addField(ft)}
                >
                  + {ft.label}
                </button>
              ))}
            </div>
          </div>

          {/* Style Toolbar — only visible when an object is selected */}
          {selected && (
            <div className="cust-section cust-toolbar animate-fade">
              <label className="input-label">Selected Field Style</label>

              <div className="toolbar-row">
                <select
                  className="input-field toolbar-select"
                  value={fontFamily}
                  onChange={e => handleFontFamily(e.target.value)}
                >
                  {FONT_FAMILIES.map(f => <option key={f} value={f}>{f}</option>)}
                </select>
                <input
                  type="number"
                  className="input-field toolbar-size"
                  value={fontSize}
                  min={8} max={120}
                  onChange={e => handleFontSize(e.target.value)}
                />
              </div>

              <div className="toolbar-row">
                <button className={`tool-btn ${isBold ? "active" : ""}`} onClick={handleBold} title="Bold">
                  <b>B</b>
                </button>
                <button className={`tool-btn ${isItalic ? "active" : ""}`} onClick={handleItalic} title="Italic">
                  <i>I</i>
                </button>
                <div className="color-wrap">
                  <label className="input-label" style={{ margin: 0, fontSize: "0.72rem" }}>Color</label>
                  <input type="color" value={textColor} onChange={e => handleColor(e.target.value)} className="color-input" />
                </div>
                <button className="tool-btn danger" onClick={deleteSelected} title="Delete">🗑</button>
              </div>
            </div>
          )}

          {error && <div className="cust-error">⚠ {error}</div>}

          <button className="btn-primary cust-save-btn" onClick={handleSaveAndContinue}>
            Save & Add Recipients →
          </button>
        </aside>

        {/* ── RIGHT: Canvas ── */}
        <main className="cust-canvas-area">
          {!templateLoaded && (
            <div className="canvas-loading">Loading template...</div>
          )}
          <div
            className="canvas-scaler"
            style={{ transform: `scale(${scale})`, transformOrigin: "top left" }}
          >
            <canvas ref={canvasRef} />
          </div>
          <p className="canvas-hint">
            💡 Drag fields to position them · Double-click to edit text · Select to change style
          </p>
        </main>
      </div>
    </div>
  );
}
