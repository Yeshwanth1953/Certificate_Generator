// src/templates/defaultTemplates.js
// ─────────────────────────────────────────────────────────────────────────────
// Six professional certificate templates drawn entirely with the Canvas 2D API.
// No external images — they generate instantly in the browser.
// Each template returns a base64 PNG data URL (same as the file-upload path).
// ─────────────────────────────────────────────────────────────────────────────

const W = 842;
const H = 595;

function makeCanvas() {
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  return c;
}

function roundRect(ctx, x, y, w, h, r = 0) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

// ── Template 1 : Classic Gold ───────────────────────────────────────────────
function classicGold() {
  const canvas = makeCanvas();
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "#fffef8";
  ctx.fillRect(0, 0, W, H);

  // Outer border
  ctx.strokeStyle = "#c9a227";
  ctx.lineWidth = 3;
  roundRect(ctx, 16, 16, W - 32, H - 32, 4);
  ctx.stroke();

  // Inner border
  ctx.lineWidth = 1.2;
  roundRect(ctx, 28, 28, W - 56, H - 56, 2);
  ctx.stroke();

  // Decorative top / bottom lines
  [80, H - 80].forEach((y) => {
    ctx.beginPath();
    ctx.moveTo(60, y);
    ctx.lineTo(W - 60, y);
    ctx.stroke();
  });

  // Corner diamonds
  [[60, 60],[W - 60, 60],[60, H - 60],[W - 60, H - 60]].forEach(([cx, cy]) => {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(Math.PI / 4);
    ctx.fillStyle = "#c9a227";
    ctx.fillRect(-6, -6, 12, 12);
    ctx.restore();
  });

  // Title
  ctx.fillStyle = "#8b6914";
  ctx.font = "bold 52px Georgia, serif";
  ctx.textAlign = "center";
  ctx.fillText("CERTIFICATE", W / 2, 148);

  ctx.fillStyle = "#b8860b";
  ctx.font = "16px Georgia, serif";
  ctx.letterSpacing = "0.4em";
  ctx.fillText("OF ACHIEVEMENT", W / 2, 184);
  ctx.letterSpacing = "0";

  // Sub-divider
  ctx.strokeStyle = "#c9a227";
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(W / 2 - 110, 202);
  ctx.lineTo(W / 2 + 110, 202);
  ctx.stroke();

  ctx.fillStyle = "#5a4a1a";
  ctx.font = "15px Georgia, serif";
  ctx.fillText("This is to certify that", W / 2, 258);

  // Name line
  ctx.strokeStyle = "#b8860b";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(W / 2 - 180, 338);
  ctx.lineTo(W / 2 + 180, 338);
  ctx.stroke();

  ctx.fillStyle = "#5a4a1a";
  ctx.font = "14px Georgia, serif";
  ctx.fillText("has successfully completed", W / 2, 368);

  // Course line (dashed)
  ctx.setLineDash([4, 5]);
  ctx.strokeStyle = "#c9a227";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(W / 2 - 200, 420);
  ctx.lineTo(W / 2 + 200, 420);
  ctx.stroke();
  ctx.setLineDash([]);

  // Signature lines
  [[140, 290], [W - 290, W - 140]].forEach(([x1, x2]) => {
    ctx.strokeStyle = "#9a7a1c";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x1, H - 95);
    ctx.lineTo(x2, H - 95);
    ctx.stroke();
  });
  ctx.fillStyle = "#8a7040";
  ctx.font = "11px Georgia, serif";
  ctx.fillText("Authorized Signature", 215, H - 78);
  ctx.fillText("Date", W - 215, H - 78);

  return canvas.toDataURL("image/png");
}

