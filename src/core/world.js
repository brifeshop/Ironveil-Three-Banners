// src/core/world.js
// State global dunia: waktu, seed, ras, dan referensi entitas.

import { SCHEMA_VERSION, RACE_NAMES, TUNING } from "../config.js";

export function createWorld(seed) {
  return {
    schema: SCHEMA_VERSION,
    seed,
    simTick: 0,
    day: 1,
    season: 1,
    era: "Era Tenang",
    races: {
      axion:   createRaceState("axion"),
      belvian: createRaceState("belvian"),
      cyra:    createRaceState("cyra"),
    },
    characters: [],
    monsters: [],
    logs: [],
    nextCharacterId: 1,
    nextMonsterId: 1,
  };
}

function createRaceState(id) {
  return {
    id,
    name: RACE_NAMES[id].name,
    color: RACE_NAMES[id].color,
    treasury: 0,
    warFund: 0,
    morale: 100,
    wins: 0,
    council: { archon: null, warchon: null, ser: null, def: null, support: null },
  };
}

export function logEvent(world, category, message) {
  world.logs.push({ tick: world.simTick, day: world.day, category, message });
  if (world.logs.length > 500) world.logs.shift();
}