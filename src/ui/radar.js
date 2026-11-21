// src/ui/radar.js
import { MAPS, RACE_NAMES } from "../config.js";

const ROLE_SHAPE = { SER: "triangle", DEF: "square", SUP: "diamond" };

export function createRadar({ canvas, world, onSelectCharacter }) {
  const ctx = canvas.getContext("2d");
  let dpr = window.devicePixelRatio || 1;
  let hoveredId = null;

  // Kamera: zoom & pan (koordinat dalam unit 0-100)
  const cam = { zoom: 1, x: 50, y: 50 }; // x,y = pusat kamera
  let dragging = false;
  let dragStart = { x: 0, y: 0, camX: 50, camY: 50 };

  function resize() {
    const rect = canvas.parentElement.getBoundingClientRect();
    dpr = window.devicePixelRatio || 1;
    canvas.width = Math.floor(rect.width * dpr);
    canvas.height = Math.floor(rect.height * dpr);
    canvas.style.width = rect.width + "px";
    canvas.style.height = rect.height + "px";
  }
  window.addEventListener("resize", resize);
  resize();

  // Konversi koordinat dunia (0-100) ke layar (piksel canvas, sudah *dpr)
  function w2s(x, y) {
    const w = canvas.width / dpr;
    const h = canvas.height / dpr;
    const viewW = 100 / cam.zoom;
    const viewH = 100 / cam.zoom;
    const minX = cam.x - viewW / 2;
    const minY = cam.y - viewH / 2;
    return {
      x: ((x - minX) / viewW) * w * dpr,
      y: ((y - minY) / viewH) * h * dpr,
    };
  }

  function s2w(sx, sy) {
    const w = canvas.width / dpr;
    const h = canvas.height / dpr;
    const viewW = 100 / cam.zoom;
    const viewH = 100 / cam.zoom;
    const minX = cam.x - viewW / 2;
    const minY = cam.y - viewH / 2;
    return {
      x: minX + (sx / (w * dpr)) * viewW,
      y: minY + (sy / (h * dpr)) * viewH,
    };
  }

  function drawGrid() {
    const w = canvas.width, h = canvas.height;
    ctx.strokeStyle = "#0f1a2b";
    ctx.lineWidth = 1;
    for (let x = 0; x <= 100; x += 10) {
      const p1 = w2s(x, 0);
      const p2 = w2s(x, 100);
      ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.stroke();
    }
    for (let y = 0; y <= 100; y += 10) {
      const p1 = w2s(0, y);
      const p2 = w2s(100, y);
      ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.stroke();
    }
  }

  function drawMonster(m) {
    const p = w2s(m.pos.x, m.pos.y);
    let color = "#64748b";
    if (m.ring === 3) color = "#f97316";
    else if (m.ring === 4) color = "#ef4444";
    else if (m.ring === 0) color = m.level >= 45 ? "#ef4444" : "#f97316";
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 3 * dpr, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawCharacter(c) {
    const p = w2s(c.pos.x, c.pos.y);
    const color = RACE_NAMES[c.race].color;
    const size = 7 * dpr;
    const shape = ROLE_SHAPE[c.role] || "circle";

    // Lingkaran hover
    if (c.id === hoveredId) {
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2 * dpr;
      ctx.beginPath();
      ctx.arc(p.x, p.y, size + 4 * dpr, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.fillStyle = color;
    ctx.strokeStyle = "#050911";
    ctx.lineWidth = 1.5 * dpr;
    ctx.beginPath();
    if (shape === "triangle") {
      ctx.moveTo(p.x, p.y - size);
      ctx.lineTo(p.x - size, p.y + size);
      ctx.lineTo(p.x + size, p.y + size);
      ctx.closePath();
    } else if (shape === "square") {
      ctx.rect(p.x - size, p.y - size, size * 2, size * 2);
    } else if (shape === "diamond") {
      ctx.moveTo(p.x, p.y - size);
      ctx.lineTo(p.x + size, p.y);
      ctx.lineTo(p.x, p.y + size);
      ctx.lineTo(p.x - size, p.y);
      ctx.closePath();
    } else {
      ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
    }
    ctx.fill();
    ctx.stroke();

    // HP bar
    if (c.hp < c.hpMax) {
      const ratio = Math.max(0, c.hp / c.hpMax);
      const barW = 16 * dpr;
      ctx.fillStyle = "#1e293b";
      ctx.fillRect(p.x - barW / 2, p.y - size - 8 * dpr, barW, 2 * dpr);
      ctx.fillStyle = ratio > 0.5 ? "#22c55e" : ratio > 0.25 ? "#f59e0b" : "#ef4444";
      ctx.fillRect(p.x - barW / 2, p.y - size - 8 * dpr, barW * ratio, 2 * dpr);
    }
  }

  function drawEffects() {
    // Efek disimpan di world.effects
    if (!Array.isArray(world.effects)) return;
    for (const e of world.effects) {
      if (e.map !== world.currentMap) continue;
      const p1 = w2s(e.x1, e.y1);
      const p2 = w2s(e.x2, e.y2);
      if (e.type === "beam") {
        ctx.strokeStyle = e.color || "#f97316";
        ctx.lineWidth = 2 * dpr;
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
      } else if (e.type === "float") {
        const p = w2s(e.x, e.y);
        ctx.fillStyle = e.color || "#fff";
        ctx.font = `${11 * dpr}px system-ui`;
        ctx.textAlign = "center";
        ctx.fillText(e.text, p.x, p.y - e.age * 15 * dpr);
      }
    }
  }

  function render() {
    const map = MAPS.find(m => m.id === world.currentMap);
    if (!map) return;
    ctx.fillStyle = "#050911";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    drawGrid();

    for (const m of world.monsters) {
      if (m.alive && m.map === map.id) drawMonster(m);
    }
    for (const c of world.characters) {
      if (c.hp > 0 && c.pos.map === map.id) drawCharacter(c);
    }
    drawEffects();
  }

  function findCharacterAt(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    const mx = (clientX - rect.left) * dpr;
    const my = (clientY - rect.top) * dpr;
    const map = MAPS.find(m => m.id === world.currentMap);
    if (!map) return null;
    let best = null, bestDist = 16 * dpr;
    for (const c of world.characters) {
      if (c.hp <= 0 || c.pos.map !== map.id) continue;
      const p = w2s(c.pos.x, c.pos.y);
      const d = Math.hypot(p.x - mx, p.y - my);
      if (d < bestDist) { bestDist = d; best = c; }
    }
    return best;
  }

  canvas.addEventListener("mousemove", (e) => {
    if (dragging) {
      const rect = canvas.getBoundingClientRect();
      const dx = (e.clientX - dragStart.x) / rect.width * (100 / cam.zoom);
      const dy = (e.clientY - dragStart.y) / rect.height * (100 / cam.zoom);
      cam.x = clamp(dragStart.camX - dx, 0, 100);
      cam.y = clamp(dragStart.camY - dy, 0, 100);
      canvas.style.cursor = "grabbing";
      return;
    }
    const c = findCharacterAt(e.clientX, e.clientY);
    hoveredId = c ? c.id : null;
    canvas.style.cursor = c ? "pointer" : "grab";
  });

  canvas.addEventListener("mousedown", (e) => {
    dragging = true;
    dragStart = { x: e.clientX, y: e.clientY, camX: cam.x, camY: cam.y };
  });

  window.addEventListener("mouseup", () => {
    dragging = false;
    canvas.style.cursor = "grab";
  });

  canvas.addEventListener("click", (e) => {
    if (dragging) return;
    const c = findCharacterAt(e.clientX, e.clientY);
    if (c) {
      world.selectedCharacterId = c.id;
      if (onSelectCharacter) onSelectCharacter(c);
      world.events.emit("character:selected", c);
    }
  });

  canvas.addEventListener("wheel", (e) => {
    e.preventDefault();
    const factor = e.deltaY > 0 ? 0.9 : 1.1;
    cam.zoom = clamp(cam.zoom * factor, 1, 4);
  }, { passive: false });

  function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

  return { render, resize, cam };
}