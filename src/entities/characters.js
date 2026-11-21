// src/entities/characters.js
import { RACE_NAMES, TUNING, GEAR_TIERS } from "../config.js";

const FIRST_NAMES = [
  "Kael", "Vera", "Dorn", "Lyra", "Rook", "Sena", "Tovan", "Mira",
  "Jax", "Elara", "Bram", "Nyx", "Cael", "Rhea", "Voss", "Isla",
  "Garr", "Lena", "Torin", "Ayla", "Drex", "Sira", "Bane", "Yara",
  "Krug", "Nova", "Silas", "Wren", "Orin", "Talia",
];

const ROLES = ["SER", "DEF", "SUP"];
const ARCHETYPES = [
  "Ambisius", "Prajurit Setia", "Pemburu",
  "Pedagang", "Pendendam", "Pengecut Berhati Baja",
];

const ROLE_MULT = {
  SER: { atk: 1.2, def: 0.9, hp: 1.0 },
  DEF: { atk: 0.9, def: 1.25, hp: 1.15 },
  SUP: { atk: 0.8, def: 1.0, hp: 1.0 },
};

export function spawnInitialCharacters(world, rng, perRace = 10) {
  for (const race of ["axion", "belvian", "cyra"]) {
    const usedNames = new Set();
    for (let i = 0; i < perRace; i++) {
      const name = pickUniqueName(rng, usedNames);
      const role = rng.pick(ROLES);
      const archetype = rng.pick(ARCHETYPES);
      const level = rng.randInt(1, 3);
      world.characters.push(createCharacter(world, rng, { race, name, role, archetype, level }));
    }
  }
}

function pickUniqueName(rng, usedSet) {
  for (let tries = 0; tries < 100; tries++) {
    const n = rng.pick(FIRST_NAMES);
    if (!usedSet.has(n)) { usedSet.add(n); return n; }
  }
  const n = rng.pick(FIRST_NAMES) + rng.randInt(2, 99);
  usedSet.add(n);
  return n;
}

export function createCharacter(world, rng, { race, name, role, archetype, level }) {
  const id = world.nextCharacterId++;
  const stats = computeStats(level, role);
  let gearIdx = 0;
  for (let i = GEAR_TIERS.length - 1; i >= 0; i--) {
    if (level >= GEAR_TIERS[i].reqLevel) { gearIdx = i; break; }
  }
  const map = `base_${race}`;
  return {
    id,
    name,
    race,
    role,
    archetype,
    level,
    exp: 0,
    hp: stats.hpMax,
    hpMax: stats.hpMax,
    atk: stats.atk,
    def: stats.def,
    cp: 0,
    pvp: 0,
    gold: 3600 + level * 450,
    potions: 5,
    talic: 0,
    lootBag: [],
    gearTierIndex: gearIdx,
    upgradePlus: 0,
    relic: { owned: false, tier: 0 },
    vetRank: 0,
    loyalty: 50,
    squadId: null,
    nemesisId: null,
    wanted: false,
    killStreak: 0,
    warKills: 0,
    bossKills: 0,
    lastHits: 0,
    treasuryDonated: 0,
    recoveryTimer: 0,
    gmBuff: null,
    history: [],
    pos: { x: 14 + rng.randInt(-3, 3), y: 14 + rng.randInt(-3, 3), map },
    aiState: "GRINDING",
    activityLabel: "Berburu monster",
    lastAttackTick: 0,
  };
}

export function computeStats(level, role) {
  const m = ROLE_MULT[role] || ROLE_MULT.SER;
  return {
    hpMax: Math.round((450 + 38 * level) * m.hp),
    atk: (12 + 1.6 * level + 14 + level * 3.8) * m.atk,
    def: (14 + 3.1 * level) * m.def,
  };
}

export function expNeeded(level) {
  return Math.round(TUNING.expNeedBase * Math.pow(level, TUNING.expNeedExp));
}

export function addExp(character, amount) {
  character.exp += amount;
  while (character.level < 50 && character.exp >= expNeeded(character.level)) {
    character.exp -= expNeeded(character.level);
    character.level++;
    const s = computeStats(character.level, character.role);
    character.hpMax = s.hpMax;
    character.atk = s.atk;
    character.def = s.def;
    character.hp = character.hpMax;
  }
}