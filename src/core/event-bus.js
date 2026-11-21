// src/core/event-bus.js
// Event bus sederhana untuk komunikasi antar modul tanpa import silang.

export function createEventBus() {
  const listeners = new Map();
  return {
    on(event, fn) {
      if (!listeners.has(event)) listeners.set(event, new Set());
      listeners.get(event).add(fn);
      return () => listeners.get(event).delete(fn);
    },
    emit(event, payload) {
      const set = listeners.get(event);
      if (set) for (const fn of set) fn(payload);
    },
  };
}