// ── Template 2 : Modern Minimal ─────────────────────────────────────────────
function modernMinimal() {
  const canvas = makeCanvas();
  const ctx = canvas.getContext("2d");

  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, "#ffffff");
  bg.addColorStop(1, "#f8f9fa");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // Top + bottom dark strips
  ctx.fillStyle = "#2d3748";
  ctx.fillRect(0, 0, W, 8);
  ctx.fillRect(0, H - 8, W, 8);

  // Gold accent lines
  ctx.fillStyle = "#f6c90e";
  ctx.fillRect(0, 8, W, 3);
  ctx.fillRect(0, H - 11, W, 3);

  // Left gold bar
  ctx.fillStyle = "#f6c90e";
  ctx.fillRect(40, 40, 4, H - 80);

  // Title
  ctx.fillStyle = "#1a202c";
  ctx.font = "700 62px Arial, sans-serif";
  ctx.textAlign = "left";
  ctx.fillText("CERTIFICATE", 76, 138);

  ctx.fillStyle = "#f6c90e";
  ctx.fillRect(76, 152, 290, 3);

  ctx.fillStyle = "#718096";
  ctx.font = "400 15px Arial, sans-serif";
  ctx.fillText("OF COMPLETION", 76, 185);

  ctx.fillStyle = "#4a5568";
  ctx.font = "14px Arial, sans-serif";
  ctx.fillText("This certifies that", 76, 255);

  // Name line
  ctx.strokeStyle = "#2d3748";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(76, 325);
  ctx.lineTo(450, 325);
  ctx.stroke();

  ctx.fillStyle = "#718096";
  ctx.font = "13px Arial, sans-serif";
  ctx.fillText("has successfully completed the program", 76, 364);

  // Course dashed line
  ctx.setLineDash([3, 5]);
  ctx.strokeStyle = "#e2e8f0";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(76, 425);
  ctx.lineTo(450, 425);
  ctx.stroke();
  ctx.setLineDash([]);

  // Right badge circle
  ctx.beginPath();
  ctx.arc(W - 125, 155, 80, 0, Math.PI * 2);
  ctx.fillStyle = "#f7fafc";
  ctx.fill();
  ctx.strokeStyle = "#e2e8f0";
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.fillStyle = "#f6c90e";
  ctx.font = "72px serif";
  ctx.textAlign = "center";
  ctx.fillText("★", W - 125, 185);

  // Sig lines
  ctx.strokeStyle = "#cbd5e0";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(76, H - 55);
  ctx.lineTo(220, H - 55);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(W - 260, H - 55);
  ctx.lineTo(W - 60, H - 55);
  ctx.stroke();

  ctx.fillStyle = "#a0aec0";
  ctx.font = "11px Arial, sans-serif";
  ctx.textAlign = "left";
  ctx.fillText("Signature", 76, H - 40);
  ctx.textAlign = "right";
  ctx.fillText("Date", W - 60, H - 40);

  return canvas.toDataURL("image/png");
}

// ── Template 3 : Academic Blue ──────────────────────────────────────────────
function academicBlue() {
  const canvas = makeCanvas();
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, W, H);

  // Navy header
  ctx.fillStyle = "#1a237e";
  ctx.fillRect(0, 0, W, 128);

  // Gold accent under header
  ctx.fillStyle = "#ffd700";
  ctx.fillRect(0, 125, W, 5);

  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 44px Georgia, serif";
  ctx.textAlign = "center";
  ctx.fillText("CERTIFICATE", W / 2, 74);

  ctx.fillStyle = "#ffd700";
  ctx.font = "15px Georgia, serif";
  ctx.letterSpacing = "0.35em";
  ctx.fillText("OF EXCELLENCE", W / 2, 108);
  ctx.letterSpacing = "0";

  // Side bars
  ctx.fillStyle = "#e8eaf6";
  ctx.fillRect(0, 133, 38, H - 133);
  ctx.fillRect(W - 38, 133, 38, H - 133);
  ctx.fillStyle = "#1a237e";
  ctx.fillRect(38, 133, 3, H - 133);
  ctx.fillRect(W - 41, 133, 3, H - 133);

  ctx.fillStyle = "#37474f";
  ctx.font = "15px Georgia, serif";
  ctx.textAlign = "center";
  ctx.fillText("This is to proudly certify that", W / 2, 192);

  ctx.strokeStyle = "#1a237e";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(W / 2 - 200, 262);
  ctx.lineTo(W / 2 + 200, 262);
  ctx.stroke();

  ctx.fillStyle = "#546e7a";
  ctx.font = "14px Georgia, serif";
  ctx.fillText("has demonstrated excellence in", W / 2, 298);

  ctx.setLineDash([5, 4]);
  ctx.strokeStyle = "#ffd700";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(W / 2 - 220, 360);
  ctx.lineTo(W / 2 + 220, 360);
  ctx.stroke();
  ctx.setLineDash([]);

  // Official seal
  ctx.beginPath();
  ctx.arc(W - 125, H - 115, 50, 0, Math.PI * 2);
  ctx.fillStyle = "#ffd700";
  ctx.fill();
  ctx.strokeStyle = "#1a237e";
  ctx.lineWidth = 2.5;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(W - 125, H - 115, 38, 0, Math.PI * 2);
  ctx.strokeStyle = "#1a237e";
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.fillStyle = "#1a237e";
  ctx.font = "bold 11px Georgia, serif";
  ctx.fillText("OFFICIAL", W - 125, H - 120);
  ctx.fillText("SEAL", W - 125, H - 105);

  // Sig lines
  ctx.strokeStyle = "#cfd8dc";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(80, H - 68);
  ctx.lineTo(260, H - 68);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(350, H - 68);
  ctx.lineTo(540, H - 68);
  ctx.stroke();
  ctx.fillStyle = "#78909c";
  ctx.font = "11px Georgia, serif";
  ctx.fillText("Director", 170, H - 50);
  ctx.fillText("Date", 445, H - 50);

  return canvas.toDataURL("image/png");
}

