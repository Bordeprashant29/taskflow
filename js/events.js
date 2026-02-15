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
  searchInput?.addEventListener("input", e => {
    state.search = e.target.value.toLowerCase();
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

  /* ---------- TASK LIST EVENTS ---------- */
  taskList.addEventListener("click", e => {
    const li = e.target.closest(".task");
    if (!li) return;

    const task = state.tasks.find(t => t.id === li.dataset.id);
    if (!task) return;

    const now = new Date().toISOString();

    /* ✅ CHECKBOX ONLY */
    if (e.target.matches("input[type='checkbox']")) {
      e.stopPropagation();

      task.completed = !task.completed;
      task.editedAt = now;

      task.history.push({
        type: task.completed ? "completed" : "reopened",
        at: now
      });

      saveTasks();
      render();
      return;
    }

    /* ✅ EDIT BUTTON */
    if (e.target.classList.contains("edit")) {
      e.stopPropagation();

      taskInput.value = task.text;
      priority.value = task.priority;
      dueDate.value = task.dueDate || "";
      state.editId = task.id;
      return;
    }

    /* ✅ DELETE BUTTON */
    if (e.target.classList.contains("delete")) {
      e.stopPropagation();

      state.tasks = state.tasks.filter(t => t.id !== task.id);
      state.selectedId = null;
      saveTasks();
      render();
      return;
    }

    /* ✅ TASK BODY → TOGGLE PREVIEW ONLY */
    if (state.selectedId === task.id) {
      state.selectedId = null;
    } else {
      state.selectedId = task.id;
    }

    document.querySelectorAll(".sort-btn").forEach(btn =>
  btn.addEventListener("click", () => {
    document
      .querySelectorAll(".sort-btn")
      .forEach(b => b.classList.remove("active"));

    btn.classList.add("active");
    state.sort = btn.dataset.sort;
    render();
  })
);


    render();
  });

  /* ---------- FILTERS ---------- */
  document.querySelectorAll(".filter-btn").forEach(btn =>
    btn.addEventListener("click", () => {
      document
        .querySelectorAll(".filter-btn")
        .forEach(b => b.classList.remove("active"));

      btn.classList.add("active");
      state.filter = btn.dataset.filter;
      render();
    })
  );

  /* ---------- THEME ---------- */
  themeToggle.addEventListener("click", () => {
    const next =
      document.body.dataset.theme === "dark" ? "light" : "dark";
    document.body.dataset.theme = next;
    localStorage.setItem("theme", next);
  });

  /* ---------- DRAG & DROP (ONLY ALL) ---------- */
  new Sortable(taskList, {
    animation: 150,
    ghostClass: "drag-ghost",
    onMove: () => state.filter === "all",
    onEnd: () => {
      if (state.filter !== "all") return;

      const ids = [...taskList.children].map(li => li.dataset.id);
      state.tasks.sort(
        (a, b) => ids.indexOf(a.id) - ids.indexOf(b.id)
      );

      saveTasks();
      render();
    }
  });
};
