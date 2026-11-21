// src/ui/dashboard.js
import { RACE_NAMES } from "../config.js";

export function createDashboard(world) {
  const logContainer = document.getElementById("world-log");
  const chatContainer = document.getElementById("chat-feed");
  const councilContainer = document.getElementById("council-panel");
  const hallContainer = document.getElementById("hall-of-fame");
  const toastContainer = document.getElementById("toast-container");

  // --- LOGIKA TAB ---
  const tabBtns = document.querySelectorAll(".tab-btn");
  const tabContents = document.querySelectorAll(".tab-content");

  tabBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      // Reset semua style
      tabBtns.forEach(b => {
        b.className = "tab-btn px-3 py-2 text-[11px] font-bold text-slate-500 hover:text-slate-300 whitespace-nowrap";
      });
      tabContents.forEach(c => c.classList.add("hidden"));

      // Aktifkan yang diklik
      btn.className = "tab-btn px-3 py-2 text-[11px] font-bold text-sky-400 border-b-2 border-sky-400 whitespace-nowrap";
      document.getElementById(`tab-${btn.dataset.tab}`).classList.remove("hidden");
    });
  });

  function escapeHtml(str) {
    return String(str ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function showToast(message, color = "text-amber-300") {
    if (!toastContainer) return;
    const el = document.createElement("div");
    el.className = `bg-slate-900 border border-slate-700 px-4 py-2 rounded shadow-lg text-xs font-bold ${color} pointer-events-auto transform transition-transform duration-300 -translate-y-2 opacity-0`;
    el.textContent = message;
    toastContainer.appendChild(el);
    requestAnimationFrame(() => el.classList.remove("-translate-y-2", "opacity-0"));
    setTimeout(() => {
      el.classList.add("-translate-y-2", "opacity-0");
      setTimeout(() => el.remove(), 300);
    }, 4000);
  }

  let lastLogCount = 0;
  function renderLogs() {
    if (!logContainer) return;
    if (world.logs.length > lastLogCount) {
      const newest = world.logs[0];
      if (newest && newest.message.includes("membeli Relic")) showToast(`🌟 ${newest.message}`, "text-yellow-400");
      if (newest && newest.message.includes("CHIP WAR BERAKHIR")) showToast(`🏆 ${newest.message}`, "text-red-400");
      if (newest && newest.message.includes("Rekrutmen")) showToast(`👥 ${newest.message}`, "text-emerald-400");
      lastLogCount = world.logs.length;
    }
    logContainer.innerHTML = world.logs.slice(0, 50).map(log => {
      let color = "text-slate-400";
      if (log.category === "war") color = "text-red-400";
      if (log.category === "pvp") color = "text-rose-400";
      if (log.category === "econ") color = "text-amber-400";
      if (log.category === "boss") color = "text-purple-400";
      return `<div class="${color}"><span class="text-slate-600">[H${log.day}]</span> ${escapeHtml(log.message)}</div>`;
    }).join("");
  }

  function renderChats() {
    if (!chatContainer) return;
    chatContainer.innerHTML = world.chats.slice(-50).map(chat => {
      return `<div><span class="text-sky-400 font-bold">${escapeHtml(chat.sender)}</span>: <span class="text-slate-300">${escapeHtml(chat.text)}</span></div>`;
    }).join("");
    chatContainer.scrollTop = chatContainer.scrollHeight;
  }

    function renderCouncil() {
    if (!councilContainer) return;
    let html = "";
    
    for (const race of ["axion", "belvian", "cyra"]) {
      const r = world.races[race];
      const pop = world.characters.filter(c => c.race === race).length;
      
      const getOfficerName = (id) => {
        if (!id) return "<span class='text-slate-600'>Kosong</span>";
        const c = world.characters.find(x => x.id === id);
        return c ? `${c.name} (Lv.${c.level})` : "<span class='text-slate-600'>Kosong</span>";
      };

      html += `
        <div class="bg-[#050911] p-3 rounded border border-slate-800 mb-3">
          <div class="flex justify-between items-center mb-2">
            <div class="font-bold text-sm" style="color: ${RACE_NAMES[race].color}">${RACE_NAMES[race].name}</div>
            <div class="text-xs font-bold text-emerald-400">Morale: ${r.morale}%</div>
          </div>
          
          <div class="space-y-1 text-[11px] mb-3">
            <div class="flex justify-between"><span class="text-slate-500">Archon</span> <span class="text-yellow-400">${getOfficerName(r.council.archon)}</span></div>
            <div class="flex justify-between"><span class="text-slate-500">Warchon</span> <span class="text-sky-400">${getOfficerName(r.council.warchon)}</span></div>
            <div class="flex justify-between"><span class="text-slate-500">Dewan SER</span> <span class="text-slate-300">${getOfficerName(r.council.ser)}</span></div>
            <div class="flex justify-between"><span class="text-slate-500">Dewan DEF</span> <span class="text-slate-300">${getOfficerName(r.council.def)}</span></div>
            <div class="flex justify-between"><span class="text-slate-500">Dewan SUP</span> <span class="text-slate-300">${getOfficerName(r.council.support)}</span></div>
          </div>

          <div class="flex justify-between text-slate-400 text-[11px] pt-2 border-t border-slate-800">
            <span>Populasi: <span class="text-slate-200">${pop} / 120</span></span>
            <span>Kas: <span class="text-amber-400">${r.treasury.toLocaleString('id-ID')}</span></span>
          </div>
          <div class="w-full bg-slate-900 h-1.5 rounded mt-1 overflow-hidden">
            <div class="bg-amber-500 h-1.5 rounded" style="width: ${Math.min(100, (r.treasury / 1000000) * 100)}%"></div>
          </div>
        </div>`;
    }
    councilContainer.innerHTML = html;
  }

  function renderHall() {
    if (!hallContainer) return;
    const topCp = [...world.characters].sort((a, b) => b.cp - a.cp).slice(0, 5);
    const topPvp = [...world.characters].sort((a, b) => b.pvp - a.pvp).slice(0, 5);

    let html = `<div class="text-[10px] text-slate-500 mb-1">Top 5 CP (Politik)</div>`;
    topCp.forEach((c, i) => {
      html += `<div class="flex justify-between"><span>${i+1}. ${c.name} <span class="text-[9px] text-slate-500">(${c.race})</span></span> <span class="text-amber-400">${c.cp} CP</span></div>`;
    });

    html += `<div class="text-[10px] text-slate-500 mt-3 mb-1">Top 5 PvP (Pembunuh)</div>`;
    topPvp.forEach((c, i) => {
      html += `<div class="flex justify-between"><span>${i+1}. ${c.name} <span class="text-[9px] text-slate-500">(${c.race})</span></span> <span class="text-rose-400">${c.pvp} PvP</span></div>`;
    });

    hallContainer.innerHTML = html;
  }

  function tick() {
    renderLogs();
    renderChats();
    renderCouncil();
    renderHall();
  }

  return { tick, showToast };
}