// ── Template 4 : Corporate Professional ─────────────────────────────────────
function corporatePro() {
  const canvas = makeCanvas();
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, W, H);

  // Left sidebar
  ctx.fillStyle = "#263238";
  ctx.fillRect(0, 0, 95, H);
  ctx.fillStyle = "#f9a825";
  ctx.fillRect(92, 35, 4, H - 70);

  // Sidebar rotated text
  ctx.save();
  ctx.translate(48, H / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillStyle = "#ffffff";
  ctx.font = "700 10px Arial, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("CERTIFYPRO  ·  VERIFIED CERTIFICATE", 0, 4);
  ctx.restore();

  // Logo placeholder
  roundRect(ctx, W - 215, 28, 178, 75, 6);
  ctx.fillStyle = "#f5f5f5";
  ctx.fill();
  ctx.strokeStyle = "#e0e0e0";
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.fillStyle = "#bdbdbd";
  ctx.font = "11px Arial, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("COMPANY LOGO", W - 126, 72);

  // Title
  ctx.fillStyle = "#263238";
  ctx.font = "700 50px Arial, sans-serif";
  ctx.textAlign = "left";
  ctx.fillText("Certificate", 122, 130);

  ctx.fillStyle = "#f9a825";
  ctx.font = "600 21px Arial, sans-serif";
  ctx.fillText("of Completion", 124, 160);

  ctx.fillStyle = "#f9a825";
  ctx.fillRect(122, 174, 240, 3);

  ctx.fillStyle = "#546e7a";
  ctx.font = "400 13px Arial, sans-serif";
  ctx.fillText("This certificate is awarded to", 122, 222);

  ctx.strokeStyle = "#263238";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(122, 302);
  ctx.lineTo(570, 302);
  ctx.stroke();

  ctx.fillStyle = "#78909c";
  ctx.font = "400 13px Arial, sans-serif";
  ctx.fillText("for successful completion of", 122, 338);

  ctx.setLineDash([3, 4]);
  ctx.strokeStyle = "#eceff1";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(122, 398);
  ctx.lineTo(590, 398);
  ctx.stroke();
  ctx.setLineDash([]);

  // Pre-sig divider
  ctx.strokeStyle = "#e0e0e0";
  ctx.lineWidth = 1;
  ctx.setLineDash([3, 4]);
  ctx.beginPath();
  ctx.moveTo(122, H - 98);
  ctx.lineTo(W - 25, H - 98);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.strokeStyle = "#cfd8dc";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(122, H - 62);
  ctx.lineTo(295, H - 62);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(375, H - 62);
  ctx.lineTo(560, H - 62);
  ctx.stroke();

  ctx.fillStyle = "#90a4ae";
  ctx.font = "11px Arial, sans-serif";
  ctx.fillText("Director of Operations", 122, H - 46);
  ctx.fillText("Issue Date", 375, H - 46);

  return canvas.toDataURL("image/png");
}

