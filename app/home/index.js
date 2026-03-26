const fs = require("fs");
const path = require("path");
const { ipcRenderer } = require("electron");

// Use absolute path to config.json (home/index.js is in app/home/, so .. goes to app/)
const configPath = path.join(__dirname, '..', 'config.json');

function loadJSON(filename = "") {
  console.log("Loading config from:", filename);
  console.log("File exists:", fs.existsSync(filename));
  const content = fs.existsSync(filename) ? fs.readFileSync(filename).toString() : "null";
  console.log("File content:", content);
  return JSON.parse(content);
}
data = loadJSON(configPath);
console.log("Loaded data:", data);
console.log("Focus time from config:", data.time_data.focus_time);
focusTime = parseInt(data.time_data.focus_time.split(":")[0]); // orig val = 25
shortBreakTime = parseInt(data.time_data.short_break.split(":")[0]); // orid val = 5
longBreakTime = parseInt(data.time_data.long_break.split(":")[0]); // orig val = 15

timer = document.getElementById("timer");
console.log("Timer element:", timer);
console.log("Setting timer to:", data.time_data.focus_time);
if (timer) {
  timer.innerHTML = data.time_data.focus_time;
  console.log("Timer innerHTML is now:", timer.innerHTML);
} else {
  console.error("Timer element not found!");
}
start_btn = document.getElementById("start-btn");
timer_text = timer.innerHTML.split(":");
title = document.getElementById("title");
// end user-variables

// debuggin variables - start
count_focus = 0;
count_longbreak = 0;
count_shortbreak = 0;
// debuggin variables - end

let setIntervalFunction;
starting_min = focusTime;
starting_sec = 00;
isBreak = false;

let currentSessionStartTime = null;
let pendingLog = null;
const logFilePath = require('path').join(require('os').homedir(), 'pomofocus-logs.csv');

function prepareLog(shouldFocus = true) {
  if (currentSessionStartTime) {
    const endTime = new Date();
    const sessionType = isBreak ? "Break" : "Focus";
    pendingLog = {
      start: currentSessionStartTime,
      end: endTime,
      type: sessionType
    };
    currentSessionStartTime = null;

    const noteInput = document.getElementById("log-note");
    if (shouldFocus && noteInput) {
      noteInput.focus();
    }
  }
}

function commitLog(note = "") {
  console.log("Committing log with note:", note);
  if (pendingLog) {
    if (!fs.existsSync(logFilePath)) {
      fs.writeFileSync(logFilePath, "Start Time,End Time,Session Type,Note\n");
    }
    // Use ISO string for consistent parsing
    const startTime = pendingLog.start.toISOString();
    const endTime = pendingLog.end.toISOString();
    const safeNote = note ? `"${note.replace(/"/g, '""')}"` : "";
    fs.appendFileSync(logFilePath, `${startTime},${endTime},${pendingLog.type},${safeNote}\n`);
    console.log("Log appended to:", logFilePath);
    pendingLog = null;
    updateDailyTotal();
  } else {
    console.log("No pending log to commit");
  }
}

// Function to setup note input listener
function setupNoteInput() {
  const noteInput = document.getElementById("log-note");
  console.log("Setting up note input, element found:", noteInput !== null);
  if (noteInput) {
    // Remove any existing listeners
    const newInput = noteInput.cloneNode(true);
    noteInput.parentNode.replaceChild(newInput, noteInput);

    newInput.addEventListener("keydown", (e) => {
      console.log("Key pressed in note input:", e.key);
      if (e.key === "Enter") {
        e.preventDefault();
        const note = newInput.value.trim();
        console.log("Enter pressed, note:", note);
        console.log("pendingLog exists:", !!pendingLog);

        // If there's a pending log, commit it
        if (pendingLog) {
          commitLog(note);
          newInput.value = "";
          newInput.placeholder = "Session note (optional)...";
          newInput.blur();
        } else {
          // If no pending log but user is trying to log, create one from current session
          if (currentSessionStartTime) {
            console.log("Creating log from active session");
            prepareLog(true);
            commitLog(note);
            newInput.value = "";
            newInput.placeholder = "Session note (optional)...";
            newInput.blur();
            // Restart the session timer
            currentSessionStartTime = new Date();
          } else {
            console.log("No session to log - starting manual log");
            // Allow manual logging even without a session
            const now = new Date();
            pendingLog = {
              start: now,
              end: now,
              type: "Manual"
            };
            commitLog(note);
            newInput.value = "";
            newInput.placeholder = "Session note (optional)...";
            newInput.blur();
          }
        }
      }
    });
  }
}

// Setup when DOM is ready
document.addEventListener('DOMContentLoaded', setupNoteInput);

