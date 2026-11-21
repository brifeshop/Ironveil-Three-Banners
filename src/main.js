// src/main.js
import { GAME_TITLE, MAPS } from "./config.js";
import { createTimeEngine } from "./core/time-engine.js";
import { createRng } from "./core/rng.js";
import { createWorld, logEvent } from "./core/world.js";
import { spawnInitialCharacters } from "./entities/characters.js";
import { spawnAllMonsters, tickMonsters, generateLoot } from "./entities/monsters.js";
import { createRadar } from "./ui/radar.js";
import { createMapTabs } from "./ui/map-tabs.js";
import { startChipWar, tickWar } from "./systems/war.js";
import { runElection } from "./systems/politics.js";
import { isInSafeZone } from "./systems/map-logic.js";
import { createDashboard } from "./ui/dashboard.js";

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
      <div class="text-cyan-300 mt-1">Loot: ${c.lootBag.length}/6</div>
    `;
  },
  onSelectMonster: (m) => {
    inspector.innerHTML = `
      <div class="text-slate-200 font-semibold mb-1">${m.name || "Monster"}</div>
      <div>Lv ${m.level} · Ring ${m.ring > 0 ? m.ring : "Zona"}</div>
      <div>HP ${Math.round(m.hp)}/${m.hpMax}</div>
      <div>ATK ${m.atk} · DEF ${m.def}</div>
      <div>EXP Reward: ${m.expReward}</div>
    `;
  },
});

createMapTabs({
  container: document.getElementById("map-tabs"),
  world,
  onChange: () => radar.render(),
});

const dashboard = createDashboard(world);

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

function step() {
  world.simTick++;
  
  // Simulasi Chat Acak
  if (world.simTick % 100 === 0) {
    const aliveChars = world.characters.filter(c => c.hp > 0);
    if (aliveChars.length > 0) {
      const speaker = aliveChars[Math.floor(Math.random() * aliveChars.length)];
      const phrases = [
        "Ayo kita grind ke Ring 4!",
        "Hati-hati, ras musuh sedang berkumpul.",
        "Butuh potion nih, mau ke NPC dulu.",
        "Semoga Archon kita segera terpilih.",
        "Chip Axion pasti kita hancurkan nanti!"
      ];
      const text = phrases[Math.floor(Math.random() * phrases.length)];
      
      world.chats.push({
        sender: speaker.name,
        text: text
      });
      
      if (world.chats.length > 100) world.chats.shift();
    }
  }

  const dt = 0.1;

  tickMonsters(world, dt);
  tickEffects(dt);
  tickWar(world, dt);

  world.electionTimer -= dt;
  if (world.electionTimer <= 0) {
    runElection(world);
    world.electionTimer = 180;
  }

  if (world.simTick % 6000 === 0) {
    world.day++;
    startChipWar(world);
  }

  for (const c of world.characters) {
    // 1. Logika Respawn
    if (c.recoveryTimer > 0) {
      c.recoveryTimer -= dt;
      if (c.recoveryTimer <= 0) {
        c.hp = c.hpMax;
        c.aiState = "GRINDING";
      } else {
        continue;
      }
    }

    if (c.hp <= 0) continue;
    if (c.pos.map === "crag_mine") continue;

    // 2. Balik ke War
    if (world.war.active && c.level >= 30) {
      c.pos.map = "crag_mine";
      const chipPos = MAPS.find(m => m.id === `base_${c.race}`).chip;
      c.pos.x = chipPos.x + (Math.random() * 10 - 5);
      c.pos.y = chipPos.y + (Math.random() * 10 - 5);
      c.aiState = "WAR";
      continue;
    }

    // 3. Jual Loot
    if (c.lootBag.length >= 4 && c.aiState !== "RETURN_NPC") {
      c.aiState = "RETURN_NPC";
    }

    if (c.aiState === "RETURN_NPC") {
      const map = MAPS.find(m => m.id === c.pos.map);
      let targetNpc = map.anchor;
      if (map.npc) targetNpc = map.npc;

      if (!targetNpc) { c.aiState = "GRINDING"; continue; }

      const dx = targetNpc.x - c.pos.x;
      const dy = targetNpc.y - c.pos.y;
      const dist = Math.hypot(dx, dy);

      if (dist > 2) {
        const step = Math.min(dist, 5.0 * dt);
        c.pos.x += (dx / dist) * step;
        c.pos.y += (dy / dist) * step;
      } else {
        let totalGold = 0;
        for (const item of c.lootBag) totalGold += item.value;
        c.gold += totalGold;
        c.lootBag = [];
        
        if (c.gold >= 300) {
          const buyCount = Math.min(5 - c.potions, Math.floor(c.gold / 300));
          if (buyCount > 0) {
            c.gold -= buyCount * 300;
            c.potions += buyCount;
          }
        }
        pushEffect(c.pos.map, "float", { x: c.pos.x, y: c.pos.y, text: `+${totalGold}G`, color: "#facc15" });
        c.aiState = "GRINDING";
      }
      continue;
    }

    // 4. Open PvP Ether
    if (c.pos.map === "ether" && !isInSafeZone(c)) {
      let enemy = null, minDist = 15;
      for (const e of world.characters) {
        if (e.id === c.id || e.race === c.race || e.pos.map !== "ether" || e.hp <= 0) continue;
        if (isInSafeZone(e)) continue;
        
        const d = Math.hypot(e.pos.x - c.pos.x, e.pos.y - c.pos.y);
        if (d < minDist) { minDist = d; enemy = e; }
      }

      if (enemy) {
        if (world.simTick - c.lastAttackTick >= 10) {
          c.lastAttackTick = world.simTick;
          const dmg = Math.max(10, Math.round(c.atk - enemy.def * 0.5));
          enemy.hp -= dmg;
          pushEffect(c.pos.map, "beam", { x1: c.pos.x, y1: c.pos.y, x2: enemy.pos.x, y2: enemy.pos.y, color: "#ef4444" });
          
          if (enemy.hp <= 0) {
            const lossCp = Math.floor(enemy.cp * 0.15);
            const lossPvp = Math.floor(enemy.pvp * 0.15);
            enemy.cp -= lossCp;
            enemy.pvp -= lossPvp;
            c.pvp += 100;
            enemy.hp = 0;
            enemy.pos.map = `base_${enemy.race}`;
            enemy.recoveryTimer = 15;
            world.logs.push({ tick: world.simTick, day: world.day, category: "pvp", message: `⚔️ ${c.name} membunuh ${enemy.name} di Ether.` });
          }
        }
        continue;
      }
    }

    // 5. Grinding
    const target = findNearestMonster(world, c);
    if (!target) continue;

    const dx = target.pos.x - c.pos.x;
    const dy = target.pos.y - c.pos.y;
    const dist = Math.hypot(dx, dy);

    if (dist > 4.5) {
      const step = Math.min(dist, 5.0 * dt);
      c.pos.x += (dx / dist) * step;
      c.pos.y += (dy / dist) * step;
    } else {
      if (world.simTick - c.lastAttackTick >= 10) {
        c.lastAttackTick = world.simTick;
        const dmg = Math.max(1, Math.round(c.atk - 0.5 * target.def));
        target.hp -= dmg;
        pushEffect(c.pos.map, "beam", { x1: c.pos.x, y1: c.pos.y, x2: target.pos.x, y2: target.pos.y, color: "#38bdf8" });
        
        if (target.hp <= 0) {
          target.alive = false;
          target.respawnAtTick = world.simTick + 200;
          c.exp += target.expReward;
          const loot = generateLoot(target.level);
          if (loot && c.lootBag.length < 6) c.lootBag.push(loot);
        }
      }
    }
  }

  for (const m of world.monsters) {
    if (!m.alive && world.simTick >= m.respawnAtTick) {
      m.alive = true;
      m.hp = m.hpMax;
      m.pos.x = m.homePos.x;
      m.pos.y = m.homePos.y;
    }
  }
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
  
  const axionArchonId = world.races.axion.council.archon;
  const archonName = axionArchonId ? world.characters.find(c => c.id === axionArchonId)?.name : "Kosong";

  document.getElementById("status").textContent =
    `Hari ${world.day} · Tick ${world.simTick} · ${world.currentMap} · ${alive} monster · avg Lv ${avgLv} · Axion Archon: ${archonName} · ${engine.getSpeed()}x`;
  
  dashboard.tick(); // <--- Ini yang membuat Log & Chat terupdate di layar!
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

document.getElementById("btnTestWar").addEventListener("click", () => {
  world.characters.forEach(c => { c.level = 30; c.hp = c.hpMax; });
  startChipWar(world);
  world.currentMap = "crag_mine";
  radar.render();
});