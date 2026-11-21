// src/systems/map-logic.js
import { MAPS } from "../config.js";

export function isInSafeZone(character) {
  const map = MAPS.find(m => m.id === character.pos.map);
  if (!map || !map.safeZones) return false;

  for (const zone of map.safeZones) {
    if (zone.race !== "all" && zone.race !== character.race) continue;
    const dist = Math.hypot(character.pos.x - zone.x, character.pos.y - zone.y);
    if (dist <= zone.radius) return true;
  }
  return false;
}

// Fungsi baru: Cek apakah koordinat X,Y berada di markas (Base)
export function isPointInBase(mapId, x, y) {
  const map = MAPS.find(m => m.id === mapId);
  if (!map || map.type !== "base") return false;
  
  // Anggap radius 12 dari anchor adalah area markas yang aman
  const anchor = map.anchor;
  const dist = Math.hypot(x - anchor.x, y - anchor.y);
  return dist <= 12;
}