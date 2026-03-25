function loadJSON(filename = "") {
  return JSON.parse(
    fs.existsSync(filename) ? fs.readFileSync(filename).toString() : "null"
  );
}
data = loadJSON("config.json");
console.log(data);
focusTime = parseInt(data.time_data.focus_time.split(":")[0]); // orig val = 25
shortBreakTime = parseInt(data.time_data.short_break.split(":")[0]); // orid val = 5
longBreakTime = parseInt(data.time_data.long_break.split(":")[0]); // orig val = 15

timer = document.getElementById("timer");
timer.innerHTML = data.time_data.focus_time;
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

function prepareLog() {
  if (currentSessionStartTime) {
    const endTime = new Date();
    const sessionType = isBreak ? "Break" : "Focus";
    pendingLog = {
      start: currentSessionStartTime.toLocaleString(),
      end: endTime.toLocaleString(),
      type: sessionType
    };
    currentSessionStartTime = null;
    
    const noteInput = document.getElementById("log-note");
    if (noteInput) {
      noteInput.focus();
    }
  }
}

function commitLog(note = "") {
  console.log("Committing log with note:", note);
  if (pendingLog) {
    const fs = require('fs');
    if (!fs.existsSync(logFilePath)) fs.writeFileSync(logFilePath, "Start Time,End Time,Session Type,Note\n");
    const safeNote = note ? `"${note.replace(/"/g, '""')}"` : "";
    fs.appendFileSync(logFilePath, `${pendingLog.start},${pendingLog.end},${pendingLog.type},${safeNote}\n`);
    console.log("Log appended to:", logFilePath);
    pendingLog = null;
    updateDailyTotal();
  } else {
    console.log("No pending log to commit");
  }
}

// Add event listener for the note input
document.addEventListener('DOMContentLoaded', () => {
  const noteInput = document.getElementById("log-note");
  console.log("Note input element found:", noteInput !== null);
  if (noteInput) {
    noteInput.addEventListener("keydown", (e) => {
      console.log("Key pressed in note input:", e.key);
      if (e.key === "Enter") {
        e.preventDefault();
        commitLog(noteInput.value);
        noteInput.value = "";
        noteInput.blur();
      }
    });
  }
});

function logSession() {
  prepareLog();
}

function updateDailyTotal() {
  const fs = require('fs');
  if (!fs.existsSync(logFilePath)) return;

  const today = new Date().toLocaleDateString();
  const rawData = fs.readFileSync(logFilePath, 'utf8');
  const lines = rawData.split('\n').slice(1); // Skip header

  let totalMinutes = 0;

  lines.forEach(line => {
    if (!line.trim()) return;
    const parts = line.split(',');
    if (parts.length < 5) return;

    const dateStr = parts[0].trim();
    const type = parts[4].trim();

    if (dateStr === today && type === "Focus") {
      try {
        const start = new Date(parts[0] + ',' + parts[1]);
        const end = new Date(parts[2] + ',' + parts[3]);
        if (!isNaN(start) && !isNaN(end)) {
          totalMinutes += Math.round((end - start) / 60000);
        }
      } catch (e) {}
    }
  });

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
  if (e.key === " " && document.activeElement.id !== "log-note") {
    e.preventDefault();
  }
});

document.addEventListener("keyup", (e) => {
  if (e.key === " " && document.activeElement.id !== "log-note") {
    e.preventDefault();
    start_btn.click();
  }
});

function timerEnd() {
  alarm = new Audio("sound/alarm.mp3");
  alarm.play();
  logSession();
  currentSessionStartTime = new Date();
}

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
      }
    }
    // change timer
  };
  setIntervalFunction = setInterval(timerFunction, 1000);
}

function stopTimer() {
  check_timer_text();
  clearInterval(setIntervalFunction);
  logSession();
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
  if (start_btn.innerHTML == "Start") {
    start_btn.innerHTML = "Pause";
    check_timer_text();
    startTimer();
  } else {
    PauseTimer();
  }
});
