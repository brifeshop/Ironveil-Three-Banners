// src/core/time-engine.js
// Fixed timestep + accumulator. Logika tidak bergantung FPS.

import { TICK_MS, MAX_TICKS_PER_FRAME } from "../config.js";

export function createTimeEngine({ onTick }) {
  let accum = 0;
  let speed = 1;
  let lastReal = performance.now();
  let running = true;
  let totalTicks = 0;

  function setSpeed(s) { speed = s; }
  function pause() { running = false; }
  function resume() { running = true; lastReal = performance.now(); }
  function getSpeed() { return speed; }
  function getTotalTicks() { return totalTicks; }

  function frame(now) {
    const deltaReal = now - lastReal;
    lastReal = now;

    if (running) {
      accum += deltaReal * speed;
      let ticks = 0;
      while (accum >= TICK_MS && ticks < MAX_TICKS_PER_FRAME) {
        onTick();
        totalTicks++;
        accum -= TICK_MS;
        ticks++;
      }
      // Jika masih ada sisa accum setelah batas, buang agar tidak menumpuk.
      if (accum >= TICK_MS) accum = TICK_MS;
    }
    requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);

  return { setSpeed, pause, resume, getSpeed, getTotalTicks };
}