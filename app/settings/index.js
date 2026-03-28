// reading from  a json file
const fs = require("fs");
const path = require("path");
const { ipcRenderer } = require("electron");

// Use absolute path to config.json (settings/index.js is in app/settings/, so .. goes to app/)
const configPath = path.join(__dirname, '..', 'config.json');

function saveChangedData(data) {
  data.dark_theme = document.getElementById("dark-theme").checked;
  data.time_data.focus_time = document.getElementById("focus-time").value;
  data.time_data.short_break = document.getElementById("shortbreak-time").value;
  data.time_data.long_break = document.getElementById("longbreak-time").value;
  data.always_on_top = document.getElementById("always-on-top").checked;

  return data;
}

function loadJSON(filename = "") {
  return JSON.parse(
    fs.existsSync(filename) ? fs.readFileSync(filename).toString() : "null"
  );
}

function saveJSON(filename = "", json = '""') {
  return fs.writeFileSync(filename, JSON.stringify(json));
}

const data = loadJSON(configPath);

if (data && data.time_data && data.time_data.focus_time) {
  document.getElementById("focus-time").value = data.time_data.focus_time;
  document.getElementById("shortbreak-time").value = data.time_data.short_break;
  document.getElementById("longbreak-time").value = data.time_data.long_break;
}
if (data && data.always_on_top) {
  document.getElementById("always-on-top").checked = data.always_on_top;
}

save_btn = document.getElementById("save-btn");
save_btn.addEventListener("click", () => {
  updated_data = saveChangedData(data);
  saveJSON(configPath, updated_data);
  save_btn.innerHTML = "Saved!";
  ipcRenderer.send("ReloadMain");
  ipcRenderer.send("closeSetting");
});

document.addEventListener("keydown", (e) => {
  const ctrlOrCmd = e.ctrlKey || e.metaKey;
  if (e.key === "Escape") {
    e.preventDefault();
    ipcRenderer.send("closeSetting");
  } else if (ctrlOrCmd && e.key.toLowerCase() === "r") {
    e.preventDefault();
    ipcRenderer.send("ReloadMain");
  }
});
