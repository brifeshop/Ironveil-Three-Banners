// src/entities/monsters.js
import { MAPS, HOME_RINGS, TUNING, LOOT_COMMON, LOOT_RARE } from "../config.js";
import { isPointInBase } from "../systems/map-logic.js";

export function spawnAllMonsters(world, rng) {
  for (const race of ["axion", "belvian", "cyra"]) {
    spawnBaseMonsters(world, rng, `base_${race}`);
  }
  spawnZoneMonsters(world, rng, "ether", 40, 44);
  spawnZoneMonsters(world, rng, "elan_plateau", 45, 50);
  spawnZoneMonsters(world, rng, "crag_mine", 30, 40);
}

function spawnBaseMonsters(world, rng, mapId) {
  const map = MAPS.find(m => m.id === mapId);
  const anchor = map.anchor;
  for (const ring of HOME_RINGS) {
    for (let i = 0; i < ring.count; i++) {
      const angle = rng.next() * Math.PI * 0.5 + 0.08;
      const dist = ring.min + rng.next() * (ring.max - ring.min);
      const x = clamp(anchor.x + Math.cos(angle) * dist, 8, 94);
      const y = clamp(anchor.y + Math.sin(angle) * dist, 8, 94);
      const level = rng.randInt(ring.minLv, ring.maxLv);
      world.monsters.push(createMonster(world, rng, { map: mapId, level, ring: ring.ring, x, y }));
    }
  }
}

function spawnZoneMonsters(world, rng, mapId, minLv, maxLv) {
  for (let i = 0; i < 40; i++) {
    const x = clamp(12 + rng.next() * 76, 8, 94);
    const y = clamp(14 + rng.next() * 72, 8, 94);
    const level = rng.randInt(minLv, maxLv);
    world.monsters.push(createMonster(world, rng, { map: mapId, level, ring: 0, x, y }));
  }
}

function createMonster(world, rng, { map, level, ring, x, y }) {
  const scale = ring > 0 ? TUNING.monsterScale : 1.0;
  const hpMax = Math.round((TUNING.monsterHpBase + TUNING.monsterHpPerLevel * level) * scale);
  return {
    id: world.nextMonsterId++,
    map,
    ring,
    level,
    hpMax,
    hp: hpMax,
    atk: Math.round((TUNING.monsterAtkBase + TUNING.monsterAtkPerLevel * level) * scale),
    def: Math.round((TUNING.monsterDefBase + TUNING.monsterDefPerLevel * level) * scale),
    expReward: Math.round(46 + level * 6.5),
    pos: { x, y },
    homePos: { x, y },
    patrolTarget: { x, y },
    patrolRadius: 6.2,
    state: "idle",
    alive: true,
    respawnAtTick: 0,
    aggroTarget: null,
    aggroTimer: 0,
    lastAttackTick: 0,
  };
}

function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

export function triggerPackAggro(world, victimMonster, attackerChar) {
  const radius = 12; // Radius agresi
  for (const m of world.monsters) {
    if (!m.alive || m.map !== victimMonster.map || m.id === victimMonster.id) continue;
    
    const dist = Math.hypot(m.pos.x - victimMonster.pos.x, m.pos.y - victimMonster.pos.y);
    if (dist <= radius) {
      let weakest = attackerChar;
      for (const c of world.characters) {
        if (c.hp <= 0 || c.pos.map !== m.map) continue;
        const distToC = Math.hypot(c.pos.x - m.pos.x, c.pos.y - m.pos.y);
        if (distToC <= radius && c.hp < weakest.hp) {
          weakest = c;
        }
      }
      
      m.aggroTarget = weakest;
      m.aggroTimer = 10; // Agresi bertahan 10 detik
    }
  }
}

