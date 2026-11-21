// src/main.js
import { GAME_TITLE, MAPS, RELIC_UPGRADE, RACE_NAMES, TUNING, GEAR_TIERS } from "./config.js";
import { createTimeEngine } from "./core/time-engine.js";
import { createRng } from "./core/rng.js";
import { createWorld, logEvent } from "./core/world.js";
import { spawnInitialCharacters, checkLevelUp, getNextGear, checkAscension, createCharacter } from "./entities/characters.js";
import { spawnAllMonsters, tickMonsters, generateLoot, spawnBossEvent, triggerPackAggro } from "./entities/monsters.js";
import { createRadar } from "./ui/radar.js";
import { createMapTabs } from "./ui/map-tabs.js";
import { startChipWar, tickWar } from "./systems/war.js";
import { runElection, getArchonStrategy } from "./systems/politics.js";
import { isInSafeZone } from "./systems/map-logic.js";
import { createDashboard } from "./ui/dashboard.js";
import { saveWorld, loadWorld } from "./core/storage.js";
import { tickSquads } from "./systems/squads.js";

const seed = Date.now() >>> 0;
const rng = createRng(seed);
const savedData = loadWorld();
let world;

if (savedData) {
  world = savedData;
  world.events = createWorld(seed).events;
} else {
  world = createWorld(seed);
  spawnInitialCharacters(world, rng, 10);
  spawnAllMonsters(world, rng);
  logEvent(world, "init", `Dunia Baru: ${world.characters.length} karakter, ${world.monsters.length} monster.`);
}
world.effects = [];

document.getElementById("title").textContent = GAME_TITLE;

const canvas = document.getElementById("radar");
const inspector = document.getElementById("inspector");
let selectedCharId = null;
let selectedMonsterId = null;

function renderWorldOverview() {
  const races = ["axion", "belvian", "cyra"];
  let html = `<div class="text-xs space-y-3">`;
  
  for (const r of races) {
    const chars = world.characters.filter(c => c.race === r);
    const pop = chars.length;
    if (pop === 0) continue;
    
    const avgLv = (chars.reduce((s, c) => s + c.level, 0) / pop).toFixed(1);
    const totalAtk = chars.reduce((s, c) => s + c.atk, 0);
    const relics = chars.filter(c => c.relic && c.relic.owned).length;
    
    const isChamp = world.war.defendingChampion === r;
    const champBadge = isChamp ? `<span class="bg-amber-500/20 text-amber-400 border border-amber-500/30 px-1.5 py-0.5 rounded text-[9px] font-bold ml-1">JUARA</span>` : "";

    html += `
      <div class="bg-[#050911] p-3 rounded border border-slate-800">
        <div class="font-bold mb-1" style="color: ${RACE_NAMES[r].color}">${RACE_NAMES[r].name} ${champBadge}</div>
        <div class="grid grid-cols-2 gap-y-1 text-slate-400">
          <div>Populasi:</div><div class="text-right text-slate-200">${pop} / 120</div>
          <div>Rata-rata Lv:</div><div class="text-right text-slate-200">${avgLv}</div>
          <div>Total ATK:</div><div class="text-right text-rose-400">${Math.round(totalAtk).toLocaleString('id-ID')}</div>
          <div>Pemilik Relic:</div><div class="text-right text-yellow-400">${relics}</div>
        </div>
      </div>
    `;
  }
  html += `</div>`;
  inspector.innerHTML = html;
}