// Also setup immediately if DOM is already loaded
if (document.readyState === "loading") {
  // Will be handled by DOMContentLoaded
} else {
  setupNoteInput();
}

function logSession(shouldFocus = true) {
  prepareLog(shouldFocus);
}

function updateDailyTotal() {
  if (!fs.existsSync(logFilePath)) return;

  const today = new Date().toISOString().split('T')[0]; // Get YYYY-MM-DD
  console.log("Looking for logs for date:", today);
  const rawData = fs.readFileSync(logFilePath, 'utf8');
  const lines = rawData.split('\n').slice(1); // Skip header

  let totalMinutes = 0;

  lines.forEach(line => {
    if (!line.trim()) return;

    try {
      // Split carefully to handle quoted notes with commas
      const csvRegex = /("([^"\\]|\\.)*"|[^,]+)/g;
      const parts = line.match(csvRegex);
      if (!parts || parts.length < 3) return;

      const startTimeStr = parts[0]?.replace(/"/g, '').trim();
      const endTimeStr = parts[1]?.replace(/"/g, '').trim();
      const sessionType = parts[2]?.replace(/"/g, '').trim();

      // Check if this is a Focus session from today
      const startDate = startTimeStr?.split('T')[0];
      const isFocus = sessionType === "Focus";

      if (startDate === today && isFocus) {
        const start = new Date(startTimeStr);
        const end = new Date(endTimeStr);

        if (!isNaN(start) && !isNaN(end)) {
          totalMinutes += Math.round((end - start) / 60000);
        }
      }
    } catch (e) {
      console.error("Error parsing line:", line, e);
    }
  });

  console.log("Calculated total focus minutes for today:", totalMinutes);
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  const totalDisplay = document.getElementById("daily-total");
  if (totalDisplay) {
    totalDisplay.innerText = `Today: ${hours}h ${mins}m`;
  }
}

// Initial update
document.addEventListener('DOMContentLoaded', () => {
  updateDailyTotal();
});

function check_timer_text() {
  timer_text = timer.innerHTML.split(":");
  starting_min = parseInt(timer_text[0]);
  starting_sec = parseInt(timer_text[1]);
  // console.log(starting_min + ":" + starting_sec);
}

workCount = 0;

document.addEventListener("keydown", (e) => {
  const inNote = document.activeElement.id === "log-note";

  // Global acknowledge: If alarm is ringing, 'k' stops it without typing in the note
  if (e.key.toLowerCase() === "k" && alarm && !alarm.paused) {
    e.preventDefault();
    e.stopPropagation(); // Stop it from reaching the note input
    stopAlarm();
    return;
  }

  // Escape to blur the note input
  if (e.key === "Escape" && inNote) {
    document.activeElement.blur();
    return;
  }

  // Focus note shortcut: / or Cmd/Ctrl + N
  const ctrlOrCmd = e.ctrlKey || e.metaKey;
  if (!inNote && (e.key === "/" || (ctrlOrCmd && e.key.toLowerCase() === "n"))) {
    e.preventDefault();
    const noteInput = document.getElementById("log-note");
    if (noteInput) noteInput.focus();
    return;
  }

  if (inNote) return;

  if (e.key === " ") {
    e.preventDefault(); // Prevent default scrolling for spacebar
    toggleTimer();
  } else if (e.key.toLowerCase() === "k") {
    // Acknowledge shortcut (when alarm is NOT ringing, but still want to start/stop)
    e.preventDefault();
    stopAlarm();
    // If timer is paused, start it. If running, do nothing (just mute).
    if (start_btn.innerHTML === "Start") {
      toggleTimer();
    }
  } else if (ctrlOrCmd && e.key.toLowerCase() === "r") {
    e.preventDefault();
    if (start_btn.innerHTML === "Pause") {
      PauseTimer();
    }
    const modeElements = [
      document.getElementById("focus-mode"),
      document.getElementById("shortbreak-mode"),
      document.getElementById("longbreak-mode")
    ];
    const activeMode = modeElements.find(el => el && el.classList.contains("change-opacity"));
    if (activeMode) activeMode.click();
  } else if (ctrlOrCmd && e.key === "ArrowRight") {
    e.preventDefault();
    const modes = ["focus-mode", "shortbreak-mode", "longbreak-mode"];
    const modeElements = modes.map(id => document.getElementById(id));
    const currentIndex = modeElements.findIndex(el => el && el.classList.contains("change-opacity"));
    if (currentIndex !== -1) {
      const nextIndex = (currentIndex + 1) % modes.length;
      if (modeElements[nextIndex]) modeElements[nextIndex].click();
    }
  } else if (ctrlOrCmd && e.key === "1") {
    e.preventDefault();
    const el = document.getElementById("focus-mode");
    if (el) el.click();
  } else if (ctrlOrCmd && e.key === "2") {
    e.preventDefault();
    const el = document.getElementById("shortbreak-mode");
    if (el) el.click();
  } else if (ctrlOrCmd && e.key === "3") {
    e.preventDefault();
    const el = document.getElementById("longbreak-mode");
    if (el) el.click();
  } else if (ctrlOrCmd && e.key === ",") {
    e.preventDefault();
    ipcRenderer.send("openSettings");
  } else if (ctrlOrCmd && e.key.toLowerCase() === "m") {
    e.preventDefault();
    ipcRenderer.send("minApp");
  } else if (ctrlOrCmd && e.key.toLowerCase() === "q") {
    e.preventDefault();
    ipcRenderer.send("closeApp");
  }
}, true); // Use capture phase so it runs before the note input's own listener

function toggleTimer() {
  if (start_btn.innerHTML == "Start") {
    // Starting the Timer
    start_btn.innerHTML = "Pause";
    check_timer_text();
    startTimer();
  } else {
    PauseTimer();
  }
}

let alarm = null;

function stopAlarm() {
  if (alarm) {
    alarm.pause();
    alarm.currentTime = 0;
  }
  const indicator = document.getElementById("alarm-indicator");
  if (indicator) {
    indicator.classList.add("hidden-indicator");
    indicator.classList.remove("ringing");
  }
}

function timerEnd() {
  stopAlarm();
  alarm = new Audio("sound/singing_bowl.ogg");
  alarm.play();
  
  const indicator = document.getElementById("alarm-indicator");
  if (indicator) {
    indicator.classList.remove("hidden-indicator");
    indicator.classList.add("ringing");
  }

  logSession();
  currentSessionStartTime = new Date();
}

document.addEventListener('DOMContentLoaded', () => {
  const indicator = document.getElementById("alarm-indicator");
  if (indicator) {
    indicator.addEventListener("click", stopAlarm);
    indicator.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        stopAlarm();
      }
    });
  }
});

