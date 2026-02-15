import { loadTasks } from "./storage.js";
import { render } from "./ui.js";
import { initEvents } from "./events.js";

/* ---------- INIT ---------- */
loadTasks();
render();
initEvents();

/* ---------- AUTO UPDATE RELATIVE TIME ---------- */
setInterval(() => {
  render();
}, 60000); // every 1 minute
