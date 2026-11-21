// src/systems/squads.js
import { RACE_NAMES } from "../config.js";

const SQUAD_ADJ = ["Besi", "Baja", "Bayangan", "Matahari", "Bintang", "Api", "Badai", "Guntur", "Es", "Darah"];
const SQUAD_NOUN = ["Serigala", "Elang", "Harimau", "Naga", "Ksatria", "Legiun", "Falcon", "Beruang", "Iblis", "Malaikat"];

export function tickSquads(world, dt) {
  // Hanya jalankan pengecekan setiap 5 detik sim (50 tick)
  if (world.simTick % 50 !== 0) return;

  // 1. Bersihkan regu yang anggotanya sudah mati / pindah peta / bubar
  for (const squad of world.squads) {
    squad.members = squad.members.filter(id => {
      const c = world.characters.find(x => x.id === id);
      return c && c.hp > 0 && c.pos.map === squad.mapId;
    });
    
    // Jika anggota kurang dari 2, bubarkan regu
    if (squad.members.length < 2) {
      squad.dissolved = true;
    }
  }
  // Hapus regu yang bubar
  world.squads = world.squads.filter(s => !s.dissolved);

  // 2. Coba bentuk regu baru untuk karakter yang belum punya regu
  const unassigned = world.characters.filter(c => 
    c.hp > 0 && 
    c.pos.map !== "crag_mine" && 
    !world.squads.some(s => s.members.includes(c.id))
  );

  for (const c of unassigned) {
    // Cari kandidat regu di sekitar (jarak < 15)
    const nearby = unassigned.filter(o => 
      o.id !== c.id && 
      o.race === c.race && 
      o.pos.map === c.pos.map && 
      Math.abs(o.level - c.level) <= 5 &&
      Math.hypot(o.pos.x - c.pos.x, o.pos.y - c.pos.y) < 15
    );

    // Jika ada minimal 2 karakter lain, bentuk regu
    if (nearby.length >= 2) {
      const members = [c, ...nearby.slice(0, 4)]; // Maks 5 orang
      
      // Buat nama regu
      const adj = SQUAD_ADJ[Math.floor(Math.random() * SQUAD_ADJ.length)];
      const noun = SQUAD_NOUN[Math.floor(Math.random() * SQUAD_NOUN.length)];
      const name = `${noun} ${adj}`;

      const newSquad = {
        id: `squad_${world.simTick}_${c.id}`,
        name,
        race: c.race,
        mapId: c.pos.map,
        members: members.map(m => m.id),
        loyalty: 100
      };

      world.squads.push(newSquad);

      // Simpan ID regu di karakter
      for (const m of members) {
        m.squadId = newSquad.id;
      }

      world.logs.unshift({ 
        tick: world.simTick, day: world.day, time: "!!:!!", 
        category: "econ", 
        message: `🔗 Regu Baru terbentuk: "${name}" (${RACE_NAMES[c.race].name}) beranggotakan ${members.length} karakter.` 
      });

      // Keluarkan anggota dari daftar unassigned agar tidak dobel
      members.forEach(m => {
        const idx = unassigned.indexOf(m);
        if (idx !== -1) unassigned.splice(idx, 1);
      });
    }
  }
}