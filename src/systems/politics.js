// src/systems/politics.js
import { RACE_NAMES, ELECTION_INTERVAL_SEC } from "../config.js";

export function runElection(world) {
  world.logs.push({ tick: world.simTick, day: world.day, category: "econ", message: `🗳️ PEMILU DEWAN DIGELAR!` });

  for (const race of ["axion", "belvian", "cyra"]) {
    const members = world.characters.filter(c => c.race === race);
    if (members.length === 0) continue;

    // Syarat: CP >= 10.000
    const qualified = members.filter(c => c.cp >= 10000).sort((a, b) => b.cp - a.cp);
    
    if (qualified.length === 0) {
      world.races[race].council.archon = null;
      world.races[race].council.warchon = null;
      continue;
    }

    // Pilih 5 kursi (jika ada)
    world.races[race].council.archon = qualified[0] ? qualified[0].id : null;
    world.races[race].council.warchon = qualified[1] ? qualified[1].id : null;
    
    const archon = qualified[0];
    if (archon) {
      world.logs.push({ tick: world.simTick, day: world.day, category: "econ", message: `👑 ${archon.name} terpilih sebagai Archon ${RACE_NAMES[race].name}!` });
    }
  }
}