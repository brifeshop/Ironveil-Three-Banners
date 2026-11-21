// src/entities/monsters.js
import { MAPS, HOME_RINGS, TUNING, LOOT_TABLE } from "../config.js";

export function spawnAllMonsters(world, rng) {
  for (const race of ["axion", "belvian", "cyra"]) {
    spawnBaseMonsters(world, rng, `base_${race}`);
  }
  spawnZoneMonsters(world, rng, "ether", 40, 44);
  spawnZoneMonsters(world, rng, "elan_plateau", 45, 50);
  spawnZoneMonsters(world, rng, "crag_mine", 30, 40);
}

function spawnBaseMonsters(world, rng, mapId) {
  const map = MAPS.find(m => m.id === mapId);
  const anchor = map.anchor;
  for (const ring of HOME_RINGS) {
    for (let i = 0; i < ring.count; i++) {
      const angle = rng.next() * Math.PI * 0.5 + 0.08;
      const dist = ring.min + rng.next() * (ring.max - ring.min);
      const x = clamp(anchor.x + Math.cos(angle) * dist, 8, 94);
      const y = clamp(anchor.y + Math.sin(angle) * dist, 8, 94);
      const level = rng.randInt(ring.minLv, ring.maxLv);
      world.monsters.push(createMonster(world, rng, { map: mapId, level, ring: ring.ring, x, y }));
    }
  }
}

function spawnZoneMonsters(world, rng, mapId, minLv, maxLv) {
  for (let i = 0; i < 40; i++) {
    const x = clamp(12 + rng.next() * 76, 8, 94);
    const y = clamp(14 + rng.next() * 72, 8, 94);
    const level = rng.randInt(minLv, maxLv);
    world.monsters.push(createMonster(world, rng, { map: mapId, level, ring: 0, x, y }));
  }
}

function createMonster(world, rng, { map, level, ring, x, y }) {
  const scale = ring > 0 ? TUNING.monsterScale : 1.0;
  const hpMax = Math.round((TUNING.monsterHpBase + TUNING.monsterHpPerLevel * level) * scale);
  return {
    id: world.nextMonsterId++,
    map,
    ring,
    level,
    hpMax,
    hp: hpMax,
    atk: Math.round((TUNING.monsterAtkBase + TUNING.monsterAtkPerLevel * level) * scale),
    def: Math.round((TUNING.monsterDefBase + TUNING.monsterDefPerLevel * level) * scale),
    expReward: Math.round(46 + level * 6.5),
    pos: { x, y },
    homePos: { x, y },
    patrolTarget: { x, y },
    patrolRadius: 6.2,
    state: "idle",
    alive: true,
    respawnAtTick: 0,
    aggroTargetId: null,
    aggroTimer: 0,
    lastAttackTick: 0,
  };
}

function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

// Patroli
export function tickMonsters(world, dt) {
  for (const m of world.monsters) {
    if (!m.alive) continue;

    const dx = m.patrolTarget.x - m.pos.x;
    const dy = m.patrolTarget.y - m.pos.y;
    const d = Math.hypot(dx, dy);

    if (d < 0.5) {
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.random() * m.patrolRadius;
      m.patrolTarget.x = clamp(m.homePos.x + Math.cos(angle) * radius, 8, 94);
      m.patrolTarget.y = clamp(m.homePos.y + Math.sin(angle) * radius, 8, 94);
    } else {
      const speed = 3.0;
      const step = Math.min(d, speed * dt);
      m.pos.x += (dx / d) * step;
      m.pos.y += (dy / d) * step;
    }
  }
}

// Generate loot saat monster mati
export function generateLoot(level) {
  const chance = 0.5 + level * 0.01; // makin tinggi level, makin sering drop
  if (Math.random() > chance) return null;

  const tier = Math.min(LOOT_TABLE.length - 1, Math.floor(level / 10));
  const base = LOOT_TABLE[tier];
  return {
    name: base.name,
    value: Math.round(base.minValue + Math.random() * (base.maxValue - base.minValue)),
  };
}