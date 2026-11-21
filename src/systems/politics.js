// src/systems/politics.js
import { RACE_NAMES, ELECTION_INTERVAL_SEC, TUNING } from "../config.js";

export function runElection(world) {
  world.logs.unshift({ tick: world.simTick, day: world.day, time: "!!:!!", category: "econ", message: `🗳️ PEMILU DEWAN DIGELAR!` });

  for (const race of ["axion", "belvian", "cyra"]) {
    const members = world.characters.filter(c => c.race === race);
    if (members.length === 0) continue;

    const qualified = members.filter(c => c.cp >= 10000).sort((a, b) => b.cp - a.cp);
    
    if (qualified.length === 0) {
      world.races[race].council.archon = null;
      world.races[race].council.warchon = null;
      world.races[race].council.ser = null;
      world.races[race].council.def = null;
      world.races[race].council.support = null;
      continue;
    }

    // Isi 5 kursi
    world.races[race].council.archon = qualified[0] ? qualified[0].id : null;
    world.races[race].council.warchon = qualified[1] ? qualified[1].id : null;
    world.races[race].council.ser = qualified[2] ? qualified[2].id : null;
    world.races[race].council.def = qualified[3] ? qualified[3].id : null;
    world.races[race].council.support = qualified[4] ? qualified[4].id : null;
    
    const archon = qualified[0];
    if (archon) {
      world.logs.unshift({ tick: world.simTick, day: world.day, time: "!!:!!", category: "econ", message: `👑 ${archon.name} terpilih sebagai Archon ${RACE_NAMES[race].name}!` });
    }
  }
}

// Menentukan strategi berdasarkan kepribadian Archon
export function getArchonStrategy(world, race) {
  const archonId = world.races[race].council.archon;
  const archon = archonId ? world.characters.find(c => c.id === archonId) : null;
  
  const myChipHp = world.war.chipHp[race];
  const maxChipHp = TUNING.chipHp;

  // 1. Cek Kondisi Darurat: Jika Chip kita sekarat (<30%), fokus bertahan!
  if (myChipHp < maxChipHp * 0.3) {
    return "DEFENSIVE";
  }

  // 2. Jika tidak ada Archon, pakai strategi standar
  if (!archon) return "BALANCED";

  // 3. Strategi berdasarkan Kepribadian Archon
  switch (archon.archetype) {
    case "Pemburu":      
      return "AGRESSIVE"; // Fokus bunuh musuh
    case "Ambisius":     
      return "CHIP_FOCUS"; // Fokus hancurkan chip
    case "Prajurit Setia": 
      return myChipHp < maxChipHp * 0.6 ? "DEFENSIVE" : "CHIP_FOCUS"; 
    case "Pedagang":     
      return "OPPORTUNIST"; 
    default:             
      return "BALANCED"; 
  }
}