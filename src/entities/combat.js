// src/entities/combat.js
// Rumus damage, kritikal, dan resolusi serangan.

import { addExp } from "./characters.js";

export function computeDamage(attacker, defender, rng) {
  const variance = 0.9 + rng.next() * 0.2; // U(0.9, 1.1)
  let dmg = Math.max(1, attacker.atk * variance - 0.5 * defender.def);
  const crit = rng.next() < 0.05;
  if (crit) dmg *= 1.5;
  return { dmg: Math.round(dmg), crit };
}

// Karakter menyerang monster. Return: { killed, dmg, crit }
export function characterAttackMonster(world, character, monster, rng) {
  if (!monster.alive) return { killed: false, dmg: 0, crit: false };
  const { dmg, crit } = computeDamage(character, monster, rng);
  monster.hp -= dmg;
  if (monster.hp <= 0) {
    monster.alive = false;
    monster.respawnAtTick = world.simTick + 20 * 10; // 20 detik sim (10 tick/detik)
    const expGain = Math.round(30 + 6 * Math.pow(monster.level, 1.4));
    addExp(character, expGain);
    character.gold += Math.round(4 * Math.pow(monster.level, 1.5));
    return { killed: true, dmg, crit };
  }
  return { killed: false, dmg, crit };
}

// Respawn monster yang sudah waktunya.
export function tickMonsterRespawn(world) {
  for (const m of world.monsters) {
    if (!m.alive && world.simTick >= m.respawnAtTick) {
      m.alive = true;
      m.hp = m.hpMax;
      m.pos.x = m.spawnPos.x;
      m.pos.y = m.spawnPos.y;
    }
  }
}