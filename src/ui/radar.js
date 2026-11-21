// src/ui/radar.js
import { MAPS, RACE_NAMES, HOME_RINGS } from "../config.js";

const ROLE_SHAPE = { SER: "triangle", DEF: "square", SUP: "diamond" };

export function createRadar({ canvas, world, onSelectCharacter, onSelectMonster }) {
  const ctx = canvas.getContext("2d");
  let dpr = window.devicePixelRatio || 1;
  let hoveredCharId = null;
  let hoveredMonsterId = null;

  const cam = { zoom: 1, x: 50, y: 50 };
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

  function drawZones(map) {
    // 1. Gambar Ring Monster (Hanya untuk Base)
    if (map.type === "base") {
      const anchor = map.anchor;
      for (const ring of HOME_RINGS) {
        const midRadius = (ring.min + ring.max) / 2;
        const p = w2s(anchor.x, anchor.y);
        const edge = w2s(anchor.x + midRadius, anchor.y);
        const radiusPx = Math.abs(edge.x - p.x);

        ctx.strokeStyle = ring.color + "40";
        ctx.lineWidth = 1.5 * dpr;
        ctx.beginPath();
        ctx.arc(p.x, p.y, radiusPx, 0, Math.PI * 2);
        ctx.stroke();

        // Label ring
        ctx.fillStyle = ring.color;
        ctx.font = `${10 * dpr}px system-ui`;
        ctx.textAlign = "left";
        ctx.fillText(ring.label, p.x + radiusPx * 0.7, p.y - radiusPx * 0.7);
      }
    }

    // 2. Gambar Safe Zones (Ether/Elan)
    if (map.safeZones && map.safeZones.length > 0) {
      for (const zone of map.safeZones) {
        const p = w2s(zone.x, zone.y);
        const edge = w2s(zone.x + zone.radius, zone.y);
        const radiusPx = Math.abs(edge.x - p.x);
        
        ctx.fillStyle = zone.race === "all" ? "#34d39920" : (RACE_NAMES[zone.race]?.color + "20" || "#ffffff20");
        ctx.beginPath();
        ctx.arc(p.x, p.y, radiusPx, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.strokeStyle = zone.race === "all" ? "#34d39960" : (RACE_NAMES[zone.race]?.color + "60" || "#ffffff60");
        ctx.stroke();
      }
    }
  }

  function drawMonster(m) {
    const p = w2s(m.pos.x, m.pos.y);
    let color = "#64748b";
    let shape = "circle";

    if (m.ring === 1) { color = "#94a3b8"; shape = "circle"; }
    else if (m.ring === 2) { color = "#22c55e"; shape = "triangle"; }
    else if (m.ring === 3) { color = "#f97316"; shape = "square"; }
    else if (m.ring === 4) { color = "#ef4444"; shape = "diamond"; }
    else if (m.ring === 0) { color = m.level >= 45 ? "#ef4444" : "#f97316"; shape = "star"; }

    const size = 4 * dpr;
    ctx.fillStyle = color;
    ctx.strokeStyle = m.id === hoveredMonsterId ? "#ffffff" : "transparent";
    ctx.lineWidth = 2 * dpr;

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
    } else if (shape === "star") {
      for (let i = 0; i < 5; i++) {
        const angle = (Math.PI * 2 * i) / 5 - Math.PI / 2;
        const x1 = p.x + Math.cos(angle) * size;
        const y1 = p.y + Math.sin(angle) * size;
        if (i === 0) ctx.moveTo(x1, y1); else ctx.lineTo(x1, y1);
        const angle2 = angle + Math.PI / 5;
        const x2 = p.x + Math.cos(angle2) * (size * 0.4);
        const y2 = p.y + Math.sin(angle2) * (size * 0.4);
        ctx.lineTo(x2, y2);
      }
      ctx.closePath();
    } else {
      ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
    }
    ctx.fill();
    if (m.id === hoveredMonsterId) ctx.stroke();
  }

    function drawCharacter(c) {
    const p = w2s(c.pos.x, c.pos.y);
    const color = RACE_NAMES[c.race].color;
    const size = 7 * dpr;
    const shape = ROLE_SHAPE[c.role] || "circle";

    // --- EFEK AURA PEJABAT & RELIC ---
    const council = world.races[c.race].council;
    
    // 1. Aura Archon (Emas Berdenyut)
    if (c.id === council.archon) {
      ctx.strokeStyle = "#facc15"; // Emas
      ctx.lineWidth = 3 * dpr;
      ctx.beginPath();
      ctx.arc(p.x, p.y, size + 6 * dpr + Math.sin(Date.now() / 200) * 2 * dpr, 0, Math.PI * 2);
      ctx.stroke();
    } 
    // 2. Aura Dewan Lainnya (Biru Muda)
    else if (
      c.id === council.warchon || 
      c.id === council.ser || 
      c.id === council.def || 
      c.id === council.support
    ) {
      ctx.strokeStyle = "#38bdf8"; // Biru Muda
      ctx.lineWidth = 2 * dpr;
      ctx.beginPath();
      ctx.arc(p.x, p.y, size + 4 * dpr, 0, Math.PI * 2);
      ctx.stroke();
    }

    // 3. Aura Relic (+1 s/d +7)
    if (c.relic && c.relic.owned) {
      let relicColor = "#facc15"; // Default Kuning (+0 - +3)
      if (c.relic.tier >= 4 && c.relic.tier <= 5) relicColor = "#a855f7"; // Ungu (+4 - +5)
      if (c.relic.tier >= 6) relicColor = "#ef4444"; // Merah Menyala (+6 - +7)

      ctx.strokeStyle = relicColor;
      ctx.lineWidth = 2 * dpr;
      ctx.beginPath();
      ctx.arc(p.x, p.y, size + 2 * dpr, 0, Math.PI * 2);
      ctx.stroke();

      // Tampilkan Level Relic
      if (c.relic.tier > 0) {
        ctx.fillStyle = relicColor;
        ctx.font = `bold ${10 * dpr}px system-ui`;
        ctx.textAlign = "center";
        ctx.fillText(`+${c.relic.tier}`, p.x, p.y - size - 14 * dpr);
      }
    }

    // --- HOVER EFFECT ---
    if (c.id === hoveredCharId) {
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 1.5 * dpr;
      ctx.beginPath();
      ctx.arc(p.x, p.y, size + 8 * dpr, 0, Math.PI * 2);
      ctx.stroke();
    }

    // --- GAMBAR BENTUK KARAKTER ---
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

    // --- HP BAR ---
    if (c.hp < c.hpMax) {
      const ratio = Math.max(0, c.hp / c.hpMax);
      const barW = 16 * dpr;
      ctx.fillStyle = "#1e293b";
      ctx.fillRect(p.x - barW / 2, p.y - size - 8 * dpr, barW, 2 * dpr);
      ctx.fillStyle = ratio > 0.5 ? "#22c55e" : ratio > 0.25 ? "#f59e0b" : "#ef4444";
      ctx.fillRect(p.x - barW / 2, p.y - size - 8 * dpr, barW * ratio, 2 * dpr);
    }

    // --- TEKS VETERAN ---
    if (c.vetRank > 0) {
      ctx.fillStyle = "#fbbf24";
      ctx.font = `bold ${10 * dpr}px system-ui`;
      ctx.textAlign = "center";
      ctx.fillText(`V${c.vetRank}`, p.x, p.y - size - 18 * dpr);
    }

        // --- INDIKATOR REGU ---
    if (c.squadId) {
      ctx.fillStyle = "#a855f7"; // Warna ungu
      ctx.font = `bold ${9 * dpr}px system-ui`;
      ctx.textAlign = "center";
      ctx.fillText("🔗", p.x + size, p.y - size); // Ikon rantai kecil di pojok kanan atas
    }
  }

    function drawStructures(map) {
    // 1. Gambar Area Markas (Lingkaran tebal transparan)
    if (map.type === "base" && map.anchor) {
      const p = w2s(map.anchor.x, map.anchor.y);
      const edge = w2s(map.anchor.x + 15, map.anchor.y); // Radius 15
      const radiusPx = Math.abs(edge.x - p.x);
      
      // Warna sesuai ras
      const raceColor = RACE_NAMES[map.race]?.color || "#ffffff";
      
      ctx.fillStyle = raceColor + "15"; // Transparan 15%
      ctx.beginPath();
      ctx.arc(p.x, p.y, radiusPx, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.strokeStyle = raceColor + "40";
      ctx.lineWidth = 2 * dpr;
      ctx.stroke();
    }

    // 2. Gambar Altar (Titik Respawn)
    if (map.altar) {
      const p = w2s(map.altar.x, map.altar.y);
      ctx.fillStyle = "#a855f7"; // Ungu
      ctx.beginPath();
      ctx.arc(p.x, p.y, 5 * dpr, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.font = `${9 * dpr}px system-ui`;
      ctx.fillText("Altar", p.x + 8 * dpr, p.y + 3 * dpr);
    }
    if (map.altars) {
      for (const a of map.altars) {
        const p = w2s(a.x, a.y);
        ctx.fillStyle = a.race === "all" ? "#a855f7" : (RACE_NAMES[a.race]?.color || "#fff");
        ctx.beginPath();
        ctx.arc(p.x, p.y, 4 * dpr, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // 3. Gambar Portal ke War (Titik Teleport)
    if (map.portal) {
      const p = w2s(map.portal.x, map.portal.y);
      ctx.fillStyle = "#facc15"; // Kuning
      ctx.beginPath();
      ctx.arc(p.x, p.y, 6 * dpr, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.font = `${9 * dpr}px system-ui`;
      ctx.fillText("Portal War", p.x + 8 * dpr, p.y + 3 * dpr);
    }
    if (map.portals) {
      for (const pObj of map.portals) {
        const p = w2s(pObj.x, pObj.y);
        ctx.fillStyle = "#facc15";
        ctx.beginPath();
        ctx.arc(p.x, p.y, 6 * dpr, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // 4. Gambar NPC (Kode lama dipertahankan)
    if (map.type === "base") {
      const pAnchor = w2s(map.anchor.x, map.anchor.y);
      ctx.fillStyle = "#34d399";
      ctx.beginPath();
      ctx.arc(pAnchor.x, pAnchor.y, 6 * dpr, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.font = `${10 * dpr}px system-ui`;
      ctx.fillText("NPC", pAnchor.x + 10 * dpr, pAnchor.y + 4 * dpr);

      const pPvp = w2s(map.npcPvp.x, map.npcPvp.y);
      ctx.fillStyle = "#f43f5e";
      ctx.beginPath();
      ctx.arc(pPvp.x, pPvp.y, 5 * dpr, 0, Math.PI * 2);
      ctx.fill();
    }
    if (map.id === "ether" || map.id === "elan_plateau") {
      const pNpc = w2s(map.npc.x, map.npc.y);
      ctx.fillStyle = "#facc15";
      ctx.beginPath();
      ctx.arc(pNpc.x, pNpc.y, 6 * dpr, 0, Math.PI * 2);
      ctx.fill();
    }

    // 5. Gambar Chip di Crag Mine
    if (map.id === "crag_mine") {
      const chipPositions = [
        { race: "axion", x: 22, y: 26, color: "#ef4444" },
        { race: "belvian", x: 78, y: 26, color: "#38bdf8" },
        { race: "cyra", x: 50, y: 80, color: "#a855f7" }
      ];
      for (const chip of chipPositions) {
        const p = w2s(chip.x, chip.y);
        const hp = world.war.chipHp[chip.race] || 0;
        ctx.fillStyle = hp > 0 ? chip.color : "#334155";
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
          const angle = (Math.PI / 3) * i;
          const x = p.x + Math.cos(angle) * 12 * dpr;
          const y = p.y + Math.sin(angle) * 12 * dpr;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = "#fff";
        ctx.lineWidth = 1.5 * dpr;
        ctx.stroke();
      }
    }
  }

  function drawEffects() {
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
    
    drawZones(map);
    drawStructures(map);

    ctx.strokeStyle = "#0f1a2b";
    ctx.lineWidth = 1;
    for (let x = 0; x <= 100; x += 10) {
      const p1 = w2s(x, 0), p2 = w2s(x, 100);
      ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.stroke();
    }
    for (let y = 0; y <= 100; y += 10) {
      const p1 = w2s(0, y), p2 = w2s(100, y);
      ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.stroke();
    }

    for (const m of world.monsters) {
      if (m.alive && m.map === map.id) drawMonster(m);
    }
    for (const c of world.characters) {
      if (c.hp > 0 && c.pos.map === map.id) drawCharacter(c);
    }
    drawEffects();
  }

  function findEntityAt(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    const mx = (clientX - rect.left) * dpr;
    const my = (clientY - rect.top) * dpr;
    const map = MAPS.find(m => m.id === world.currentMap);
    if (!map) return { type: null, entity: null };

    let bestChar = null, bestCharDist = 16 * dpr;
    for (const c of world.characters) {
      if (c.hp <= 0 || c.pos.map !== map.id) continue;
      const p = w2s(c.pos.x, c.pos.y);
      const d = Math.hypot(p.x - mx, p.y - my);
      if (d < bestCharDist) { bestCharDist = d; bestChar = c; }
    }
    if (bestChar) return { type: "char", entity: bestChar };

    let bestMob = null, bestMobDist = 12 * dpr;
    for (const m of world.monsters) {
      if (!m.alive || m.map !== map.id) continue;
      const p = w2s(m.pos.x, m.pos.y);
      const d = Math.hypot(p.x - mx, p.y - my);
      if (d < bestMobDist) { bestMobDist = d; bestMob = m; }
    }
    return { type: bestMob ? "monster" : null, entity: bestMob };
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
    const { type, entity } = findEntityAt(e.clientX, e.clientY);
    hoveredCharId = type === "char" ? entity.id : null;
    hoveredMonsterId = type === "monster" ? entity.id : null;
    canvas.style.cursor = type ? "pointer" : "grab";
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
    const { type, entity } = findEntityAt(e.clientX, e.clientY);
    if (type === "char") {
      world.selectedCharacterId = entity.id;
      if (onSelectCharacter) onSelectCharacter(entity);
      world.events.emit("character:selected", entity);
    } else if (type === "monster") {
      if (onSelectMonster) onSelectMonster(entity);
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