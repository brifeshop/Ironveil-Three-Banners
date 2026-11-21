// src/main.js
// Entry point: inisialisasi Time Engine + tampilkan status.

import { GAME_TITLE, TICK_MS, SCHEMA_VERSION } from "./config.js";
import { createTimeEngine } from "./core/time-engine.js";
import { createRng } from "./core/rng.js";

const seed = Date.now() >>> 0;
const rng = createRng(seed);

let tickCount = 0;

const elTitle = document.getElementById("title");
const elSubtitle = document.getElementById("subtitle");
const elStatus = document.getElementById("status");

elTitle.textContent = GAME_TITLE;
elSubtitle.textContent = `Seed: ${seed} · Skema v${SCHEMA_VERSION}`;

const engine = createTimeEngine({
  onTick: () => {
    tickCount++;
  },
});

// Update UI ringan tiap 250ms (bukan tiap tick) agar tidak membebani render.
setInterval(() => {
  const simSeconds = (tickCount * TICK_MS) / 1000;
  elStatus.textContent = `Tick: ${tickCount} · Sim: ${simSeconds.toFixed(1)}s · Speed: ${engine.getSpeed()}x`;
}, 250);

// Shortcut keyboard: 1x, 2x, 5x, 10x, pause
window.addEventListener("keydown", (e) => {
  if (e.key === "1") engine.setSpeed(1);
  if (e.key === "2") engine.setSpeed(2);
  if (e.key === "5") engine.setSpeed(5);
  if (e.key === "0") engine.setSpeed(10);
  if (e.key === " ") { e.preventDefault(); engine.pause(); }
});

console.log(`[Ironveil] Seed=${seed} RNG=${rng.next().toFixed(4)}`);