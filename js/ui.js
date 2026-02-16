import { state } from "./state.js";
import { saveTasks } from "./storage.js";

/* ---------- HELPERS ---------- */
const isOverdue = (task) => {
  if (!task.dueDate || task.completed) return false;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const due = new Date(task.dueDate);
  due.setHours(0, 0, 0, 0);

  return due < today;
};

export const formatRelativeTime = (iso) => {
  if (!iso) return "";

  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);

  if (diff < 10) return "Just now";
  if (diff < 60) return `${diff}s ago`;

  const minutes = Math.floor(diff / 60);
  if (minutes < 60) return `${minutes} min ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;

  const days = Math.floor(hours / 24);
  if (days === 1) return "Yesterday";

  return `${days} days ago`;
};

/* ---------- PREVIEW LI (CREATED ONCE) ---------- */
const previewLi = document.createElement("li");
previewLi.className = "preview-item";
previewLi.style.listStyle = "none";

const preview = document.getElementById("taskPreview");
previewLi.appendChild(preview);

/* ---------- TODAY OVERVIEW ---------- */
const updateOverview = () => {
  const total = state.tasks.length;
  const completed = state.tasks.filter(t => t.completed).length;
  const active = total - completed;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const overdue = state.tasks.filter(t => {
    if (!t.dueDate || t.completed) return false;
    const due = new Date(t.dueDate);
    due.setHours(0, 0, 0, 0);
    return due < today;
  }).length;

  document.getElementById("ov-total").textContent = total;
  document.getElementById("ov-completed").textContent = completed;
  document.getElementById("ov-active").textContent = active;
  document.getElementById("ov-overdue").textContent = overdue;
};

/* ---------- RENDER ---------- */
export const render = () => {
  const list = document.getElementById("taskList");
  const emptyState = document.getElementById("emptyState");
  const taskSummary = document.getElementById("taskSummary");

  /* ---------- RESET UI ---------- */
  list.innerHTML = "";
  preview.classList.add("hidden");

  /* ---------- FILTER + SEARCH ---------- */
  const visibleTasks = state.tasks.filter(task => {
    const matchesFilter =
      state.filter === "completed"
        ? task.completed
        : state.filter === "active"
        ? !task.completed
        : true;

    const matchesSearch = task.text
      .toLowerCase()
      .includes(state.search);

    return matchesFilter && matchesSearch;
  });

  /* ---------- SORT (🔥 FIXED FOR MANUAL MODE) ---------- */
  let sorted = [...visibleTasks];

  if (state.sort !== "manual") {
    sorted.sort((a, b) => {
      const timeA = new Date(a.editedAt || a.createdAt).getTime();
      const timeB = new Date(b.editedAt || b.createdAt).getTime();

      return state.sort === "oldest"
        ? timeA - timeB
        : timeB - timeA;
    });
  }

  /* ---------- TASK LIST ---------- */
  sorted.forEach(task => {
    const overdue = isOverdue(task);

    const li = document.createElement("li");
    li.className = `
      task
      priority-${task.priority}
      ${task.completed ? "completed" : ""}
      ${overdue ? "overdue" : ""}
    `;
    li.dataset.id = task.id;

    li.innerHTML = `
      <div class="task-left">
        <input type="checkbox" ${task.completed ? "checked" : ""}>
        <span class="task-text">${task.text}</span>
      </div>

      <div class="task-right">
        <span class="task-time">
          ${formatRelativeTime(task.editedAt || task.createdAt)}
        </span>
        <div class="actions">
          <button class="edit">✏️</button>
          <button class="delete">🗑️</button>
        </div>
      </div>
    `;

    list.appendChild(li);
  });

  /* ---------- STATS ---------- */
  const completed = state.tasks.filter(t => t.completed).length;
  const total = state.tasks.length;

  document.getElementById("numbers").textContent = `${completed} / ${total}`;
  document.getElementById("progress").style.width =
    total ? `${(completed / total) * 100}%` : "0%";

  /* ---------- TODAY OVERVIEW ---------- */
  updateOverview();

  /* ---------- EMPTY STATE ---------- */
  if (sorted.length === 0) {
    list.style.display = "none";
    emptyState.style.display = "block";
    taskSummary.textContent =
      state.filter === "all"
        ? "No tasks yet"
        : `No ${state.filter} tasks`;
    return;
  } else {
    list.style.display = "flex";
    emptyState.style.display = "none";
    taskSummary.textContent =
      `${sorted.length} task${sorted.length > 1 ? "s" : ""}`;
  }

  /* ---------- PREVIEW ---------- */
  const selected = state.tasks.find(t => t.id === state.selectedId);
  if (!selected) return;

  const taskEl = [...list.children].find(
    li => li.dataset.id === selected.id
  );
  if (!taskEl) return;

  const overdue = isOverdue(selected);

  const historyHtml = selected.history
    .slice()
    .reverse()
    .map(h => `
      <li>
        <strong>${h.type}</strong>
        <span>${formatRelativeTime(h.at)}</span>
      </li>
    `)
    .join("");

  preview.innerHTML = `
    <div class="preview-card ${overdue ? "overdue" : ""}">
      <div class="preview-header">
        <h3>${selected.text}</h3>
        <button class="preview-close">✖</button>
      </div>

      <div class="preview-meta">
        Priority: <strong>${selected.priority}</strong><br/>
        Due: <strong>${selected.dueDate || "No date"}</strong><br/>
        Created:
        <strong>${new Date(selected.createdAt).toLocaleString()}</strong>
      </div>

      <div class="preview-history">
        <h4>Activity</h4>
        <ul>${historyHtml}</ul>
      </div>

      <div class="preview-actions">
        <button class="complete">
          ${selected.completed ? "Mark Active" : "Mark Complete"}
        </button>
        <button class="delete">Delete</button>
      </div>
    </div>
  `;

  taskEl.after(previewLi);
  preview.classList.remove("hidden");

  /* ---------- PREVIEW ACTIONS ---------- */
  preview.querySelector(".preview-close").onclick = () => {
    state.selectedId = null;
    render();
  };

  preview.querySelector(".complete").onclick = () => {
    const now = new Date().toISOString();
    selected.completed = !selected.completed;
    selected.editedAt = now;

    selected.history.push({
      type: selected.completed ? "completed" : "reopened",
      at: now
    });

    saveTasks();
    render();
  };

  preview.querySelector(".delete").onclick = () => {
    state.tasks = state.tasks.filter(t => t.id !== selected.id);
    state.selectedId = null;
    saveTasks();
    render();
  };
};