// ── Template 5 : Elegant Script ─────────────────────────────────────────────
function elegantScript() {
  const canvas = makeCanvas();
  const ctx = canvas.getContext("2d");

  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, "#fdf8f0");
  bg.addColorStop(0.5, "#fff9f0");
  bg.addColorStop(1, "#fdf0e8");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // Dotted outer border
  ctx.setLineDash([4, 6]);
  ctx.strokeStyle = "#c9956c";
  ctx.lineWidth = 1;
  roundRect(ctx, 18, 18, W - 36, H - 36, 4);
  ctx.stroke();
  ctx.setLineDash([]);

  // Corner ornaments
  const corners = [[38, 38, 1, 1],[W - 38, 38, -1, 1],[38, H - 38, 1, -1],[W - 38, H - 38, -1, -1]];
  corners.forEach(([ox, oy, sx, sy]) => {
    ctx.save();
    ctx.translate(ox, oy);
    ctx.scale(sx, sy);
    ctx.strokeStyle = "#c9956c";
    ctx.lineWidth = 1.5;
    [[0, 65, 0, 0, 65, 0],[0, 85, 20, 8],[0, 42, 42, 0]].forEach(([x1, y1, cpx1, cpy1, x2, y2]) => {
      if (x2 !== undefined) {
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.quadraticCurveTo(cpx1 || 0, cpy1 || 0, x2 || 0, y2 || 0);
        ctx.stroke();
      }
    });
    ctx.beginPath();
    ctx.moveTo(0, 65);
    ctx.quadraticCurveTo(0, 0, 65, 0);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, 88);
    ctx.quadraticCurveTo(0, 22, 22, 10);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, 42);
    ctx.quadraticCurveTo(20, 0, 42, 0);
    ctx.stroke();
    ctx.fillStyle = "#c9956c";
    ctx.beginPath();
    ctx.arc(14, 14, 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  });

  ctx.fillStyle = "#c9956c";
  ctx.font = "22px Georgia, serif";
  ctx.textAlign = "center";
  ctx.fillText("✦  ✦  ✦", W / 2, 82);

  ctx.fillStyle = "#6d4c41";
  ctx.font = "italic bold 52px Georgia, serif";
  ctx.fillText("Certificate", W / 2, 158);

  ctx.fillStyle = "#8d6e63";
  ctx.font = "15px Georgia, serif";
  ctx.letterSpacing = "0.32em";
  ctx.fillText("OF APPRECIATION", W / 2, 194);
  ctx.letterSpacing = "0";

  // Flanked divider
  ctx.strokeStyle = "#c9956c";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(W / 2 - 160, 212);
  ctx.lineTo(W / 2 - 22, 212);
  ctx.moveTo(W / 2 + 22, 212);
  ctx.lineTo(W / 2 + 160, 212);
  ctx.stroke();
  ctx.fillStyle = "#c9956c";
  ctx.font = "14px Georgia, serif";
  ctx.fillText("✦", W / 2, 216);

  ctx.fillStyle = "#795548";
  ctx.font = "italic 15px Georgia, serif";
  ctx.fillText("This certificate is proudly presented to", W / 2, 268);

  ctx.strokeStyle = "#c9956c";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(W / 2 - 200, 348);
  ctx.lineTo(W / 2 + 200, 348);
  ctx.stroke();

  ctx.fillStyle = "#8d6e63";
  ctx.font = "italic 14px Georgia, serif";
  ctx.fillText("in recognition of outstanding dedication and effort", W / 2, 388);

  ctx.setLineDash([3, 5]);
  ctx.strokeStyle = "#d7b295";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(W / 2 - 185, 445);
  ctx.lineTo(W / 2 + 185, 445);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.fillStyle = "#c9956c";
  ctx.font = "16px Georgia, serif";
  ctx.fillText("✦  ✦  ✦", W / 2, H - 36);

  ctx.strokeStyle = "#c9956c";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(125, H - 82);
  ctx.lineTo(288, H - 82);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(W - 288, H - 82);
  ctx.lineTo(W - 125, H - 82);
  ctx.stroke();
  ctx.fillStyle = "#a1887f";
  ctx.font = "italic 11px Georgia, serif";
  ctx.fillText("Signature", 206, H - 64);
  ctx.fillText("Date", W - 206, H - 64);

  return canvas.toDataURL("image/png");
}