function updateInspector() {
  if (!selectedCharId) return;
  const c = world.characters.find(x => x.id === selectedCharId);
  if (!c) {
    inspector.innerHTML = "Karakter tidak ditemukan.";
    selectedCharId = null;
    return;
  }

  const gear = GEAR_TIERS[c.gearTierIndex] || GEAR_TIERS[0];
  const gearText = c.upgradePlus > 0 ? `${gear.name} +${c.upgradePlus}` : gear.name;
  
  const relicText = c.relic.owned ? `<div class="text-yellow-400">Relic: +${c.relic.tier || 0} (Talic: ${c.talic})</div>` : "";
  const neededExp = Math.round(60 * Math.pow(c.level, 1.7));

  let squadText = "";
  if (c.squadId) {
    const squad = world.squads.find(s => s.id === c.squadId);
    if (squad) squadText = `<div class="text-purple-400 text-xs mt-1">🔗 Regu: ${squad.name} (${squad.members.length} org)</div>`;
  }
  
  inspector.innerHTML = `
    <div class="text-slate-200 font-semibold mb-1">${c.name}</div>
    <div>${c.race} · ${c.role} · ${c.archetype}</div>
    <div>Lv ${c.level} · HP ${Math.round(c.hp)}/${c.hpMax}</div>
    <div>EXP: ${Math.floor(c.exp)} / ${neededExp}</div>
    <div class="text-slate-400 mt-1">Gear: ${gearText}</div>
    <div>ATK ${c.atk.toFixed(1)} · DEF ${c.def.toFixed(1)}</div>
    <div>CP ${c.cp} · PvP ${c.pvp} · Gold ${c.gold}</div>
    ${relicText}
    ${squadText}
    <div class="text-cyan-300 mt-1 font-bold">Tas Loot (${c.lootBag.length}/6):</div>
    <div class="text-[10px] text-slate-400">
      ${c.lootBag.length === 0 ? "Kosong" : c.lootBag.map(item => `<div>${item.isRare ? '<span class="text-yellow-400 font-bold">' : ''}${item.name} (${item.value}G)${item.isRare ? '</span>' : ''}</div>`).join('')}
    </div>
  `;
}

function updateMonsterInspector() {
  if (!selectedMonsterId) return;
  const m = world.monsters.find(x => x.id === selectedMonsterId);
  
  if (!m || !m.alive) {
    inspector.innerHTML = "Monster telah tewas.";
    selectedMonsterId = null;
    return;
  }

  inspector.innerHTML = `
    <div class="text-slate-200 font-semibold mb-1">${m.name || "Monster"}</div>
    <div>Lv ${m.level} · Ring ${m.ring > 0 ? m.ring : "Zona"}</div>
    <div>HP ${Math.round(m.hp)}/${m.hpMax}</div>
    <div>ATK ${m.atk} · DEF ${m.def}</div>
    <div>EXP Reward: ${m.expReward}</div>
  `;
}

const radar = createRadar({
  canvas,
  world,
  onSelectCharacter: (c) => {
    selectedCharId = c.id;
    selectedMonsterId = null;
    updateInspector();
  },
  onSelectMonster: (m) => {
    selectedMonsterId = m.id;
    selectedCharId = null;
    updateMonsterInspector();
  },
});

createMapTabs({
  container: document.getElementById("map-tabs"),
  world,
  onChange: () => radar.render(),
});

const dashboard = createDashboard(world);

function pushEffect(map, type, payload) {
  if (!Array.isArray(world.effects)) world.effects = [];
  if (world.effects.length > 120) world.effects.shift();
  world.effects.push({ map, type, age: 0, ttl: type === "beam" ? 0.2 : 1.0, ...payload });
}

function tickEffects(dt) {
  if (!Array.isArray(world.effects)) return;
  world.effects = world.effects.filter(e => {
    e.age += dt;
    return e.age < e.ttl;
  });
}

function placeAtAltar(c) {
  const map = MAPS.find(m => m.id === c.pos.map);
  if (map.altar) {
    c.pos.x = map.altar.x;
    c.pos.y = map.altar.y;
  } else if (map.altars) {
    const myAltar = map.altars.find(a => a.race === c.race || a.race === "all") || map.altars[0];
    c.pos.x = myAltar.x;
    c.pos.y = myAltar.y;
  } else {
    c.pos.x = map.anchor?.x || 50;
    c.pos.y = map.anchor?.y || 50;
  }
}

