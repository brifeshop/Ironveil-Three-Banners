// src/ui/dashboard.js
export function createDashboard(world) {
  const logContainer = document.getElementById("world-log");
  const chatContainer = document.getElementById("chat-feed");

  function renderLogs() {
    if (!logContainer) return;
    logContainer.innerHTML = world.logs.slice(0, 50).map(log => {
      let color = "text-slate-400";
      if (log.category === "war") color = "text-red-400";
      if (log.category === "pvp") color = "text-rose-400";
      if (log.category === "econ") color = "text-amber-400";
      
      return `<div class="${color}"><span class="text-slate-600">[Hari ${log.day}]</span> ${log.message}</div>`;
    }).join("");
  }

  function renderChats() {
    if (!chatContainer) return;
    chatContainer.innerHTML = world.chats.slice(-50).map(chat => {
      return `<div><span class="text-sky-400 font-bold">${chat.sender}</span>: <span class="text-slate-300">${chat.text}</span></div>`;
    }).join("");
  }

  function tick() {
    renderLogs();
    renderChats();
  }

  return { tick };
}