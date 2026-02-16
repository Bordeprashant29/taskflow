import { state } from "./state.js";
import { saveTasks } from "./storage.js";
import { render } from "./ui.js";
import { uuid } from "./utils.js";

export const initEvents = () => {
  const taskForm = document.getElementById("taskForm");
  const taskInput = document.getElementById("taskInput");
  const priority = document.getElementById("priority");
  const dueDate = document.getElementById("dueDate");
  const taskList = document.getElementById("taskList");
  const themeToggle = document.getElementById("themeToggle");
  const searchInput = document.getElementById("searchInput");

  /* ---------- SEARCH ---------- */
  searchInput.addEventListener("input", e => {
    state.search = e.target.value.toLowerCase();
    state.selectedId = null;
    render();
  });

  /* ---------- ADD / EDIT TASK ---------- */
  taskForm.addEventListener("submit", e => {
    e.preventDefault();

    const text = taskInput.value.trim();
    if (!text) return;

    const now = new Date().toISOString();

    if (state.editId) {
      const task = state.tasks.find(t => t.id === state.editId);
      if (!task) return;

      task.text = text;
      task.priority = priority.value;
      task.dueDate = dueDate.value;
      task.editedAt = now;
      task.history.push({ type: "edited", at: now });

      state.editId = null;
    } else {
      state.tasks.push({
        id: uuid(),
        text,
        completed: false,
        priority: priority.value,
        dueDate: dueDate.value,
        createdAt: now,
        editedAt: null,
        history: [{ type: "created", at: now }]
      });
    }

    taskForm.reset();
    saveTasks();
    render();
  });

  /* ---------- TASK LIST CLICK HANDLER ---------- */
  taskList.addEventListener("click", e => {
    const taskEl = e.target.closest(".task");
    if (!taskEl) return;

    const task = state.tasks.find(t => t.id === taskEl.dataset.id);
    if (!task) return;

    const now = new Date().toISOString();

    /* CHECKBOX */
    if (e.target.matches("input[type='checkbox']")) {
      task.completed = e.target.checked;
      task.editedAt = now;

      task.history.push({
        type: task.completed ? "completed" : "reopened",
        at: now
      });

      saveTasks();
      render();
      return;
    }

    /* EDIT */
    if (e.target.classList.contains("edit")) {
      taskInput.value = task.text;
      priority.value = task.priority;
      dueDate.value = task.dueDate || "";
      state.editId = task.id;
      return;
    }

    /* DELETE */
    if (e.target.classList.contains("delete")) {
      state.tasks = state.tasks.filter(t => t.id !== task.id);
      state.selectedId = null;
      saveTasks();
      render();
      return;
    }

    /* TASK BODY → PREVIEW */
    state.selectedId =
      state.selectedId === task.id ? null : task.id;

    render();
  });

  /* ---------- FILTERS ---------- */
  document.querySelectorAll(".filter-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document
        .querySelectorAll(".filter-btn")
        .forEach(b => b.classList.remove("active"));

      btn.classList.add("active");
      state.filter = btn.dataset.filter;
      state.selectedId = null;
      render();
    });
  });

  /* ---------- SORT BUTTONS ---------- */
  document.querySelectorAll(".sort-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document
        .querySelectorAll(".sort-btn")
        .forEach(b => b.classList.remove("active"));

      btn.classList.add("active");
      state.sort = btn.dataset.sort;
      render();
    });
  });

  /* ---------- THEME ---------- */
  themeToggle.addEventListener("click", () => {
    const next =
      document.body.dataset.theme === "dark" ? "light" : "dark";

    document.body.dataset.theme = next;
    localStorage.setItem("theme", next);
  });

  /* ---------- DRAG & DROP (MANUAL ONLY) ---------- */
  new Sortable(taskList, {
    animation: 150,
    ghostClass: "drag-ghost",
    filter: "input, button",
    preventOnFilter: false,

    onMove: () => state.sort === "manual",

    onEnd: () => {
      if (state.sort !== "manual") return;

      const ids = [...taskList.children]
        .filter(el => el.classList.contains("task"))
        .map(li => li.dataset.id);

      state.tasks.sort(
        (a, b) => ids.indexOf(a.id) - ids.indexOf(b.id)
      );

      saveTasks();
      render();
    }
  });

  /* ---------- KEYBOARD SHORTCUTS ---------- */
  document.addEventListener("keydown", e => {
    const activeEl = document.activeElement;
    const isTyping =
      activeEl.tagName === "INPUT" ||
      activeEl.tagName === "TEXTAREA";

    /* ESC → close preview */
    if (e.key === "Escape" && state.selectedId) {
      state.selectedId = null;
      render();
      return;
    }

    /* / → focus task input */
    if (e.key === "/" && !isTyping) {
      e.preventDefault();
      taskInput.focus();
      return;
    }

    /* Ctrl / Cmd + K → focus search */
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
      e.preventDefault();
      searchInput.focus();
      return;
    }

    /* Navigation requires a selected task */
    if (!state.selectedId) return;

    const visibleTasks = [...document.querySelectorAll(".task")];
    const currentIndex = visibleTasks.findIndex(
      t => t.dataset.id === state.selectedId
    );

    /* Arrow Down */
    if (e.key === "ArrowDown") {
      e.preventDefault();
      const next = visibleTasks[currentIndex + 1];
      if (next) {
        state.selectedId = next.dataset.id;
        render();
      }
    }

    /* Arrow Up */
    if (e.key === "ArrowUp") {
      e.preventDefault();
      const prev = visibleTasks[currentIndex - 1];
      if (prev) {
        state.selectedId = prev.dataset.id;
        render();
      }
    }

    /* Space → toggle completion */
    if (e.key === " " && !isTyping) {
      e.preventDefault();
      const task = state.tasks.find(t => t.id === state.selectedId);
      if (!task) return;

      const now = new Date().toISOString();
      task.completed = !task.completed;
      task.editedAt = now;

      task.history.push({
        type: task.completed ? "completed" : "reopened",
        at: now
      });

      saveTasks();
      render();
    }
  });
};
