// src/systems/war.js
import { TUNING, RACE_NAMES, MAPS } from "../config.js";

export function startChipWar(world) {
  if (world.war.active) return;
  
  const participants = world.characters.filter(c => c.level >= 30 && c.hp > 0);
  if (participants.length < 3) return;

  world.war.active = true;
  world.war.round++;
  world.war.elapsed = 0;
  world.war.participants = participants.map(c => c.id);
  world.war.chipHp = { axion: TUNING.chipHp, belvian: TUNING.chipHp, cyra: TUNING.chipHp };

  for (const c of participants) {
    c.prevMap = c.pos.map;
    c.pos.map = "crag_mine";
    const chipPos = MAPS.find(m => m.id === `base_${c.race}`).chip || { x: 50, y: 50 };
    c.pos.x = chipPos.x + (Math.random() * 10 - 5);
    c.pos.y = chipPos.y + (Math.random() * 10 - 5);
    c.aiState = "WAR";
  }

  world.logs.push({ tick: world.simTick, day: world.day, category: "war", message: `🚨 CHIP WAR RONDE ${world.war.round} DIMULAI!` });
}

export function tickWar(world, dt) {
  if (!world.war.active) return;
  world.war.elapsed += dt;

  const aliveChips = Object.values(world.war.chipHp).filter(hp => hp > 0).length;
  if (world.war.elapsed >= 120 || aliveChips <= 1) {
    endChipWar(world);
    return;
  }

  const charsInWar = world.characters.filter(c => c.level >= 30 && c.hp > 0 && c.pos.map === "crag_mine");
  if (charsInWar.length === 0) return;

  for (const c of charsInWar) {
    if (world.simTick - c.lastAttackTick < 10) continue;

    // Cari musuh
    let targetEnemy = null;
    let minDist = 10;
    for (const e of charsInWar) {
      if (e.race === c.race) continue;
      const d = Math.hypot(e.pos.x - c.pos.x, e.pos.y - c.pos.y);
      if (d < minDist) { minDist = d; targetEnemy = e; }
    }

    if (targetEnemy) {
      c.lastAttackTick = world.simTick;
      const dmg = Math.max(10, Math.round(c.atk - targetEnemy.def * 0.5));
      targetEnemy.hp -= dmg;
      
      world.effects.push({ map: "crag_mine", type: "beam", age: 0, ttl: 0.2, x1: c.pos.x, y1: c.pos.y, x2: targetEnemy.pos.x, y2: targetEnemy.pos.y, color: RACE_NAMES[c.race].color });
      world.effects.push({ map: "crag_mine", type: "float", age: 0, ttl: 0.8, x: targetEnemy.pos.x, y: targetEnemy.pos.y, text: `-${dmg}`, color: "#fff" });

      if (targetEnemy.hp <= 0) handlePvPDeath(world, c, targetEnemy);
    } else {
      const enemyRaces = Object.keys(world.war.chipHp).filter(r => r !== c.race && world.war.chipHp[r] > 0);
      if (enemyRaces.length === 0) continue;

      const targetRace = enemyRaces[0];
      const chipPos = MAPS.find(m => m.id === `base_${targetRace}`).chip;
      const distToChip = Math.hypot(chipPos.x - c.pos.x, chipPos.y - c.pos.y);
      
      if (distToChip <= 5) {
        c.lastAttackTick = world.simTick;
        const dmg = Math.max(20, Math.round(c.atk * 0.8));
        world.war.chipHp[targetRace] -= dmg;
        world.effects.push({ map: "crag_mine", type: "beam", age: 0, ttl: 0.2, x1: c.pos.x, y1: c.pos.y, x2: chipPos.x, y2: chipPos.y, color: RACE_NAMES[c.race].color });
        
        if (world.war.chipHp[targetRace] <= 0) {
          world.war.chipHp[targetRace] = 0;
          c.pvp += 2000;
          world.logs.push({ tick: world.simTick, day: world.day, category: "war", message: `🎯 LAST HIT! ${c.name} (${c.race}) menghancurkan Chip ${targetRace}!` });
        }
      } else {
        const speed = 6;
        c.pos.x += ((chipPos.x - c.pos.x) / distToChip) * speed * dt;
        c.pos.y += ((chipPos.y - c.pos.y) / distToChip) * speed * dt;
      }
    }
  }
}

export function endChipWar(world) {
  world.war.active = false;
  let winner = null, maxHp = -1;
  for (const [race, hp] of Object.entries(world.war.chipHp)) {
    if (hp > maxHp) { maxHp = hp; winner = race; }
  }
  world.war.defendingChampion = winner;
  
  for (const c of world.characters) {
    if (c.pos.map === "crag_mine") {
      c.pos.map = c.prevMap || `base_${c.race}`;
      delete c.prevMap;
      c.aiState = "GRINDING";
      c.hp = c.hpMax;
    }
  }

  if (winner) {
    world.logs.push({ tick: world.simTick, day: world.day, category: "war", message: `🏆 CHIP WAR BERAKHIR! Pemenang: ${RACE_NAMES[winner].name}` });
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