import { state } from "./state.js";

export const loadTasks = () => {
  state.tasks = JSON.parse(localStorage.getItem("tasks")) || [];
};

export const saveTasks = () => {
  localStorage.setItem("tasks", JSON.stringify(state.tasks));
};
