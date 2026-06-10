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

// Placeholder fields — name is handled separately via the Name Zone panel
const FIELD_TYPES = [
  { key: "course", label: "Course / Event", color: "#a78bfa" },
  { key: "date", label: "Date", color: "#34d399" },
  { key: "issuer", label: "Issued By", color: "#60a5fa" },
  { key: "id", label: "Certificate ID", color: "#f87171" },
  { key: "custom", label: "+ Custom Field", color: "#e2e8f0" },
];

// Font groups — organized by style for easy selection
const FONT_GROUPS = [
  {
    label: "Script / Calligraphy",
    fonts: ["Dancing Script", "Great Vibes", "Cormorant Garamond"],
  },
  {
    label: "Elegant Serif",
    fonts: ["Playfair Display", "Cinzel", "EB Garamond", "Libre Baskerville",
      "Lora", "Merriweather", "Crimson Text", "Source Serif 4",
      "Georgia", "Times New Roman", "Palatino"],
  },
  {
    label: "Modern Sans",
    fonts: ["Inter", "Montserrat", "Raleway", "Josefin Sans", "Arial", "Verdana"],
  },
  {
    label: "Monospace",
    fonts: ["Courier New"],
  },
];
const ALL_FONTS = FONT_GROUPS.flatMap(g => g.fonts);

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
  const [bgColor, setBgColor] = useState("#ffffff");
  const logoInputRef = useRef(null);

  // ── Name Zone State ──────────────────────────────────────
  const [nzX, setNzX] = useState(421);
  const [nzY, setNzY] = useState(298);
  const [nzFont, setNzFont] = useState("Cormorant Garamond");
  const [nzSize, setNzSize] = useState(36);
  const [nzColor, setNzColor] = useState("#1a1a2e");
  const [nzBold, setNzBold] = useState(true);
  const [nzItalic, setNzItalic] = useState(false);
  const [nzAlign, setNzAlign] = useState("center");
  const [nzPlaced, setNzPlaced] = useState(false);

  // ── QR Zone State ─────────────────────────────────────────
  const [qzX, setQzX] = useState(760);
  const [qzY, setQzY] = useState(480);
  const [qzSize, setQzSize] = useState(80);
  const [qzPlaced, setQzPlaced] = useState(false);

  const CANVAS_SIZES = {
    "a4-landscape": { w: 842, h: 595, label: "A4 Landscape", desc: "Most common" },
    "a4-portrait": { w: 595, h: 842, label: "A4 Portrait", desc: "Tall format" },
    "letter": { w: 792, h: 612, label: "US Letter", desc: "American standard" },
    "square": { w: 700, h: 700, label: "Square", desc: "Social media" },
    "a3-landscape": { w: 1191, h: 842, label: "A3 Landscape", desc: "Large format" },
    "banner": { w: 1200, h: 400, label: "Banner", desc: "Wide banner" },
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
          // Scale image to EXACTLY fill the canvas (stretch to fit)
          img.set({
            scaleX: size.w / img.width,
            scaleY: size.h / img.height,
            left: 0, top: 0,
            originX: "left", originY: "top",
            selectable: false, evented: false,
            lockMovementX: true, lockMovementY: true,
          });
          canvas.backgroundImage = img;
          canvas.renderAll();
          setTemplateLoaded(true);
        })
        .catch(() => setTemplateLoaded(true));

    } else {
      setTemplateLoaded(true);
    }

    // When user selects an object → update the style toolbar
    canvas.on("selection:created", (e) => syncToolbar(e.selected[0]));
    canvas.on("selection:updated", (e) => syncToolbar(e.selected[0]));
    canvas.on("selection:cleared", () => setSelected(null));

    // Sync Name Zone AND QR Zone X/Y when user drags them on canvas
    const syncNZ = (e) => {
      if (e.target?.isNameZone) {
        setNzX(Math.round(e.target.left));
        setNzY(Math.round(e.target.top));
      }
      if (e.target?.isQRZone) {
        setQzX(Math.round(e.target.left));
        setQzY(Math.round(e.target.top));
      }
    };
    canvas.on("object:modified", syncNZ);
    canvas.on("object:moving", syncNZ);

    return () => {
      canvas.dispose();
    };
    // Re-run whenever canvasSize changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canvasSize]);

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

  // ── Name Zone: place or update the special name placeholder ─
  const placeNameZone = () => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    // Remove existing name zone object first
    const existing = canvas.getObjects().find(o => o.isNameZone);
    if (existing) canvas.remove(existing);

    const obj = new fabric.Textbox("{{name}}", {
      left: nzX,
      top: nzY,
      width: Math.max(200, nzSize * 8),
      fontSize: nzSize,
      fontFamily: nzFont,
      fill: nzColor,
      fontWeight: nzBold ? "bold" : "normal",
      fontStyle: nzItalic ? "italic" : "normal",
      textAlign: nzAlign,
      isNameZone: true,
      fieldKey: "name",
      fieldLabel: "Recipient Name",
      editable: false,
    });
    canvas.add(obj);
    canvas.setActiveObject(obj);
    canvas.renderAll();
    setNzPlaced(true);
  };

  // Update the name zone object on canvas when inputs change (if already placed)
  const updateNameZone = (props) => {
    const canvas = fabricRef.current;
    const obj = canvas?.getObjects().find(o => o.isNameZone);
    if (!obj) return;
    obj.set(props);
    canvas.renderAll();
  };

  // ── QR Zone: place or update the QR placeholder ──────────
  const placeQRZone = () => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const existing = canvas.getObjects().find(o => o.isQRZone);
    if (existing) canvas.remove(existing);

    const obj = new fabric.Rect({
      left: qzX, top: qzY,
      width: qzSize, height: qzSize,
      fill: "rgba(255,255,255,0.85)",
      stroke: "#6c63ff", strokeWidth: 2,
      strokeDashArray: [5, 3],
      rx: 4, ry: 4,
      isQRZone: true,
      selectable: true, evented: true,
    });
    canvas.add(obj);
    canvas.setActiveObject(obj);
    canvas.renderAll();
    setQzPlaced(true);
  };

  const updateQRZone = (props) => {
    const canvas = fabricRef.current;
    const obj = canvas?.getObjects().find(o => o.isQRZone);
    if (!obj) return;
    obj.set(props);
    if (props.width) obj.set({ height: props.width });
    canvas.renderAll();
  };

  // ── Background color (Build From Scratch / overlay color) ───
  const handleBgColor = (color) => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    setBgColor(color);
    // Only change background color if no template is set
    if (!localStorage.getItem("cp_template_url")) {
      canvas.backgroundColor = color;
      canvas.renderAll();
    }
  };

  // ── Gradient presets (replaces background) ──────────────────
  const applyGradient = (stops) => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    if (localStorage.getItem("cp_template_url")) return; // skip if template set
    const { w, h } = CANVAS_SIZES[canvasSize];
    const grad = new fabric.Gradient({
      type: "linear",
      gradientUnits: "pixels",
      coords: { x1: 0, y1: 0, x2: w, y2: h },
      colorStops: stops,
    });
    canvas.backgroundColor = grad;
    canvas.renderAll();
  };

  const GRADIENT_PRESETS = [
    { label: "Gold", stops: [{ offset: 0, color: "#1a1200" }, { offset: 1, color: "#3d2800" }] },
    { label: "Navy", stops: [{ offset: 0, color: "#0a0e27" }, { offset: 1, color: "#1a237e" }] },
    { label: "Forest", stops: [{ offset: 0, color: "#0a1f0a" }, { offset: 1, color: "#1b5e20" }] },
    { label: "Mauve", stops: [{ offset: 0, color: "#1a0a2e" }, { offset: 1, color: "#4a148c" }] },
    { label: "Warm", stops: [{ offset: 0, color: "#fff8f0" }, { offset: 1, color: "#fde8d0" }] },
    { label: "Slate", stops: [{ offset: 0, color: "#0f1923" }, { offset: 1, color: "#263238" }] },
  ];

  // ── Shape tools ─────────────────────────────────────────────
  const addShape = (type) => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const { w, h } = CANVAS_SIZES[canvasSize];
    let shape;
    const cx = w / 2, cy = h / 2;

    if (type === "rect") {
      shape = new fabric.Rect({
        left: cx - 100, top: cy - 60,
        width: 200, height: 120,
        fill: "transparent",
        stroke: "#c9a227", strokeWidth: 2,
        rx: 4, ry: 4,
      });
    } else if (type === "circle") {
      shape = new fabric.Circle({
        left: cx - 60, top: cy - 60,
        radius: 60,
        fill: "transparent",
        stroke: "#c9a227", strokeWidth: 2,
      });
    } else if (type === "line") {
      shape = new fabric.Line([cx - 160, cy, cx + 160, cy], {
        stroke: "#c9a227", strokeWidth: 2,
        selectable: true,
      });
    } else if (type === "triangle") {
      shape = new fabric.Triangle({
        left: cx - 50, top: cy - 60,
        width: 100, height: 80,
        fill: "transparent",
        stroke: "#c9a227", strokeWidth: 2,
      });
    }
    if (shape) { canvas.add(shape); canvas.setActiveObject(shape); canvas.renderAll(); }
  };

  // ── Logo / image upload ─────────────────────────────────────
  const handleLogoUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      fabric.Image.fromURL(ev.target.result).then((img) => {
        const canvas = fabricRef.current;
        if (!canvas) return;
        const { w } = CANVAS_SIZES[canvasSize];
        // Scale logo to max 20% of canvas width
        const maxW = w * 0.2;
        if (img.width > maxW) img.scaleToWidth(maxW);
        img.set({ left: 40, top: 40, selectable: true, evented: true });
        canvas.add(img);
        canvas.setActiveObject(img);
        canvas.renderAll();
      });
    };
    reader.readAsDataURL(file);
    // Reset input so same file can be re-uploaded
    e.target.value = "";
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

    // Serialize canvas — preserve isNameZone and isQRZone custom properties
    // CRITICAL: Strip backgroundImage from JSON to avoid data URL bloat in localStorage.
    // The template URL is stored separately as cp_template_url and re-applied during generation.
    const cleanJSON = canvas.toJSON(["fieldKey", "fieldLabel", "isNameZone", "isQRZone"]);
    delete cleanJSON.backgroundImage;

    // Save QR zone position from the placed rect object
    const qrObj = canvas.getObjects().find(o => o.isQRZone);
    if (qrObj) {
      localStorage.setItem("cp_qr_zone", JSON.stringify({
        x: Math.round(qrObj.left),
        y: Math.round(qrObj.top),
        size: Math.round(qrObj.width * (qrObj.scaleX || 1)),
        enabled: true,
      }));
    } else {
      localStorage.removeItem("cp_qr_zone"); // No QR zone = use default
    }

    // Save to localStorage — wrap in try-catch to detect quota overflow
    try {
      const jsonStr = JSON.stringify(cleanJSON);
      if (jsonStr.length > 4 * 1024 * 1024) {
        return setError("Canvas data is too large (over 4MB). Try using a smaller template image or fewer objects.");
      }
      localStorage.setItem("cp_canvas_config", jsonStr);
      localStorage.setItem("cp_placeholders", JSON.stringify(uniquePlaceholders));
      localStorage.setItem("cp_canvas_size", canvasSize);
    } catch (e) {
      return setError("Failed to save canvas data. The template image may be too large. Try a smaller image.");
    }

    navigate("/recipients");
  };

  const size = CANVAS_SIZES[canvasSize];
  // Calculate how much to scale the canvas so it fits the visible area.
  // Available width = total screen - sidebar (300px) - padding (56px each side)
  const sidebarW = 300;
  const paddingW = 60;
  const availableW = window.innerWidth - sidebarW - paddingW;
  const availableH = window.innerHeight - 60 - 100; // navbar + hint bar
  const scaleW = availableW / size.w;
  const scaleH = availableH / size.h;
  const scale = Math.min(1, scaleW, scaleH);

  return (
    <div className="page-wrapper">
      <Navbar />
      <div className="cust-layout">

        {/* ── LEFT PANEL ── */}
        <aside className="cust-sidebar glass">
          <h2 className="cust-sidebar-title">🎨 Template Editor</h2>

          {/* Step progress */}
          <div className="step-bar-sidebar">
            {STEP_LABELS.map((label, i) => (
              <div key={i} className={`sbs-item ${i === 1 ? "active" : i < 1 ? "done" : ""}`}>
                <div className="sbs-circle">{i < 1 ? "\u2713" : i + 1}</div>
                {i < STEP_LABELS.length - 1 && <div className="sbs-line" />}
              </div>
            ))}
          </div>
          <div className="step-labels-row">
            {STEP_LABELS.map((label, i) => (
              <span key={i} className={`sbs-label ${i === 1 ? "active" : i < 1 ? "done" : ""}`}>
                {label}
              </span>
            ))}
          </div>

          {/* Canvas Size */}
          <div className="cust-section">
            <label className="input-label">Canvas Size</label>
            <div className="size-grid">
              {Object.entries(CANVAS_SIZES).map(([key, { label, desc }]) => (
                <button
                  key={key}
                  className={`size-btn ${canvasSize === key ? "active" : ""}`}
                  onClick={() => { setCanvasSize(key); setSelected(null); setTemplateLoaded(false); setNzPlaced(false); }}
                  title={desc}
                >
                  <span className="size-btn-label">{label}</span>
                  <span className="size-btn-desc">{desc}</span>
                </button>
              ))}
            </div>
            <p className="hint-text">&#9888; Changing size will reset fields</p>
          </div>

          {/* ── NAME ZONE ── */}
          <div className="cust-section name-zone-section">
            <label className="input-label" style={{ color: "var(--accent-gold, #f5c842)", display: "flex", alignItems: "center", gap: "6px" }}>
              <span>📍</span> Name Zone
            </label>
            <p className="cust-hint">
              Define where each recipient&apos;s name will appear. Actual names come from your CSV / recipients list — you don&apos;t type them here.
            </p>

            {/* Pixel Coordinates */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginTop: "10px" }}>
              <div>
                <label className="input-label">X (px)</label>
                <input
                  type="number" className="input-field" value={nzX} min={0}
                  onChange={e => { const v = Number(e.target.value); setNzX(v); updateNameZone({ left: v }); }}
                />
              </div>
              <div>
                <label className="input-label">Y (px)</label>
                <input
                  type="number" className="input-field" value={nzY} min={0}
                  onChange={e => { const v = Number(e.target.value); setNzY(v); updateNameZone({ top: v }); }}
                />
              </div>
            </div>

            {/* Font + Size */}
            <div className="toolbar-row" style={{ marginTop: "10px" }}>
              <select
                className="input-field toolbar-select"
                value={nzFont}
                onChange={e => { setNzFont(e.target.value); updateNameZone({ fontFamily: e.target.value }); }}
                style={{ fontFamily: nzFont }}
              >
                {FONT_GROUPS.map(group => (
                  <optgroup key={group.label} label={group.label}>
                    {group.fonts.map(f => (
                      <option key={f} value={f} style={{ fontFamily: f }}>{f}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
              <input
                type="number" className="input-field toolbar-size"
                value={nzSize} min={8} max={200}
                onChange={e => { const v = Number(e.target.value); setNzSize(v); updateNameZone({ fontSize: v }); }}
              />
            </div>

            {/* Bold / Italic / Color / Align */}
            <div className="toolbar-row" style={{ marginTop: "8px" }}>
              <button className={`tool-btn ${nzBold ? "active" : ""}`}
                onClick={() => { const v = !nzBold; setNzBold(v); updateNameZone({ fontWeight: v ? "bold" : "normal" }); }}>
                <b>B</b>
              </button>
              <button className={`tool-btn ${nzItalic ? "active" : ""}`}
                onClick={() => { const v = !nzItalic; setNzItalic(v); updateNameZone({ fontStyle: v ? "italic" : "normal" }); }}>
                <i>I</i>
              </button>
              <div className="color-wrap">
                <label className="input-label" style={{ margin: 0, fontSize: "0.72rem" }}>Color</label>
                <input type="color" className="color-input" value={nzColor}
                  onChange={e => { setNzColor(e.target.value); updateNameZone({ fill: e.target.value }); }} />
              </div>
              <select className="input-field" style={{ flex: 1, fontSize: "0.75rem" }} value={nzAlign}
                onChange={e => { setNzAlign(e.target.value); updateNameZone({ textAlign: e.target.value }); }}>
                <option value="center">Center</option>
                <option value="left">Left</option>
                <option value="right">Right</option>
              </select>
            </div>

            <button
              className="btn-primary"
              onClick={placeNameZone}
              style={{ marginTop: "12px", width: "100%", background: nzPlaced ? "rgba(245,200,66,0.15)" : undefined, color: nzPlaced ? "#f5c842" : undefined, border: nzPlaced ? "1px solid #f5c842" : undefined }}
            >
              {nzPlaced ? "🔄 Update Name Zone" : "📍 Place Name Zone on Canvas"}
            </button>
            {nzPlaced && (
              <p className="hint-text" style={{ color: "#f5c842", marginTop: "6px" }}>
                ✓ Placed — drag it on the canvas to reposition
              </p>
            )}
          </div>

          {/* ── Other Placeholder Fields ── */}
          <div className="cust-section">
            <label className="input-label">Other Dynamic Fields</label>
            <p className="cust-hint">These are also filled from your CSV columns</p>
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

          {/* Style Toolbar */}
          {selected && (
            <div className="cust-section cust-toolbar animate-fade">
              <label className="input-label">Selected Field Style</label>

              <div className="toolbar-row">
                {/* Grouped font selector */}
                <select
                  className="input-field toolbar-select"
                  value={fontFamily}
                  onChange={e => handleFontFamily(e.target.value)}
                  style={{ fontFamily }}
                >
                  {FONT_GROUPS.map(group => (
                    <optgroup key={group.label} label={group.label}>
                      {group.fonts.map(f => (
                        <option key={f} value={f} style={{ fontFamily: f }}>{f}</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
                <input
                  type="number"
                  className="input-field toolbar-size"
                  value={fontSize}
                  min={8} max={200}
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

          {error && <div className="cust-error">&#9888; {error}</div>}

          {/* ── Background Tools (only useful for Build From Scratch) ── */}
          {!localStorage.getItem("cp_template_url") && (
            <div className="cust-section">
              <label className="input-label">Background</label>
              <div className="toolbar-row" style={{ gap: "8px", alignItems: "center" }}>
                <input
                  type="color"
                  value={bgColor}
                  onChange={e => handleBgColor(e.target.value)}
                  className="color-input"
                  title="Background color"
                />
                <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Solid color</span>
              </div>
              <div className="gradient-grid">
                {GRADIENT_PRESETS.map((g, i) => (
                  <button
                    key={i}
                    className="gradient-btn"
                    onClick={() => applyGradient(g.stops)}
                    style={{
                      background: `linear-gradient(135deg, ${g.stops[0].color}, ${g.stops[1].color})`,
                    }}
                    title={g.label}
                  >
                    <span>{g.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── Shape Tools ── */}
          <div className="cust-section">
            <label className="input-label">Add Shapes</label>
            <div className="shape-grid">
              {[
                { type: "rect", label: "Rectangle", icon: "&#9645;" },
                { type: "circle", label: "Circle", icon: "&#9711;" },
                { type: "line", label: "Line", icon: "&#8212;" },
                { type: "triangle", label: "Triangle", icon: "&#9651;" },
              ].map(s => (
                <button
                  key={s.type}
                  className="shape-btn"
                  onClick={() => addShape(s.type)}
                  title={s.label}
                >
                  <span dangerouslySetInnerHTML={{ __html: s.icon }} />
                  <span>{s.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* ── Logo / Image Upload ── */}
          <div className="cust-section">
            <label className="input-label">Upload Logo / Image</label>
            <button
              className="logo-upload-btn"
              onClick={() => logoInputRef.current?.click()}
              title="Upload logo or image onto certificate"
            >
              &#128247; Add Logo / Seal
            </button>
            <input
              ref={logoInputRef}
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={handleLogoUpload}
            />
            <p className="hint-text">PNG, SVG, JPG &middot; auto-scaled to 20% width</p>
          </div>

          {/* ── QR Zone Panel ── */}
          <div className="cust-section" style={{ background: "rgba(108,99,255,0.03)", borderRadius: "var(--radius-md)", padding: "14px 10px", border: "1px solid rgba(108,99,255,0.15)" }}>
            <label className="input-label" style={{ color: "#a09fff", display: "flex", alignItems: "center", gap: "6px" }}>
              <span>⬛</span> QR Code Zone
            </label>
            <p className="cust-hint">Define where the QR verification code appears. Leave unplaced to use default (bottom-right).</p>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px", marginTop: "10px" }}>
              <div>
                <label className="input-label">X (px)</label>
                <input type="number" className="input-field" value={qzX} min={0}
                  onChange={e => { const v = Number(e.target.value); setQzX(v); updateQRZone({ left: v }); }} />
              </div>
              <div>
                <label className="input-label">Y (px)</label>
                <input type="number" className="input-field" value={qzY} min={0}
                  onChange={e => { const v = Number(e.target.value); setQzY(v); updateQRZone({ top: v }); }} />
              </div>
              <div>
                <label className="input-label">Size (px)</label>
                <input type="number" className="input-field" value={qzSize} min={40} max={300}
                  onChange={e => { const v = Number(e.target.value); setQzSize(v); updateQRZone({ width: v, height: v }); }} />
              </div>
            </div>

            <button
              className="btn-primary"
              onClick={placeQRZone}
              style={{ marginTop: "12px", width: "100%", background: qzPlaced ? "rgba(108,99,255,0.15)" : undefined, color: qzPlaced ? "#a09fff" : undefined, border: qzPlaced ? "1px solid #6c63ff" : undefined }}
            >
              {qzPlaced ? "🔄 Update QR Zone" : "⬛ Place QR Zone on Canvas"}
            </button>
            {qzPlaced && (
              <p className="hint-text" style={{ color: "#a09fff", marginTop: "6px" }}>
                ✓ Placed — drag it on the canvas to reposition
              </p>
            )}
          </div>

          <button className="btn-primary cust-save-btn" onClick={handleSaveAndContinue}>
            Save &amp; Add Recipients &#8594;
          </button>
        </aside>

        {/* RIGHT: Canvas Area */}
        <main className="cust-canvas-area">
          {!templateLoaded && (
            <div className="canvas-loading">Loading template...</div>
          )}

          {/* 
            Two-div approach:
            - Outer div: sets the LAYOUT size to the scaled dimensions
              so surrounding elements know the real visual size
            - Inner div: does the CSS transform scale (visual only)
            Without the outer div, transform:scale doesn't affect layout
            and the full 842px canvas would overflow, clipping the left side.
          */}
          <div style={{
            width: Math.round(size.w * scale),
            height: Math.round(size.h * scale),
            flexShrink: 0,
          }}>
            <div
              className="canvas-scaler"
              style={{
                transform: `scale(${scale})`,
                transformOrigin: "top left",
                width: size.w,
                height: size.h,
              }}
            >
              <canvas ref={canvasRef} />
            </div>
          </div>

          <p className="canvas-hint">
            Drag fields to position them &middot; Double-click to edit text &middot; Select to change style
          </p>
        </main>
      </div>
    </div>
  );
}
