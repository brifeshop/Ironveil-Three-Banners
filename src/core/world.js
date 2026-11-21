// src/core/world.js
import { SCHEMA_VERSION, RACE_NAMES, MAPS } from "../config.js";
import { createEventBus } from "./event-bus.js";

export function createWorld(seed) {
  return {
    schema: SCHEMA_VERSION,
    seed,
    simTick: 0,
    day: 1,
    season: 1,
    era: "Era Tenang",
    events: createEventBus(),
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
    selectedCharacterId: null,
    currentMap: "base_axion",
    camera: { mode: "free", x: 50, y: 50, zoom: 1, followId: null },
    war: {
      active: false,
      round: 0,
      elapsed: 0,
      defendingChampion: null,
      allianceRivals: [],
      participants: [],
      chipHp: { axion: 0, belvian: 0, cyra: 0 },
    },
  };
}

function createRaceState(id) {
  return {
    id,
    name: RACE_NAMES[id].name,
    color: RACE_NAMES[id].color,
    treasury: 320000,
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