// ── Template 6 : Achievement Award (Dark Premium) ───────────────────────────
function achievementAward() {
  const canvas = makeCanvas();
  const ctx = canvas.getContext("2d");

  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, "#0d0d1f");
  bg.addColorStop(0.5, "#12122e");
  bg.addColorStop(1, "#0d0d1f");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // Center glow
  const glow = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, 340);
  glow.addColorStop(0, "rgba(255,215,0,0.07)");
  glow.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  // Borders
  ctx.strokeStyle = "#ffd700";
  ctx.lineWidth = 2;
  roundRect(ctx, 14, 14, W - 28, H - 28, 4);
  ctx.stroke();
  ctx.strokeStyle = "rgba(255,215,0,0.3)";
  ctx.lineWidth = 1;
  roundRect(ctx, 24, 24, W - 48, H - 48, 2);
  ctx.stroke();

  // Crown stars
  ctx.fillStyle = "#ffd700";
  ctx.font = "42px serif";
  ctx.textAlign = "center";
  ctx.fillText("★", W / 2, 86);
  ctx.font = "24px serif";
  ctx.fillText("★", W / 2 - 62, 80);
  ctx.fillText("★", W / 2 + 62, 80);
  ctx.font = "14px serif";
  ctx.fillText("★", W / 2 - 97, 76);
  ctx.fillText("★", W / 2 + 97, 76);

  // Separator
  ctx.fillStyle = "rgba(255,215,0,0.18)";
  ctx.fillRect(38, 92, W - 76, 1.5);

  // Title gradient
  const tg = ctx.createLinearGradient(W / 2 - 200, 0, W / 2 + 200, 0);
  tg.addColorStop(0, "#c9a227");
  tg.addColorStop(0.5, "#ffd700");
  tg.addColorStop(1, "#c9a227");
  ctx.fillStyle = tg;
  ctx.font = "bold 54px Georgia, serif";
  ctx.fillText("CERTIFICATE", W / 2, 168);

  ctx.fillStyle = "#ffd700";
  ctx.font = "17px Georgia, serif";
  ctx.letterSpacing = "0.4em";
  ctx.fillText("OF ACHIEVEMENT", W / 2, 206);
  ctx.letterSpacing = "0";

  ctx.fillStyle = "rgba(255,215,0,0.45)";
  ctx.fillRect(W / 2 - 115, 222, 230, 1);

  ctx.fillStyle = "#b8960c";
  ctx.font = "14px Georgia, serif";
  ctx.fillText("This award is proudly presented to", W / 2, 278);

  ctx.strokeStyle = "rgba(255,215,0,0.6)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(W / 2 - 190, 358);
  ctx.lineTo(W / 2 + 190, 358);
  ctx.stroke();

  ctx.fillStyle = "#9a8040";
  ctx.font = "14px Georgia, serif";
  ctx.fillText("for exceptional performance and achievement in", W / 2, 396);

  ctx.setLineDash([4, 6]);
  ctx.strokeStyle = "rgba(255,215,0,0.25)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(W / 2 - 200, 452);
  ctx.lineTo(W / 2 + 200, 452);
  ctx.stroke();
  ctx.setLineDash([]);

  // Bottom seal
  ctx.beginPath();
  ctx.arc(W / 2, H - 75, 34, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(255,215,0,0.1)";
  ctx.fill();
  ctx.strokeStyle = "#ffd700";
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.fillStyle = "#ffd700";
  ctx.font = "30px serif";
  ctx.fillText("★", W / 2, H - 62);

  ctx.strokeStyle = "rgba(255,215,0,0.3)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(105, H - 30);
  ctx.lineTo(260, H - 30);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(W - 260, H - 30);
  ctx.lineTo(W - 105, H - 30);
  ctx.stroke();
  ctx.fillStyle = "#8a7030";
  ctx.font = "11px Georgia, serif";
  ctx.fillText("Authorized Signature", 182, H - 14);
  ctx.fillText("Date of Issue", W - 182, H - 14);

  return canvas.toDataURL("image/png");
}

// ── Exported template registry ───────────────────────────────────────────────
export const DEFAULT_TEMPLATES = [
  {
    id:          "classic-gold",
    name:        "Classic Gold",
    category:    "Traditional",
    description: "Timeless gold border with elegant classical layout",
    bgHint:      "#fffef8",
    generate:    classicGold,
  },
  {
    id:          "modern-minimal",
    name:        "Modern Minimal",
    category:    "Modern",
    description: "Clean, contemporary design with bold gold accents",
    bgHint:      "#f8f9fa",
    generate:    modernMinimal,
  },
  {
    id:          "academic-blue",
    name:        "Academic Blue",
    category:    "Academic",
    description: "Navy blue header with official seal — diploma style",
    bgHint:      "#ffffff",
    generate:    academicBlue,
  },
  {
    id:          "corporate-pro",
    name:        "Corporate Pro",
    category:    "Corporate",
    description: "Professional sidebar layout with amber accents",
    bgHint:      "#ffffff",
    generate:    corporatePro,
  },
  {
    id:          "elegant-script",
    name:        "Elegant Script",
    category:    "Decorative",
    description: "Warm cream with ornate corner flourishes",
    bgHint:      "#fdf8f0",
    generate:    elegantScript,
  },
  {
    id:          "achievement-award",
    name:        "Achievement Award",
    category:    "Premium Dark",
    description: "Dark premium design with gold star elements",
    bgHint:      "#0d0d1f",
    generate:    achievementAward,
  },
];
