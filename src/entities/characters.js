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

export function checkLevelUp(character) {
  // Batas maksimal level adalah 50
  if (character.level >= 50) return false;

  // Rumus EXP yang dibutuhkan
  const needed = Math.round(60 * Math.pow(character.level, 1.7));
  
  // Jika EXP cukup, naikkan level
  if (character.exp >= needed) {
    character.exp -= needed;
    character.level++;
    
    // Hitung ulang statistik dasar (ATK, DEF, HP) sesuai level baru
    const stats = computeStats(character.level, character.role);
    character.hpMax = stats.hpMax;
    character.atk = stats.atk;
    character.def = stats.def;
    
    // Pulihkan HP saat naik level
    character.hp = character.hpMax;

    // Cek apakah naik level ini memicu Gear baru
    // (Biarkan AI yang membelinya di NPC, tapi kita bisa beri log)
    
    return true;
  }
  
  return false;
}

export function getNextGear(character) {
  const nextIdx = character.gearTierIndex + 1;
  if (nextIdx >= GEAR_TIERS.length) return null;
  const gear = GEAR_TIERS[nextIdx];
  if (character.level >= gear.reqLevel) return { ...gear, index: nextIdx };
  return null;
}

import { ASCENSION_REQUIREMENTS } from "../config.js";

export function checkAscension(world, character) {
  if (character.level >= ASCENSION_REQUIREMENTS.level && character.cp >= ASCENSION_REQUIREMENTS.cp) {
    // Simpan gelar dan rank
    character.vetRank = (character.vetRank || 0) + 1;
    
    // Reset ke Lv 1
    character.level = 1;
    character.exp = 0;
    
    // Reset Gold & PvP (sesuai aturan)
    character.gold = 0;
    character.pvp = 0;
    
    // Hitung ulang stats dasar (Lv 1), tapi dengan bonus Veteran
    const baseStats = computeStats(1, character.role);
    const multiplier = 1 + (character.vetRank * ASCENSION_REQUIREMENTS.bonusAtkPerRank);
    
    character.hpMax = Math.round(baseStats.hpMax * multiplier);
    character.atk = baseStats.atk * multiplier;
    character.def = baseStats.def * multiplier;
    character.hp = character.hpMax;
    
    // Log kejadian besar
    world.logs.unshift({
      tick: world.simTick,
      day: world.day,
      time: "!!:!!",
      category: "pvp", // Pakai warna merah/rose
      message: `🌟 LAHIR KEMBALI! ${character.name} mencapai Lv 50 & naik ke Rank Veteran ${character.vetRank}!`
    });

    return true;
  }
  return false;
}