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
try {
  const storedLog = localStorage.getItem('pendingLog');
  if (storedLog) {
    const parsed = JSON.parse(storedLog);
    pendingLog = {
      start: new Date(parsed.start),
      end: new Date(parsed.end),
      type: parsed.type
    };
    console.log("Restored pending log:", pendingLog);
  }
} catch (e) {
  console.error("Error restoring pending log:", e);
}

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
    localStorage.setItem('pendingLog', JSON.stringify(pendingLog));

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
    localStorage.removeItem('pendingLog');
    updateDailyTotal();
  } else {
    console.log("No pending log to commit");
  }
}

// Commit log on close if it exists
window.addEventListener('beforeunload', () => {
  if (pendingLog) {
    // Synchronous call to ensure it finishes before window closes
    commitLog("");
  }
});

// Function to setup note input listener
function setupNoteInput() {
  const noteInput = document.getElementById("log-note");
  const logSubmit = document.getElementById("log-submit");
  console.log("Setting up note input, element found:", noteInput !== null);
  
  if (noteInput && logSubmit) {
    const handleLog = () => {
      const note = noteInput.value.trim();
      console.log("Submitting log, note:", note);
      console.log("pendingLog exists:", !!pendingLog);

      const showAcknowledgment = () => {
        const originalPlaceholder = "Session note (optional)...";
        noteInput.placeholder = "Registered!";
        logSubmit.classList.add('registered');
        
        setTimeout(() => {
          noteInput.placeholder = originalPlaceholder;
          logSubmit.classList.remove('registered');
        }, 1500);
      };

      if (pendingLog) {
        commitLog(note);
        noteInput.value = "";
        noteInput.blur();
        showAcknowledgment();
      } else if (currentSessionStartTime) {
        console.log("Creating log from active session");
        prepareLog(true);
        commitLog(note);
        noteInput.value = "";
        noteInput.blur();
        currentSessionStartTime = new Date();
        showAcknowledgment();
      } else {
        console.log("No session to log - starting manual log");
        const now = new Date();
        pendingLog = {
          start: now,
          end: now,
          type: "Manual"
        };
        commitLog(note);
        noteInput.value = "";
        noteInput.blur();
        showAcknowledgment();
      }
    };

    // Add click listener to the tick
    logSubmit.addEventListener("click", handleLog);

    // Add Enter key listener to the tick (for tab navigation)
    logSubmit.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        handleLog();
      }
    });

    // Handle Enter inside the input field
    noteInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        handleLog();
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
  updateDailyTotal();
}

function updateDailyTotal() {
  const today = new Date().toISOString().split('T')[0]; // Get YYYY-MM-DD
  let totalMs = 0;
  let sessionCount = 0;

  if (fs.existsSync(logFilePath)) {
    console.log("Looking for logs for date:", today);
    const rawData = fs.readFileSync(logFilePath, 'utf8');
    const lines = rawData.split('\n').slice(1); // Skip header

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
            totalMs += (end - start);
            sessionCount++;
          }
        }
      } catch (e) {
        console.error("Error parsing line:", line, e);
      }
    });
  }

  // Include pending log if it exists and is a Focus session for today
  if (pendingLog && pendingLog.type === "Focus") {
    const start = pendingLog.start;
    const end = pendingLog.end;
    const startDate = start.toISOString().split('T')[0];
    if (startDate === today && !isNaN(start) && !isNaN(end)) {
      totalMs += (end - start);
      sessionCount++;
    }
  }

  const totalMinutes = Math.round(totalMs / 60000);
  console.log("Calculated total focus minutes for today:", totalMinutes);
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  const totalDisplay = document.getElementById("daily-total");
  
  if (totalDisplay) {
    const finalDisplayStr = `Today: ${hours}h ${mins}m (${sessionCount} deep ${sessionCount === 1 ? 'session' : 'sessions'})`;
    
    // Animate if we've initialized before and the session count increased
    if (window._lastSessionCount !== undefined && window._lastSessionCount < sessionCount) {
      
      // 1. Synthesize Audio
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        try {
          const audioCtx = new AudioContext();
          const t = audioCtx.currentTime;
          
          // Chug sounds (ratcheting)
          for (let i = 0; i < 6; i++) {
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.type = 'square';
            osc.frequency.setValueAtTime(80 - (i * 5), t + i * 0.1);
            gain.gain.setValueAtTime(0.05, t + i * 0.1);
            gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.1 + 0.05);
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.start(t + i * 0.1);
            osc.stop(t + i * 0.1 + 0.05);
          }

          // Zang sound (bell/coin ring)
          const zangTime = t + 0.6;
          const zangOsc = audioCtx.createOscillator();
          const zangGain = audioCtx.createGain();
          zangOsc.type = 'sine';
          zangOsc.frequency.setValueAtTime(880, zangTime); // A5
          zangOsc.frequency.exponentialRampToValueAtTime(1760, zangTime + 0.1); // Slide to A6
          zangGain.gain.setValueAtTime(0.15, zangTime);
          zangGain.gain.exponentialRampToValueAtTime(0.001, zangTime + 0.8);
          zangOsc.connect(zangGain);
          zangGain.connect(audioCtx.destination);
          zangOsc.start(zangTime);
          zangOsc.stop(zangTime + 0.8);
        } catch (e) {
          console.error("Audio playback failed:", e);
        }
      }

      // 2. Visual Roulette Animation
      let iterations = 0;
      const maxIterations = 15; // 15 cycles * 40ms = 600ms (aligns with zang sound)
      
      // Ensure smooth transition back
      totalDisplay.style.transition = 'none';
      
      const interval = setInterval(() => {
        iterations++;
        const rH = Math.floor(Math.random() * 10);
        const rM = Math.floor(Math.random() * 60);
        const rC = Math.floor(Math.random() * 20);
        totalDisplay.innerText = `Today: ${rH}h ${rM}m (${rC} deep sessions)`;
        
        if (iterations >= maxIterations) {
          clearInterval(interval);
          totalDisplay.innerText = finalDisplayStr;
          
          // Flash effect
          totalDisplay.style.color = '#4caf50';
          totalDisplay.style.textShadow = '0 0 10px rgba(76, 175, 80, 0.8)';
          totalDisplay.style.transform = 'scale(1.05)';
          totalDisplay.style.transition = 'all 0.3s ease-out';
          
          setTimeout(() => {
            totalDisplay.style.color = '';
            totalDisplay.style.textShadow = '';
            totalDisplay.style.transform = '';
          }, 300);
        }
      }, 40);

    } else {
      totalDisplay.innerText = finalDisplayStr;
    }
    
    window._lastSessionCount = sessionCount;
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
        
        // Always default back to focus mode after any session ends
        ipcRenderer.send("ShowNotification_focus");
        count_focus += 1;
        title.innerHTML = "PomoFocus!";
        document.getElementById("debug-text").innerHTML = "focus time";
        isBreak = false;
        workCount += 1;
        minute = focusTime;
        second = 0;
        
        // Visual UI update to match focus mode
        const focusModeBtn = document.getElementById("focus-mode");
        if (focusModeBtn && typeof remClassList === "function") {
          remClassList();
          focusModeBtn.classList.add("change-opacity");
        } else if (focusModeBtn) {
          // Fallback if remClassList isn't in scope (it's in mode-change.js)
          const modes = ["focus-mode", "shortbreak-mode", "longbreak-mode"];
          modes.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.classList.remove("change-opacity");
          });
          focusModeBtn.classList.add("change-opacity");
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
