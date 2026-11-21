// src/main.js
import { GAME_TITLE, TICK_MS, SCHEMA_VERSION, MAX_POP_PER_RACE } from "./config.js";
import { createTimeEngine } from "./core/time-engine.js";
import { createRng } from "./core/rng.js";
import { createWorld, logEvent } from "./core/world.js";
import { spawnInitialCharacters } from "./entities/characters.js";
import { spawnAllMonsters } from "./entities/monsters.js";
import { characterAttackMonster, tickMonsterRespawn } from "./entities/combat.js";

const seed = Date.now() >>> 0;
const rng = createRng(seed);
const world = createWorld(seed);

spawnInitialCharacters(world, rng, 10);
spawnAllMonsters(world, rng);

logEvent(world, "init", `Dunia dibuat: ${world.characters.length} karakter, ${world.monsters.length} monster.`);

// Sederhana: tiap tick, tiap karakter menyerang monster terdekat di peta yang sama.
function step() {
  world.simTick++;

  for (const c of world.characters) {
    if (c.hp <= 0) continue;
    const target = findNearestMonster(world, c);
    if (!target) continue;
    characterAttackMonster(world, c, target, rng);
  }

  tickMonsterRespawn(world);

  // Ganti hari tiap 600 detik sim
  if (world.simTick % (600 * 10) === 0) {
    world.day++;
  }
}

function findNearestMonster(world, c) {
  let best = null;
  let bestDist = Infinity;
  for (const m of world.monsters) {
    if (!m.alive || m.map !== c.pos.map) continue;
    const dx = m.pos.x - c.pos.x;
    const dy = m.pos.y - c.pos.y;
    const d = dx * dx + dy * dy;
    if (d < bestDist) { bestDist = d; best = m; }
  }
  return best;
}

const engine = createTimeEngine({ onTick: step });

const elTitle = document.getElementById("title");
const elSubtitle = document.getElementById("subtitle");
const elStatus = document.getElementById("status");

elTitle.textContent = GAME_TITLE;
elSubtitle.textContent = `Seed: ${seed} · Skema v${SCHEMA_VERSION}`;

setInterval(() => {
  const totalChars = world.characters.length;
  const aliveMonsters = world.monsters.filter(m => m.alive).length;
  const totalLevel = world.characters.reduce((s, c) => s + c.level, 0);
  const avgLevel = (totalLevel / totalChars).toFixed(2);
  elStatus.innerHTML = `
    Hari: ${world.day} · Tick: ${world.simTick} · Speed: ${engine.getSpeed()}x<br/>
    Karakter: ${totalChars} (avg Lv ${avgLevel}) · Monster hidup: ${aliveMonsters}<br/>
    Log: ${world.logs.at(-1)?.message || "-"}
  `;
}, 250);

window.addEventListener("keydown", (e) => {
  if (e.key === "1") engine.setSpeed(1);
  if (e.key === "2") engine.setSpeed(2);
  if (e.key === "5") engine.setSpeed(5);
  if (e.key === "0") engine.setSpeed(10);
  if (e.key === " ") { e.preventDefault(); engine.pause(); }
});

console.log(`[Ironveil] Seed=${seed}`);