function step() {
  world.simTick++;
  
  if (world.simTick % 100 === 0) {
    const aliveChars = world.characters.filter(c => c.hp > 0);
    if (aliveChars.length > 0) {
      const speaker = aliveChars[Math.floor(Math.random() * aliveChars.length)];
      const phrases = ["Ayo kita grind ke Ring 4!", "Hati-hati, ras musuh berkumpul.", "Butuh potion nih, ke NPC dulu.", "Semoga Archon kita segera terpilih.", "Chip Axion pasti kita hancurkan!"];
      world.chats.push({ sender: speaker.name, text: phrases[Math.floor(Math.random() * phrases.length)] });
      if (world.chats.length > 100) world.chats.shift();
    }
  }

  const dt = 0.1;

  tickMonsters(world, dt);
  tickSquads(world, dt);
  tickEffects(dt);
  tickWar(world, dt);

  world.electionTimer -= dt;
  if (world.electionTimer <= 0) {
    runElection(world);
    world.electionTimer = 180;
  }

  if (world.simTick % 18000 === 0 && world.simTick > 0) {
    spawnBossEvent(world, rng);
  }

  if (world.simTick % 6000 === 0) {
    world.day++;
    startChipWar(world);
    dashboard.showToast("⚠️ HARI BARU: CHIP WAR DIPICU!", "text-red-400");
    
    const champ = world.war.defendingChampion;
    if (champ) {
      world.logs.unshift({ tick: world.simTick, day: world.day, time: "!!:!!", category: "war", message: `⚔️ ALIANSI 2-VS-1! Ras ${RACE_NAMES[champ].name} (Juara Bertahan) diserang oleh 2 ras lainnya!` });
    }

    for (const race of ["axion", "belvian", "cyra"]) {
      if (race === champ) continue;
      const strat = getArchonStrategy(world, race);
      let stratText = "";
      if (strat === "AGRESSIVE") stratText = "Fokus bunuh musuh (Agresif)";
      if (strat === "CHIP_FOCUS") stratText = "Fokus hancurkan Chip (Ambisius)";
      if (strat === "DEFENSIVE") stratText = "Bertahan & Lindungi Chip (Setia)";
      if (strat === "OPPORTUNIST") stratText = "Serang yang lemah (Pedagang)";
      if (strat === "BALANCED") stratText = "Seimbang (Tidak ada Archon)";
      world.logs.unshift({ tick: world.simTick, day: world.day, time: "!!:!!", category: "war", message: `📢 Strategi ${RACE_NAMES[race].name}: ${stratText}` });
    }
  }

  for (const c of world.characters) {
    if (c.recoveryTimer > 0) {
      c.recoveryTimer -= dt;
      if (c.recoveryTimer <= 0) {
        c.hp = c.hpMax;
        c.aiState = "RETURN_NPC";
      } else {
        continue;
      }
    }

    if (c.hp <= 0) continue;
    if (c.pos.map === "crag_mine") continue;

    if (world.war.active && c.level >= 30) {
      c.pos.map = "crag_mine";
      const cragMap = MAPS.find(m => m.id === "crag_mine");
      const myPortal = cragMap.portals.find(p => p.race === c.race);
      c.pos.x = myPortal.x;
      c.pos.y = myPortal.y;
      c.aiState = "WAR";
      continue;
    }

    checkLevelUp(c);
    checkAscension(world, c);

    const council = world.races[c.race].council;
    let buffMult = 1.0;
    if (c.id === council.archon) buffMult = 1.5;
    else if (c.id === council.warchon) buffMult = 1.2;
    else if (c.id === council.ser && c.role === "SER") buffMult = 1.15;
    else if (c.id === council.def && c.role === "DEF") buffMult = 1.15;
    else if (c.id === council.support && c.role === "SUP") buffMult = 1.15;
    c.currentBuff = buffMult;

    const nextGear = getNextGear(c);
    const canBuyGear = nextGear && c.gold >= nextGear.cost;
    const canBuyRelic = !c.relic.owned && c.pvp >= 5000;

    let canUpgradeRelic = false;
    if (c.relic.owned && (c.relic.tier || 0) < 7) {
      const tier = c.relic.tier || 0;
      const pvpCost = RELIC_UPGRADE.pvpCostBase + tier * RELIC_UPGRADE.pvpCostPerLevel;
      const goldCost = RELIC_UPGRADE.goldCostBase * (tier + 1);
      if (c.pvp >= pvpCost && c.gold >= goldCost && c.talic >= RELIC_UPGRADE.talicCost) {
        canUpgradeRelic = true;
      }
    }
    
    if ((c.lootBag.length >= 4 || canBuyGear || canBuyRelic || canUpgradeRelic) && c.aiState !== "RETURN_NPC") {
      c.aiState = "RETURN_NPC";
    }

    if (c.aiState === "RETURN_NPC") {
      const map = MAPS.find(m => m.id === c.pos.map);
      let targetNpc = map.anchor;
      if ((canBuyRelic || canUpgradeRelic) && map.npcPvp) targetNpc = map.npcPvp;
      if (map.npc) targetNpc = map.npc;

      if (!targetNpc) { c.aiState = "GRINDING"; continue; }

      const dx = targetNpc.x - c.pos.x;
      const dy = targetNpc.y - c.pos.y;
      const dist = Math.hypot(dx, dy);

      if (dist > 2) {
        const step = Math.min(dist, 5.0 * dt);
        c.pos.x += (dx / dist) * step;
        c.pos.y += (dy / dist) * step;
      } else {
        if (canBuyRelic) {
          c.pvp -= 5000;
          c.relic.owned = true;
          c.atk *= 2.05;
          world.logs.unshift({ tick: world.simTick, day: world.day, time: "!!:!!", category: "pvp", message: `⚔️✨ ${c.name} membeli Relic!` });
        }
        if (canUpgradeRelic) {
          const tier = c.relic.tier || 0;
          c.pvp -= (RELIC_UPGRADE.pvpCostBase + tier * RELIC_UPGRADE.pvpCostPerLevel);
          c.gold -= (RELIC_UPGRADE.goldCostBase * (tier + 1));
          c.talic -= RELIC_UPGRADE.talicCost;
          if (Math.random() < RELIC_UPGRADE.successRates[tier]) {
            c.relic.tier = tier + 1;
            c.atk += 26;
            world.logs.unshift({ tick: world.simTick, day: world.day, time: "!!:!!", category: "pvp", message: `🔥✨ [TEMPA SUKSES] ${c.name} Relic +${c.relic.tier}!` });
          } else {
            world.logs.unshift({ tick: world.simTick, day: world.day, time: "!!:!!", category: "pvp", message: `💥 [GAGAL] ${c.name} gagal tempa.` });
          }
        }
        if (canBuyGear) {
          c.gold -= nextGear.cost;
          c.gearTierIndex = nextGear.index;
          c.atk += nextGear.atkBonus;
          c.def += nextGear.defBonus;
          world.logs.unshift({ tick: world.simTick, day: world.day, time: "!!:!!", category: "econ", message: `🛡️ ${c.name} beli ${nextGear.name}.` });
        }
        
        if (c.lootBag.length > 0) {
          let totalGold = 0;
          for (const item of c.lootBag) totalGold += item.value;
          
          const tax = Math.round(totalGold * 0.35);
          c.gold += (totalGold - tax);
          c.lootBag = [];
          
          const raceObj = world.races[c.race];
          raceObj.treasury += tax;

          pushEffect(c.pos.map, "float", { x: c.pos.x, y: c.pos.y, text: `+${totalGold - tax}G`, color: "#facc15" });

          if (raceObj.treasury >= 1000000) {
            raceObj.treasury -= 1000000;
            const pop = world.characters.filter(x => x.race === c.race).length;
            if (pop < 120) {
              const newName = c.race.substring(0,3).toUpperCase() + "_" + Math.floor(Math.random()*900 + 100);
              const newChar = createCharacter(world, rng, { 
                race: c.race, name: newName, role: "SER", archetype: "Prajurit Setia", level: 1 
              });
              world.characters.push(newChar);
              world.logs.unshift({ tick: world.simTick, day: world.day, time: "!!:!!", category: "econ", message: `👥 Rekrutmen! ${RACE_NAMES[c.race].name} merekrut prajurit baru: ${newChar.name}` });
            }
          }
        }
        
        if (c.gold >= 300) {
          const buyCount = Math.min(5 - c.potions, Math.floor(c.gold / 300));
          if (buyCount > 0) { c.gold -= buyCount * 300; c.potions += buyCount; }
        }
        c.aiState = "GRINDING";
      }
      continue;
    }

    if (c.pos.map === "ether" && !isInSafeZone(c)) {
      let enemy = null, minDist = 15;
      for (const e of world.characters) {
        if (e.id === c.id || e.race === c.race || e.pos.map !== "ether" || e.hp <= 0) continue;
        if (isInSafeZone(e)) continue;
        const d = Math.hypot(e.pos.x - c.pos.x, e.pos.y - c.pos.y);
        if (d < minDist) { minDist = d; enemy = e; }
      }
      if (enemy) {
        if (world.simTick - c.lastAttackTick >= 10) {
          c.lastAttackTick = world.simTick;
          const dmg = Math.max(10, Math.round(c.atk - enemy.def * 0.5));
          enemy.hp -= dmg;
          pushEffect(c.pos.map, "beam", { x1: c.pos.x, y1: c.pos.y, x2: enemy.pos.x, y2: enemy.pos.y, color: "#ef4444" });
          if (enemy.hp <= 0) {
            enemy.cp -= Math.floor(enemy.cp * 0.15);
            enemy.pvp -= Math.floor(enemy.pvp * 0.15);
            c.pvp += 100;
            enemy.hp = 0;
            
            placeAtAltar(enemy);
            enemy.recoveryTimer = 15;
            world.logs.unshift({ tick: world.simTick, day: world.day, time: "!!:!!", category: "pvp", message: `⚔️ ${c.name} bunuh ${enemy.name} (Ether).` });
          }
        }
        continue;
      }
    }

    const target = findNearestMonster(world, c);
    if (!target) continue;

    const dx = target.pos.x - c.pos.x;
    const dy = target.pos.y - c.pos.y;
    const dist = Math.hypot(dx, dy);

    if (dist > 4.5) {
      const step = Math.min(dist, 5.0 * dt);
      c.pos.x += (dx / dist) * step;
      c.pos.y += (dy / dist) * step;
    } else {
      if (world.simTick - c.lastAttackTick >= 10) {
        c.lastAttackTick = world.simTick;
        
        let squadBonus = 1.0;
        if (c.squadId) {
          const squad = world.squads.find(s => s.id === c.squadId);
          if (squad) {
            const nearbyAlly = world.characters.some(o => 
              o.id !== c.id && 
              o.hp > 0 && 
              squad.members.includes(o.id) && 
              Math.hypot(o.pos.x - c.pos.x, o.pos.y - c.pos.y) < 10
            );
            if (nearbyAlly) squadBonus = 1.1;
          }
        }

        const dmg = Math.max(1, Math.round((c.atk * (c.currentBuff || 1) * squadBonus) - 0.5 * target.def));
        target.hp -= dmg;
        pushEffect(c.pos.map, "beam", { x1: c.pos.x, y1: c.pos.y, x2: target.pos.x, y2: target.pos.y, color: "#38bdf8" });
        
        triggerPackAggro(world, target, c);

        if (target.hp <= 0) {
          target.alive = false;
          target.respawnAtTick = world.simTick + (TUNING.monsterRespawnSeconds * 10);
          
          const levelDiff = target.level - c.level;
          let canGetExp = false;
          let expMult = 1.0;

          if (target.isBoss) {
            canGetExp = true; expMult = 1.0;
          } else if (levelDiff >= 3) {
            canGetExp = true; expMult = 1.5;
          } else if (levelDiff >= -3) {
            canGetExp = true; expMult = 1.0;
          } else if (levelDiff < -3) {
            canGetExp = true; expMult = 0.1;
          }

          if (canGetExp) {
            c.exp += Math.round(target.expReward * expMult);
            if (target.isBoss) {
              c.talic += 2;
              pushEffect(c.pos.map, "float", { x: target.pos.x, y: target.pos.y, text: `+2 TALIC`, color: "#a855f7" });
              world.logs.unshift({ tick: world.simTick, day: world.day, time: "!!:!!", category: "boss", message: `🏆 ${c.name} bunuh Boss (+2 Talic)!` });
            } else if (levelDiff >= -3) {
              const loot = generateLoot(target.level);
              if (loot && c.lootBag.length < 6) {
                c.lootBag.push(loot);
                if (loot.isRare) {
                  pushEffect(c.pos.map, "float", { x: target.pos.x, y: target.pos.y, text: loot.name, color: "#facc15" });
                  world.logs.unshift({ 
                    tick: world.simTick, day: world.day, time: "!!:!!", category: "econ", 
                    message: `💰 DROP LANGKA! ${c.name} mendapatkan ${loot.name} senilai ${loot.value.toLocaleString('id-ID')} Gold dari ${target.name || 'Monster'}!` 
                  });
                }
              }
            }
          } else {
             pushEffect(c.pos.map, "float", { x: target.pos.x, y: target.pos.y, text: `0 EXP`, color: "#64748b" });
          }
        }

        if (target.hp > 0 && world.simTick % 10 === 0) {
           const mobDmg = Math.max(5, Math.round(target.atk - c.def * 0.3));
           c.hp -= (target.isBoss ? mobDmg * 1.5 : mobDmg);
           
           const beamColor = target.isBoss ? "#a855f7" : "#f97316";
           pushEffect(c.pos.map, "beam", { x1: target.pos.x, y1: target.pos.y, x2: c.pos.x, y2: c.pos.y, color: beamColor });
           pushEffect(c.pos.map, "float", { x: c.pos.x, y: c.pos.y, text: `-${mobDmg}`, color: "#ef4444" });

           if (c.hp <= 0) {
             c.hp = 0;
             const respawnMap = c.pos.map === "crag_mine" ? `base_${c.race}` : c.pos.map;
             c.pos.map = respawnMap;
             placeAtAltar(c);
             c.recoveryTimer = 15;
             c.aiState = "RETURN_NPC";
             world.logs.unshift({ tick: world.simTick, day: world.day, time: "!!:!!", category: "pvp", message: `💀 ${c.name} tewas oleh ${target.name || 'Monster'}!` });
             break;
          }
        }
      }
    }
  }

  for (const m of world.monsters) {
    if (!m.alive && world.simTick >= m.respawnAtTick) {
      m.alive = true;
      m.hp = m.hpMax;
      m.pos.x = m.homePos.x;
      m.pos.y = m.homePos.y;
    }
  }
}