export function tickMonsters(world, dt) {
  for (const m of world.monsters) {
    if (!m.alive) continue;

    if (m.aggroTimer > 0 && m.aggroTarget) {
      m.aggroTimer -= dt;
      
      const target = m.aggroTarget;
      if (target.hp <= 0 || target.pos.map !== m.map) {
        m.aggroTimer = 0;
        m.aggroTarget = null;
        continue;
      }

      // Jika target sudah masuk area markas, monster berhenti mengejar
      if (isPointInBase(m.map, target.pos.x, target.pos.y)) {
        m.aggroTimer = 0;
        m.aggroTarget = null;
        
        // Kembali ke posisi awal
        m.patrolTarget.x = m.homePos.x;
        m.patrolTarget.y = m.homePos.y;
        continue;
      }

      const dx = target.pos.x - m.pos.x;
      const dy = target.pos.y - m.pos.y;
      const dist = Math.hypot(dx, dy);

      if (dist > 3.5) {
        const speed = m.isBoss ? 4.5 : 6.0;
        const step = Math.min(dist, speed * dt);
        m.pos.x += (dx / dist) * step;
        m.pos.y += (dy / dist) * step;
      } else {
        if (world.simTick % 10 === 0) {
          const mobDmg = Math.max(5, Math.round(m.atk - target.def * 0.3));
          target.hp -= mobDmg;
          
          const beamColor = m.isBoss ? "#a855f7" : "#f97316";
          world.effects.push({ map: m.map, type: "beam", age: 0, ttl: 0.2, x1: m.pos.x, y1: m.pos.y, x2: target.pos.x, y2: target.pos.y, color: beamColor });
          world.effects.push({ map: m.map, type: "float", age: 0, ttl: 1.0, x: target.pos.x, y: target.pos.y, text: `-${mobDmg}`, color: "#ef4444" });

          if (target.hp <= 0) {
            target.hp = 0;
            target.pos.map = `base_${target.race}`;
            // Pindahkan ke Altar
            const map = MAPS.find(x => x.id === target.pos.map);
            if (map.altar) {
              target.pos.x = map.altar.x;
              target.pos.y = map.altar.y;
            } else {
              target.pos.x = map.anchor.x;
              target.pos.y = map.anchor.y;
            }
            target.recoveryTimer = 15;
            target.aiState = "RETURN_NPC";
            world.logs.unshift({ tick: world.simTick, day: world.day, time: "!!:!!", category: "pvp", message: `💀 ${target.name} dikeroyok ${m.name || 'Monster'}!` });
            m.aggroTimer = 0;
            m.aggroTarget = null;
          }
        }
      }
    } else {
      const dx = m.patrolTarget.x - m.pos.x;
      const dy = m.patrolTarget.y - m.pos.y;
      const d = Math.hypot(dx, dy);

      if (d < 0.5) {
        const angle = Math.random() * Math.PI * 2;
        const radius = Math.random() * m.patrolRadius;
        m.patrolTarget.x = clamp(m.homePos.x + Math.cos(angle) * radius, 8, 94);
        m.patrolTarget.y = clamp(m.homePos.y + Math.sin(angle) * radius, 8, 94);
      } else {
        const speed = 3.0;
        const step = Math.min(d, speed * dt);
        m.pos.x += (dx / d) * step;
        m.pos.y += (dy / d) * step;
      }
    }
  }
}

export function generateLoot(level) {
  // Peluang dapat drop: 50% + bonus level
  const chance = 0.5 + level * 0.01;
  if (Math.random() > chance) return null;

  // 1. Cek Peluang Drop Langka (Hanya untuk Monster Lv 20+)
  if (level >= 20) {
    // Peluang 3% untuk dapat Rare Drop
    const isRare = Math.random() < 0.03; 
    if (isRare) {
      const rarePool = LOOT_RARE;
      const rareItem = rarePool[Math.floor(Math.random() * rarePool.length)];
      return {
        name: `✨ ${rareItem.name}`,
        value: Math.round(rareItem.minValue + Math.random() * (rareItem.maxValue - rareItem.minValue)),
        isRare: true
      };
    }
  }

  // 2. Drop Umum (Common)
  const tier = Math.min(LOOT_COMMON.length - 1, Math.floor(level / 10));
  const base = LOOT_COMMON[tier];
  return {
    name: base.name,
    value: Math.round(base.minValue + Math.random() * (base.maxValue - base.minValue)),
    isRare: false
  };
}

export function spawnBossEvent(world, rng) {
  const targetMap = rng.next() > 0.5 ? "ether" : "elan_plateau";
  const level = targetMap === "ether" ? 45 : 50;
  const x = 50 + (rng.next() * 20 - 10);
  const y = 50 + (rng.next() * 20 - 10);

  const boss = createMonster(world, rng, { map: targetMap, level, ring: 0, x, y });
  
  boss.isBoss = true;
  boss.name = "👑 EVENT BOSS: Frost Wyrm";
  boss.hpMax = 50000;
  boss.hp = 50000;
  boss.atk = 250;
  boss.def = 100;
  boss.expReward = 5000;
  
  world.monsters.push(boss);
  
  world.logs.unshift({ 
    tick: world.simTick, day: world.day, time: "!!:!!", category: "boss", 
    message: `⚠️ EVENT BOSS MUNCUL! "${boss.name}" (Lv.${boss.level}) di ${targetMap.toUpperCase()}!` 
  });
}