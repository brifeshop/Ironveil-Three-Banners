// src/main.js
import { GAME_TITLE, MAPS } from "./config.js";
import { createTimeEngine } from "./core/time-engine.js";
import { createRng } from "./core/rng.js";
import { createWorld, logEvent } from "./core/world.js";
import { spawnInitialCharacters } from "./entities/characters.js";
import { spawnAllMonsters, tickMonsters } from "./entities/monsters.js";
import { createRadar } from "./ui/radar.js";
import { createMapTabs } from "./ui/map-tabs.js";

const seed = Date.now() >>> 0;
const rng = createRng(seed);
const world = createWorld(seed);
world.effects = [];

spawnInitialCharacters(world, rng, 10);
spawnAllMonsters(world, rng);
logEvent(world, "init", `Dunia: ${world.characters.length} karakter, ${world.monsters.length} monster.`);

document.getElementById("title").textContent = GAME_TITLE;

const canvas = document.getElementById("radar");
const inspector = document.getElementById("inspector");
const radar = createRadar({
  canvas,
  world,
  onSelectCharacter: (c) => {
    inspector.innerHTML = `
      <div class="text-slate-200 font-semibold mb-1">${c.name}</div>
      <div>${c.race} · ${c.role} · ${c.archetype}</div>
      <div>Lv ${c.level} · HP ${Math.round(c.hp)}/${c.hpMax}</div>
      <div>ATK ${c.atk.toFixed(1)} · DEF ${c.def.toFixed(1)}</div>
      <div>CP ${c.cp} · PvP ${c.pvp} · Gold ${c.gold}</div>
    `;
  },
});

createMapTabs({
  container: document.getElementById("map-tabs"),
  world,
  onChange: () => radar.render(),
});

// ===== Efek =====
function pushEffect(map, type, payload) {
  if (!Array.isArray(world.effects)) world.effects = [];
  if (world.effects.length > 120) world.effects.shift();
  world.effects.push({ map, type, age: 0, ttl: type === "beam" ? 0.2 : 1.0, ...payload });
}

function tickEffects(dt) {
  if (!Array.isArray(world.effects)) return;
  world.effects = world.effects.filter(e => {
    e.age += dt;
    return e.age < e.ttl;
  });
}

// ===== Gerak & Serangan =====
function step() {
  world.simTick++;
  const dt = 0.1; // 1 tick = 0.1 detik sim

  tickMonsters(world, dt);
  tickEffects(dt);

  // Karakter: cari monster terdekat di peta yang sama
  for (const c of world.characters) {
    if (c.hp <= 0) continue;
    const target = findNearestMonster(world, c);
    if (!target) continue;

    const dx = target.pos.x - c.pos.x;
    const dy = target.pos.y - c.pos.y;
    const dist = Math.hypot(dx, dy);

    // Jika jauh, mendekat
    if (dist > 4.5) {
      const speed = 5.0;
      const step = Math.min(dist, speed * dt);
      c.pos.x += (dx / dist) * step;
      c.pos.y += (dy / dist) * step;
    } else {
      // Serang
      if (world.simTick - c.lastAttackTick >= 10) {
        c.lastAttackTick = world.simTick;
        const dmg = Math.max(1, Math.round(c.atk - 0.5 * target.def));
        target.hp -= dmg;
        pushEffect(c.pos.map, "beam", {
          x1: c.pos.x, y1: c.pos.y,
          x2: target.pos.x, y2: target.pos.y,
          color: "#38bdf8",
        });
        pushEffect(c.pos.map, "float", {
          x: target.pos.x, y: target.pos.y,
          text: `-${dmg}`, color: "#fda4af",
        });
        if (target.hp <= 0) {
          target.alive = false;
          target.respawnAtTick = world.simTick + 200;
          c.exp += target.expReward;
          c.gold += Math.round(4 * Math.pow(target.level, 1.5));
        }
      }
    }
  }

  // Respawn monster
  for (const m of world.monsters) {
    if (!m.alive && world.simTick >= m.respawnAtTick) {
      m.alive = true;
      m.hp = m.hpMax;
      m.pos.x = m.homePos.x;
      m.pos.y = m.homePos.y;
    }
  }

  if (world.simTick % 6000 === 0) world.day++;
}

function findNearestMonster(world, c) {
  let best = null, bestDist = Infinity;
  for (const m of world.monsters) {
    if (!m.alive || m.map !== c.pos.map) continue;
    const dx = m.pos.x - c.pos.x, dy = m.pos.y - c.pos.y;
    const d = dx * dx + dy * dy;
    if (d < bestDist) { bestDist = d; best = m; }
  }
  return best;
}

const engine = createTimeEngine({ onTick: step });

function renderLoop() {
  radar.render();
  requestAnimationFrame(renderLoop);
}
renderLoop();

setInterval(() => {
  const alive = world.monsters.filter(m => m.alive && m.map === world.currentMap).length;
  const avgLv = (world.characters.reduce((s, c) => s + c.level, 0) / world.characters.length).toFixed(1);
  document.getElementById("status").textContent =
    `Hari ${world.day} · Tick ${world.simTick} · ${world.currentMap} · ${alive} monster · avg Lv ${avgLv} · ${engine.getSpeed()}x`;
}, 250);

let paused = false;
window.addEventListener("keydown", (e) => {
  if (e.key === "p" || e.key === "P") {
    paused = !paused;
    if (paused) engine.pause(); else engine.resume();
  }
  if (e.key === "+" || e.key === "=") engine.setSpeed(Math.min(10, engine.getSpeed() * 2));
  if (e.key === "-" || e.key === "_") engine.setSpeed(Math.max(1, engine.getSpeed() / 2));
});