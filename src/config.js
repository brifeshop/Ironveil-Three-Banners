// src/config.js
// Semua konstanta global. Satu sumber kebenaran.
// Koordinat peta: 0-100 (persen), sesuai referensi v8.

export const GAME_TITLE = "Ironveil: Three Banners";
export const SCHEMA_VERSION = 10;

export const TICK_MS = 100;
export const MAX_TICKS_PER_FRAME = 50;
export const CATCHUP_MAX_SIM_SECONDS = 600;

export const MAX_POP_PER_RACE = 120;
export const MAX_LOG = 500;
export const MAX_CHAT = 200;

export const GAME_DAY_SECONDS = 600;
export const WAR_DURATION_SECONDS = 120;
export const ELECTION_INTERVAL_SEC = 180;

export const RACE_NAMES = {
  axion:   { name: "Axion Empire",  short: "AXN", color: "#ef4444", relic: "Axion Siege Core" },
  belvian: { name: "Belvian Union", short: "BLV", color: "#38bdf8", relic: "Belvian Aegis Core" },
  cyra:    { name: "Cyra Alliance", short: "CYR", color: "#a855f7", relic: "Cyra Astral Core" },
};

export const RELIC_NAMES = {
  axion:   "Axion Siege Core",
  belvian: "Belvian Aegis Core",
  cyra:    "Cyra Astral Core",
};

// Peta data-driven. Tambah peta = tambah entri di sini.
// Koordinat 0-100. `anchor` = jangkar markas (untuk base).
export const MAPS = [
  { id: "base_axion",   name: "Base Axion",   type: "base", race: "axion",   anchor: { x: 14, y: 14 }, npcPvp: { x: 22, y: 20 }, chip: { x: 22, y: 26 } },
  { id: "base_belvian", name: "Base Belvian", type: "base", race: "belvian", anchor: { x: 14, y: 14 }, npcPvp: { x: 22, y: 20 }, chip: { x: 78, y: 26 } },
  { id: "base_cyra",    name: "Base Cyra",    type: "base", race: "cyra",    anchor: { x: 14, y: 14 }, npcPvp: { x: 22, y: 20 }, chip: { x: 50, y: 80 } },
  { id: "ether",        name: "Ether",        type: "zone", race: null,      anchor: null,             npcPvp: null,               chip: null },
  { id: "elan_plateau", name: "Elan Plateau", type: "zone", race: null,      anchor: null,             npcPvp: null,               chip: null },
  { id: "crag_mine",    name: "Crag Mine",    type: "zone", race: null,      anchor: null,             npcPvp: null,               chip: null },
];

export function getMap(id) {
  return MAPS.find(m => m.id === id) || null;
}

// Radius ring monster dari anchor markas (0-100 scale).
export const HOME_RINGS = [
  { ring: 1, min: 16, max: 30, minLv: 2,  maxLv: 6,  count: 10 },
  { ring: 2, min: 34, max: 52, minLv: 8,  maxLv: 16, count: 10 },
  { ring: 3, min: 56, max: 74, minLv: 18, maxLv: 28, count: 10 },
  { ring: 4, min: 78, max: 96, minLv: 30, maxLv: 39, count: 10 },
];

// [TUNING] — angka awal, wajib dikalibrasi lewat headless sim.
export const TUNING = {
  expNeedBase: 60,
  expNeedExp: 1.7,
  expKillBase: 30,
  expKillExp: 1.4,
  goldKillBase: 4,
  goldKillExp: 1.5,
  chipHp: 30000,
  chipRegenPct: 0.5,
  pvpBaselineKill: 100,
  pvpBaselineDeath: -150,
  pvpTransferLossPct: 0.15,
  pvpTransferGainRatio: 2 / 3,
  deathRespawnSeconds: 15,
  respawnHpPct: 0.30,
  potionDaruratPerDay: 1,
  monsterScale: 1.1,
  monsterHpBase: 150,
  monsterHpPerLevel: 26,
  monsterAtkBase: 11,
  monsterAtkPerLevel: 2.2,
  monsterDefBase: 5,
  monsterDefPerLevel: 1.2,
  monsterRespawnSeconds: 20,
};

export const GEAR_TIERS = [
  { reqLevel: 1,  name: "Novice Set",       cost: 0,      atkBonus: 0,   defBonus: 0 },
  { reqLevel: 10, name: "Iron Mk-II Set",   cost: 4500,   atkBonus: 18,  defBonus: 12 },
  { reqLevel: 20, name: "Alloy Elite Set",  cost: 16000,  atkBonus: 42,  defBonus: 28 },
  { reqLevel: 30, name: "Intense War Set",  cost: 48000,  atkBonus: 82,  defBonus: 54 },
  { reqLevel: 40, name: "Etheric C-Set",    cost: 135000, atkBonus: 135, defBonus: 88 },
  { reqLevel: 45, name: "Archon Relic Set", cost: 290000, atkBonus: 205, defBonus: 132 },
];