// src/ui/map-tabs.js
import { MAPS } from "../config.js";

export function createMapTabs({ container, world, onChange }) {
  container.innerHTML = "";
  const buttons = {};

  MAPS.forEach((map, idx) => {
    const btn = document.createElement("button");
    btn.textContent = `${idx + 1}. ${map.name}`;
    btn.className = "px-3 py-1.5 text-xs rounded border border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800";
    btn.addEventListener("click", () => switchTo(map.id));
    container.appendChild(btn);
    buttons[map.id] = btn;
  });

  function switchTo(mapId) {
    if (!MAPS.find(m => m.id === mapId)) return;
    world.currentMap = mapId;
    updateActive();
    if (onChange) onChange(mapId);
  }

  function updateActive() {
    for (const [id, btn] of Object.entries(buttons)) {
      const active = id === world.currentMap;
      btn.className = active
        ? "px-3 py-1.5 text-xs rounded border border-cyan-500 bg-cyan-950 text-cyan-200"
        : "px-3 py-1.5 text-xs rounded border border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800";
    }
  }

  window.addEventListener("keydown", (e) => {
    const n = parseInt(e.key, 10);
    if (n >= 1 && n <= MAPS.length) switchTo(MAPS[n - 1].id);
  });

  updateActive();
  return { switchTo, updateActive };
}