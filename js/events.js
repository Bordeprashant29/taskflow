import { state } from "./state.js";
import { saveTasks } from "./storage.js";
import { render } from "./ui.js";
import { uuid } from "./utils.js";

/* ---------- ENV ---------- */
const isMobile = () =>
  window.matchMedia("(max-width: 900px)").matches;

/* ---------- UNDO SNAPSHOT ---------- */
let undoTimeout = null;

const saveSnapshot = () => {
  state.lastSnapshot = JSON.parse(JSON.stringify(state.tasks));
};

const undoLastAction = () => {
  if (!state.lastSnapshot) return;

  state.tasks = state.lastSnapshot;
  state.lastSnapshot = null;

  saveTasks();
  render();
};

/* ---------- MOBILE UNDO BUTTON ---------- */
const undoBtn = document.getElementById("undoBtn");

const showUndo = () => {
  if (!isMobile() || !undoBtn) return;

  undoBtn.classList.remove("hidden");

  clearTimeout(undoTimeout);
  undoTimeout = setTimeout(() => {
    undoBtn.classList.add("hidden");
  }, 4000);
};

export const initEvents = () => {
  const taskForm = document.getElementById("taskForm");
  const taskInput = document.getElementById("taskInput");
  const priority = document.getElementById("priority");
  const dueDate = document.getElementById("dueDate");
  const clearBtn = document.getElementById("clearBtn");

  const taskList = document.getElementById("taskList");
  const themeToggle = document.getElementById("themeToggle");
  const searchInput = document.getElementById("searchInput");

  /* ---------- CLEAR FORM ---------- */
  const clearForm = () => {
    taskForm.reset();
    state.editId = null;
  };

  clearBtn?.addEventListener("click", clearForm);

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

    saveSnapshot();
    showUndo();

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

  /* ---------- TASK LIST CLICK ---------- */
  taskList.addEventListener("click", e => {
    const taskEl = e.target.closest(".task");
    if (!taskEl) return;

    const task = state.tasks.find(t => t.id === taskEl.dataset.id);
    if (!task) return;

    const now = new Date().toISOString();

    /* CHECKBOX */
    if (e.target.matches("input[type='checkbox']")) {
      saveSnapshot();
      showUndo();

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
      saveSnapshot();
      showUndo();

      state.tasks = state.tasks.filter(t => t.id !== task.id);

      if (state.editId === task.id) {
        clearForm(); // 🔑 FIX: no stale form data
      }

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

  /* ---------- DRAG & DROP (DESKTOP + MANUAL ONLY) ---------- */
  if (!isMobile()) {
    new Sortable(taskList, {
      animation: 150,
      ghostClass: "drag-ghost",
      filter: "input, button",
      preventOnFilter: false,

      onMove: () => state.sort === "manual",

      onEnd: () => {
        if (state.sort !== "manual") return;

        saveSnapshot();
        showUndo();

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
  }

  /* ---------- TODAY OVERVIEW TOGGLE (MOBILE) ---------- */
  const overviewToggle = document.querySelector(".overview-toggle");
  const overviewCard = document.querySelector(".overview-card");

  overviewToggle?.addEventListener("click", () => {
    overviewCard.classList.toggle("open");
  });

  /* ---------- MOBILE UNDO BUTTON ---------- */
  undoBtn?.addEventListener("click", () => {
    undoLastAction();
    undoBtn.classList.add("hidden");
  });

  /* ---------- KEYBOARD SHORTCUTS ---------- */
  document.addEventListener("keydown", e => {
    const activeEl = document.activeElement;
    const isTyping =
      activeEl.tagName === "INPUT" ||
      activeEl.tagName === "TEXTAREA";

    /* CTRL / CMD + Z */
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
      e.preventDefault();
      undoLastAction();
      return;
    }

    /* ESC */
    if (e.key === "Escape" && state.selectedId) {
      state.selectedId = null;
      render();
    }

    /* / */
    if (e.key === "/" && !isTyping) {
      e.preventDefault();
      taskInput.focus();
    }

    /* CTRL / CMD + K */
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
      e.preventDefault();
      searchInput.focus();
    }
  });
};
