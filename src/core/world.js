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
      axion: createRaceState("axion"),
      belvian: createRaceState("belvian"),
      cyra: createRaceState("cyra"),
    },
    characters: [],
    monsters: [],
    squads: [],
    logs: [],   // <--- PENTING
    chats: [],  // <--- PENTING
    nextCharacterId: 1,
    nextMonsterId: 1,
    selectedCharacterId: null,
    currentMap: "base_axion",
    war: { active: false, round: 0, elapsed: 0, defendingChampion: null, allianceRivals: [], participants: [], chipHp: { axion: 0, belvian: 0, cyra: 0 } },
    electionTimer: 180,
  };
}

function createRaceState(id) {
  return {
    id, name: RACE_NAMES[id].name, color: RACE_NAMES[id].color,
    treasury: 320000, warFund: 0, morale: 100, wins: 0,
    council: { archon: null, warchon: null, ser: null, def: null, support: null },
  };
}

export function logEvent(world, category, message) {
  const simHours = Math.floor((world.simTick / 10 / 600) * 24);
  const simMinutes = Math.floor(((world.simTick / 10 / 600) * 24 * 60) % 60);
  const timeStr = `${String(simHours).padStart(2, '0')}:${String(simMinutes).padStart(2, '0')}`;
  world.logs.unshift({ tick: world.simTick, day: world.day, time: timeStr, category, message });
  if (world.logs.length > 200) world.logs.pop();
}