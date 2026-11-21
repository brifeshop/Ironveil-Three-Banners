// src/config.js
// Semua konstanta global. Satu sumber kebenaran.

export const GAME_TITLE = "Ironveil: Three Banners";
export const SCHEMA_VERSION = 10;

export const TICK_MS = 100;              // 10 tick/detik pada 1x
export const MAX_TICKS_PER_FRAME = 50;
export const CATCHUP_MAX_SIM_SECONDS = 600;

export const MAX_POP_PER_RACE = 120;
export const MAX_LOG = 500;
export const MAX_CHAT = 200;

export const RACE_NAMES = {
  axion:   { name: "Axion Empire",   color: "#ef4444", relic: "Axion Siege Core" },
  belvian: { name: "Belvian Union",  color: "#38bdf8", relic: "Belvian Aegis Core" },
  cyra:    { name: "Cyra Alliance",  color: "#a855f7", relic: "Cyra Astral Core" },
};

export const RELIC_NAMES = {
  axion:   "Axion Siege Core",
  belvian: "Belvian Aegis Core",
  cyra:    "Cyra Astral Core",
};

export const MAPS = [
  { id: "base_axion",    name: "Base Axion" },
  { id: "base_belvian",  name: "Base Belvian" },
  { id: "base_cyra",     name: "Base Cyra" },
  { id: "ether",         name: "Ether" },
  { id: "elan_plateau",  name: "Elan Plateau" },
  { id: "crag_mine",     name: "Crag Mine" },
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
};