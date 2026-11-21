// src/core/storage.js
import { SAVE_KEY } from "../config.js";

export function saveWorld(world) {
  try {
    // Kita tidak menyimpan 'effects' karena itu hanya visual sementara
    const clone = { ...world, effects: [] };
    localStorage.setItem(SAVE_KEY, JSON.stringify(clone));
    console.log("[Storage] Dunia berhasil disimpan.");
  } catch (e) {
    console.error("[Storage] Gagal menyimpan:", e);
  }
}

export function loadWorld() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    
    const parsed = JSON.parse(raw);
    // Pastikan ada karakter dan monster sebelum memuat
    if (parsed && parsed.characters && parsed.monsters) {
      console.log("[Storage] Save ditemukan, memuat dunia...");
      return parsed;
    }
    return null;
  } catch (e) {
    console.error("[Storage] Gagal memuat save:", e);
    return null;
  }
}

export function clearSave() {
  localStorage.removeItem(SAVE_KEY);
}