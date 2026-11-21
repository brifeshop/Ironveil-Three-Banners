// src/systems/war.js
import { TUNING, RACE_NAMES, MAPS } from "../config.js";
import { getArchonStrategy } from "./politics.js";

export function startChipWar(world) {
  if (world.war.active) return;
  
  const participants = world.characters.filter(c => c.level >= 30 && c.hp > 0);
  if (participants.length < 3) return;

  world.war.active = true;
  world.war.round++;
  world.war.elapsed = 0;
  world.war.participants = participants.map(c => c.id);
  world.war.chipHp = { axion: TUNING.chipHp, belvian: TUNING.chipHp, cyra: TUNING.chipHp };

  const cragMap = MAPS.find(m => m.id === "crag_mine");

  for (const c of participants) {
    c.prevMap = c.pos.map;
    c.pos.map = "crag_mine";
    
    // Spawn di Gerbang (Portal) masing-masing ras, bukan di Chip
    const myPortal = cragMap.portals.find(p => p.race === c.race);
    if (myPortal) {
      c.pos.x = myPortal.x;
      c.pos.y = myPortal.y;
    } else {
      c.pos.x = 50; c.pos.y = 50;
    }
    c.aiState = "WAR";
  }

  world.logs.push({ tick: world.simTick, day: world.day, time: "!!:!!", category: "war", message: `🚨 CHIP WAR RONDE ${world.war.round} DIMULAI!` });
}

export function tickWar(world, dt) {
  if (!world.war.active) return;
  world.war.elapsed += dt;

  // Cek Kondisi Selesai (Waktu habis / hanya 1 chip tersisa)
  const aliveChips = Object.keys(world.war.chipHp).filter(r => world.war.chipHp[r] > 0);
  if (world.war.elapsed >= 120 || aliveChips.length <= 1) {
    endChipWar(world, aliveChips.length === 1 ? aliveChips[0] : null);
    return;
  }

  const charsInWar = world.characters.filter(c => c.level >= 30 && c.hp > 0 && c.pos.map === "crag_mine");
  if (charsInWar.length === 0) return;

  // Tentukan siapa Juara Bertahan (kalau ada)
  const champion = world.war.defendingChampion;

  for (const c of charsInWar) {
    if (world.simTick - c.lastAttackTick < 10) continue; // Cooldown serangan

    const myStrategy = getArchonStrategy(world, c.race);
    
    // Cari musuh terdekat
    let targetEnemy = null;
    let minDist = 20; 
    for (const e of charsInWar) {
      if (e.race === c.race) continue;
      
      // ATURAN ALIANSI: Jika saya bukan Juara, saya tidak menyerang ras non-Juara
      if (champion && c.race !== champion) {
        if (e.race !== champion) continue; // Abaikan ras lain, fokus ke Juara!
      }
      
      const d = Math.hypot(e.pos.x - c.pos.x, e.pos.y - c.pos.y);
      if (d < minDist) { minDist = d; targetEnemy = e; }
    }

    // Tentukan target Chip
    let targetChipRace = null;
    let weakestChipHp = Infinity;
    
    for (const r of ["axion", "belvian", "cyra"]) {
      if (r === c.race || world.war.chipHp[r] <= 0) continue;
      
      // ATURAN ALIANSI: Jika saya bukan Juara, target Chip hanya milik Juara
      if (champion && c.race !== champion) {
        if (r !== champion) continue; 
      }
      
      if (world.war.chipHp[r] < weakestChipHp) {
        weakestChipHp = world.war.chipHp[r];
        targetChipRace = r;
      }
    }

    // --- LOGIKA KEPUTUSAN AI ---
    let shouldAttackChip = false;

    if (targetEnemy) {
      if (myStrategy === "AGRESSIVE") shouldAttackChip = false;
      else if (myStrategy === "CHIP_FOCUS") shouldAttackChip = true;
      else if (myStrategy === "DEFENSIVE") shouldAttackChip = (world.war.chipHp[c.race] > 15000); // Kalau chip aman, serang
      else if (myStrategy === "OPPORTUNIST") shouldAttackChip = (targetEnemy.hp >= targetEnemy.hpMax * 0.4); // Bunuh kalau sekarat
      else shouldAttackChip = Math.random() < 0.5;
    } else {
      shouldAttackChip = true; // Tidak ada musuh, serang chip
    }

    // --- EKSEKUSI ---
    if (!shouldAttackChip && targetEnemy) {
      // Serang Musuh
      c.lastAttackTick = world.simTick;
      const dmg = Math.max(10, Math.round(c.atk - targetEnemy.def * 0.5));
      targetEnemy.hp -= dmg;
      
      world.effects.push({ map: "crag_mine", type: "beam", age: 0, ttl: 0.2, x1: c.pos.x, y1: c.pos.y, x2: targetEnemy.pos.x, y2: targetEnemy.pos.y, color: RACE_NAMES[c.race].color });

      if (targetEnemy.hp <= 0) handlePvPDeath(world, c, targetEnemy);
    } 
    else if (shouldAttackChip && targetChipRace) {
      // Serang Chip
      const chipPos = MAPS.find(m => m.id === `base_${targetChipRace}`).chip;
      const distToChip = Math.hypot(chipPos.x - c.pos.x, chipPos.y - c.pos.y);
      
      if (distToChip <= 5) {
        c.lastAttackTick = world.simTick;
        const dmg = Math.max(20, Math.round(c.atk * 0.8));
        world.war.chipHp[targetChipRace] -= dmg;
        
        world.effects.push({ map: "crag_mine", type: "beam", age: 0, ttl: 0.2, x1: c.pos.x, y1: c.pos.y, x2: chipPos.x, y2: chipPos.y, color: RACE_NAMES[c.race].color });
        
        if (world.war.chipHp[targetChipRace] <= 0) {
          world.war.chipHp[targetChipRace] = 0;
          c.pvp += 2000; 
          world.logs.unshift({ tick: world.simTick, day: world.day, time: "!!:!!", category: "war", message: `🎯 LAST HIT! ${c.name} (${c.race}) menghancurkan Chip ${targetChipRace}!` });
          
          const sisaChip = Object.keys(world.war.chipHp).filter(r => world.war.chipHp[r] > 0);
          if (sisaChip.length <= 1) {
            endChipWar(world, c.race);
            return; 
          }
        }
      } else {
        const speed = 6;
        c.pos.x += ((chipPos.x - c.pos.x) / distToChip) * speed * dt;
        c.pos.y += ((chipPos.y - c.pos.y) / distToChip) * speed * dt;
      }
    }
  }
}

