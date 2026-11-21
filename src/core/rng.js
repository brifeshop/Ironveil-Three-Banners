// src/core/rng.js
// Seeded PRNG (mulberry32) — deterministik untuk replay & kalibrasi.

export function createRng(seed) {
  let s = seed >>> 0;
  function next() {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  return {
    next,
    randInt(min, max) { return Math.floor(next() * (max - min + 1)) + min; },
    pick(arr) { return arr[Math.floor(next() * arr.length)]; },
  };
}