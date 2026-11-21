// src/entities/characters.js
// Spawn, statistik, dan level-up karakter.

import { RACE_NAMES, TUNING } from "../config.js";

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
  const races = ["axion", "belvian", "cyra"];
  const usedNames = { axion: new Set(), belvian: new Set(), cyra: new Set() };

  for (const race of races) {
    for (let i = 0; i < perRace; i++) {
      const name = pickUniqueName(rng, usedNames[race]);
      const role = rng.pick(ROLES);
      const archetype = rng.pick(ARCHETYPES);
      const level = rng.randInt(1, 3);
      const c = createCharacter(world, rng, { race, name, role, archetype, level });
      world.characters.push(c);
    }
  }
}

function pickUniqueName(rng, usedSet) {
  for (let tries = 0; tries < 100; tries++) {
    const n = rng.pick(FIRST_NAMES);
    if (!usedSet.has(n)) { usedSet.add(n); return n; }
  }
  // fallback: tambah angka
  const n = rng.pick(FIRST_NAMES) + rng.randInt(2, 99);
  usedSet.add(n);
  return n;
}

export function createCharacter(world, rng, { race, name, role, archetype, level }) {
  const id = world.nextCharacterId++;
  const stats = computeStats(level, role);
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
    gold: 0,
    potions: 3,
    relic: { owned: false, tier: 0 },
    vetRank: 0,
    loyalty: 50,
    squadId: null,
    nemesisId: null,
    wanted: false,
    killStreak: 0,
    gmBuff: null,
    history: [],
    pos: { x: 14 + rng.randInt(-3, 3), y: 14 + rng.randInt(-3, 3), map: `base_${race}` },
    state: "idle",
    lastAttackTick: 0,
  };
}

export function computeStats(level, role) {
  const m = ROLE_MULT[role] || ROLE_MULT.SER;
  return {
    hpMax: Math.round((120 + 35 * level) * m.hp),
    atk: (10 + 4 * level) * m.atk,
    def: (5 + 2.5 * level) * m.def,
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