function startTimer() {
  if (pendingLog) commitLog(""); // flush any previous pending log if start is clicked without writing note
  if (!currentSessionStartTime) currentSessionStartTime = new Date();
  check_timer_text();
  minute = starting_min;
  second = starting_sec;
  workCount = 1;

  // minute = starting_min - 1;

  let timerFunction = () => {
    timer.innerHTML = ("0" + minute).slice(-2) + ":" + ("0" + second).slice(-2);
    /* second -= 1;if (second === 0) {minute -= 1;if (minute === -1) {if (workCount % 4 == 0) {longBreak();} else {shortBreak();}}second = 59;}*/
    second--;
    if (second <= 0) {
      second = 59;
      minute -= 1;
      if (minute <= -1) {
        timerEnd();
        if (!isBreak) {
          if (workCount != 0 && workCount % 4 == 0) {
            // long break
            ipcRenderer.send("ShowNotification_longbreak");
            title.innerHTML = "Long Break";
            count_longbreak += 1;
            document.getElementById("debug-text").innerHTML = "long break";

            isBreak = true;
            minute = longBreakTime;
            second = 0;
          } else {
            // short break
            count_shortbreak += 1;
            ipcRenderer.send("ShowNotification_shortbreak");
            document.getElementById("debug-text").innerHTML = "short break";
            title.innerHTML = "Short Break";
            isBreak = true;
            minute = shortBreakTime;
            second = 0;
          }
        } else {
          ipcRenderer.send("ShowNotification_focus");
          count_focus += 1;
          title.innerHTML = "PomoFocus!";
          document.getElementById("debug-text").innerHTML = "focus time";
          isBreak = false;
          workCount += 1;
          minute = focusTime;
          second = 0;
        }
        // Reset daily total display after mode change
        updateDailyTotal();
        // Pause timer so it doesn't automatically start next session
        PauseTimer();
        // Ensure the timer displays the full time of the new mode
        timer.innerHTML = ("0" + minute).slice(-2) + ":" + ("0" + second).slice(-2);
      }
    }
    // change timer
  };
  setIntervalFunction = setInterval(timerFunction, 1000);
}

function stopTimer() {
  check_timer_text();
  clearInterval(setIntervalFunction);
  logSession(false);
}

function PauseTimer() {
  start_btn.innerHTML = "Start";
  check_timer_text();
  stopTimer();
}

let timerStarted = false;
start_btn.addEventListener("click", () => {
  if (start_btn.innerHTML == "Start") {
    // Starting the Timer
    start_btn.innerHTML = "Pause";
    check_timer_text();
    startTimer();
  } else {
    PauseTimer();
  }
});

// shortcut for pausing
ipcRenderer.on("Pause-timer", () => {
  toggleTimer();
});
