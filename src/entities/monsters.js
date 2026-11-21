// src/entities/monsters.js
// Spawn monster per ring di markas + zona khusus.

const RING_LEVELS = [
  { ring: 1, min: 2, max: 6, radiusMin: 3, radiusMax: 10 },
  { ring: 2, min: 8, max: 16, radiusMin: 10, radiusMax: 20 },
  { ring: 3, min: 18, max: 28, radiusMin: 20, radiusMax: 32 },
  { ring: 4, min: 30, max: 39, radiusMin: 32, radiusMax: 46 },
];

const ZONE_LEVELS = {
  ether: { min: 40, max: 44 },
  elan_plateau: { min: 45, max: 50 },
  crag_mine: { min: 30, max: 40 },
};

export function spawnAllMonsters(world, rng) {
  for (const race of ["axion", "belvian", "cyra"]) {
    spawnBaseMonsters(world, rng, `base_${race}`);
  }
  for (const zone of Object.keys(ZONE_LEVELS)) {
    spawnZoneMonsters(world, rng, zone);
  }
}

function spawnBaseMonsters(world, rng, mapId) {
  for (const r of RING_LEVELS) {
    for (let i = 0; i < 10; i++) {
      const angle = rng.next() * Math.PI * 2;
      const radius = r.radiusMin + rng.next() * (r.radiusMax - r.radiusMin);
      const level = rng.randInt(r.min, r.max);
      world.monsters.push(createMonster(world, rng, {
        map: mapId, level, ring: r.ring,
        x: 14 + Math.cos(angle) * radius,
        y: 14 + Math.sin(angle) * radius,
      }));
    }
  }
}

function spawnZoneMonsters(world, rng, mapId) {
  const z = ZONE_LEVELS[mapId];
  for (let i = 0; i < 40; i++) {
    const level = rng.randInt(z.min, z.max);
    world.monsters.push(createMonster(world, rng, {
      map: mapId, level, ring: 0,
      x: 4 + rng.next() * 56,
      y: 4 + rng.next() * 28,
    }));
  }
}

function createMonster(world, rng, { map, level, ring, x, y }) {
  const scale = 1.1 + Math.max(0, level - 40) * 0.15;
  return {
    id: world.nextMonsterId++,
    map,
    ring,
    level,
    hpMax: Math.round((80 + 30 * level) * scale),
    hp: Math.round((80 + 30 * level) * scale),
    atk: 8 + 3 * level,
    def: 4 + 2 * level,
    pos: { x, y },
    spawnPos: { x, y },
    state: "idle",
    alive: true,
    respawnAtTick: 0,
    lastAttackTick: 0,
  };
}