function findNearestMonster(world, c) {
  let best = null, bestDist = Infinity;
  for (const m of world.monsters) {
    if (!m.alive || m.map !== c.pos.map) continue;
    const dx = m.pos.x - c.pos.x, dy = m.pos.y - c.pos.y;
    const d = dx * dx + dy * dy;
    if (d < bestDist) { bestDist = d; best = m; }
  }
  return best;
}

const engine = createTimeEngine({ onTick: step });

function renderLoop() {
  radar.render();
  requestAnimationFrame(renderLoop);
}
renderLoop();

setInterval(() => {
  const totalSimSeconds = world.simTick / 10; 
  const dayElapsed = totalSimSeconds % 600; 
  const totalMinutes = Math.floor((dayElapsed / 600) * 24 * 60);
  const hh = String(Math.floor(totalMinutes / 60) % 24).padStart(2, '0');
  const mm = String(totalMinutes % 60).padStart(2, '0');

  document.getElementById("hud-day").textContent = world.day;
  document.getElementById("hud-time").textContent = `${hh}:${mm}`;

  const labelEl = document.getElementById("hud-war-label");
  const countdownEl = document.getElementById("hud-war-countdown");
  const statusEl = document.getElementById("hud-war-status");
  const championEl = document.getElementById("hud-champion");

  if (world.war.active) {
    labelEl.textContent = "Sisa Waktu War";
    const warElapsed = world.war.elapsed || 0;
    const warRemaining = Math.max(0, 120 - warElapsed);
    
    const wm = String(Math.floor(warRemaining / 60)).padStart(2, '0');
    const ws = String(Math.floor(warRemaining % 60)).padStart(2, '0');
    
    countdownEl.textContent = `${wm}:${ws}`;
    countdownEl.className = "text-red-500 font-bold animate-pulse";
    statusEl.textContent = "WAR AKTIF";
    statusEl.className = "text-red-400 font-bold";
  } else {
    labelEl.textContent = "War Berikutnya";
    const ticksInDay = 6000; 
    const ticksIntoDay = world.simTick % ticksInDay;
    const ticksRemaining = ticksInDay - ticksIntoDay;
    const secondsRemaining = Math.ceil(ticksRemaining / 10);
    
    const warMin = String(Math.floor(secondsRemaining / 60)).padStart(2, '0');
    const warSec = String(secondsRemaining % 60).padStart(2, '0');
    
    countdownEl.textContent = `${warMin}:${warSec}`;
    countdownEl.className = "text-amber-400 font-bold";
    statusEl.textContent = "DAMAI / GRINDING";
    statusEl.className = "text-emerald-400 font-bold";
  }

  if (world.war.defendingChampion) {
    const champRace = world.war.defendingChampion;
    championEl.innerHTML = `Juara: <span style="color: ${RACE_NAMES[champRace].color}">${RACE_NAMES[champRace].short}</span>`;
  } else {
    championEl.textContent = "Juara: NIHIL";
  }

  dashboard.tick();

  if (!selectedCharId && !selectedMonsterId) {
    renderWorldOverview();
  } else {
    updateInspector();
    updateMonsterInspector();
  }

  const chipBars = document.getElementById("chip-hp-bars");
  if (world.currentMap === "crag_mine" && world.war.active) {
    chipBars.classList.remove("hidden");
    for (const race of ["axion", "belvian", "cyra"]) {
      const hp = world.war.chipHp[race] || 0;
      const pct = Math.max(0, (hp / 30000) * 100);
      document.getElementById(`chip-bar-${race}`).style.width = `${pct}%`;
    }
  } else {
    chipBars.classList.add("hidden");
  }
}, 250);

let paused = false;
window.addEventListener("keydown", (e) => {
  if (e.key === "p" || e.key === "P") {
    paused = !paused;
    if (paused) engine.pause(); else engine.resume();
  }
  if (e.key === "+" || e.key === "=") engine.setSpeed(Math.min(10, engine.getSpeed() * 2));
  if (e.key === "-" || e.key === "_") engine.setSpeed(Math.max(1, engine.getSpeed() / 2));
});

document.getElementById("btnTestWar").addEventListener("click", () => {
  world.characters.forEach(c => { c.level = 30; c.hp = c.hpMax; });
  startChipWar(world);
  world.currentMap = "crag_mine";
  radar.render();
});

document.getElementById("btnReset").addEventListener("click", () => {
  if (confirm("Hapus semua progres dan mulai dunia baru?")) {
    localStorage.removeItem("ironveil_save_v1");
    window.location.reload();
  }
});

setInterval(() => { saveWorld(world); }, 15000);
renderWorldOverview();