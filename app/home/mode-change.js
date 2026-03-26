const { ipcRenderer } = require("electron");

timer = document.getElementById("timer");

focus_mode = document.getElementById("focus-mode");
shortbreak_mode = document.getElementById("shortbreak-mode");
longbreak_mode = document.getElementById("longbreak-mode");
title = document.getElementById("title");

element_list = [
  document.getElementById("focus-mode"),
  document.getElementById("shortbreak-mode"),
  document.getElementById("longbreak-mode"),
];

// Get Data from JSON file
const fs = require("fs");
const path = require("path");

// Use absolute path to config.json (mode-change.js is in app/home/, so .. goes to app/)
const configPath = path.join(__dirname, '..', 'config.json');

function loadJSON(filename = "") {
  return JSON.parse(
    fs.existsSync(filename) ? fs.readFileSync(filename).toString() : "null"
  );
}

data = loadJSON(configPath);
console.log("mode-change.js loaded config:", data);

function remClassList() {
  console.log(element_list);
  element_list.forEach((element) => {
    if (element.classList.contains("change-opacity")) {
      element.classList.remove("change-opacity");
    }
  });
}

focus_mode.addEventListener("click", () => {
  timer.innerHTML = data.time_data.focus_time;
  title.innerHTML = "PomoFocus!";
  remClassList();
  focus_mode.classList.add("change-opacity");
});

shortbreak_mode.addEventListener("click", () => {
  title.innerHTML = "Short Break";
  timer.innerHTML = data.time_data.short_break;
  remClassList();
  shortbreak_mode.classList.add("change-opacity");
});

longbreak_mode.addEventListener("click", () => {
  title.innerHTML = "Long Break";
  timer.innerHTML = data.time_data.long_break;
  remClassList();
  longbreak_mode.classList.add("change-opacity");
});

setting_button = document.getElementById("settings-mode");
setting_button.addEventListener("click", () => {
  ipcRenderer.send("openSettings");
});