// Menambahkan parameter winnerRace
export function endChipWar(world, winnerRace = null) {
  world.war.active = false;
  
  // Jika winnerRace tidak dikirim (karena waktu habis), cari HP tertinggi
  let finalWinner = winnerRace;
  if (!finalWinner) {
    let maxHp = -1;
    for (const [race, hp] of Object.entries(world.war.chipHp)) {
      if (hp > maxHp) { maxHp = hp; finalWinner = race; }
    }
  }

  if (finalWinner) {
    world.war.defendingChampion = finalWinner;
    world.logs.unshift({ 
      tick: world.simTick, day: world.day, time: "!!:!!", category: "war", 
      message: `🏆 CHIP WAR BERAKHIR! Pemenang: ${RACE_NAMES[finalWinner].name}` 
    });
  } else {
    world.logs.unshift({ 
      tick: world.simTick, day: world.day, time: "!!:!!", category: "war", 
      message: `⚖️ CHIP WAR BERAKHIR SERI!` 
    });
  }
  
  // Kembalikan Karakter ke Portal Markas
  for (const c of world.characters) {
    if (c.pos.map === "crag_mine") {
      const returnMap = c.prevMap || `base_${c.race}`;
      c.pos.map = returnMap;
      const mapTarget = MAPS.find(m => m.id === returnMap);
      
      if (mapTarget && mapTarget.portal) {
        c.pos.x = mapTarget.portal.x;
        c.pos.y = mapTarget.portal.y;
      } else {
        c.pos.x = 50; c.pos.y = 50;
      }
      delete c.prevMap;
      c.aiState = "GRINDING";
      c.hp = c.hpMax;
    }
  }
}

function handlePvPDeath(world, killer, victim) {
  victim.hp = 0;
  victim.pos.map = `base_${victim.race}`; 
  victim.recoveryTimer = TUNING.deathRespawnSeconds;
  
  const lossCp = Math.floor(victim.cp * 0.15);
  const lossPvp = Math.floor(victim.pvp * 0.15);
  victim.cp -= lossCp;
  victim.pvp -= lossPvp;
  killer.pvp += 100; 
  
  world.logs.push({ tick: world.simTick, day: world.day, category: "war", message: `⚔️ ${killer.name} membunuh ${victim.name} di War.` });
}