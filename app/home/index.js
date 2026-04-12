const fs = require("fs");
const path = require("path");
const { ipcRenderer } = require("electron");

// Use absolute path to config.json (home/index.js is in app/home/, so .. goes to app/)
const configPath = path.join(__dirname, '..', 'config.json');

window.updateProgressRing = function(currentSeconds, totalSeconds) {
  const circle = document.getElementById('progress-circle');
  if (circle) {
    const radius = circle.r.baseVal.value;
    const circumference = 2 * Math.PI * radius;
    circle.style.strokeDasharray = `${circumference} ${circumference}`;
    const percent = Math.max(0, currentSeconds / totalSeconds);
    const offset = circumference - percent * circumference;
    circle.style.strokeDashoffset = offset;
  }
};

function loadJSON(filename = "") {
  const content = fs.existsSync(filename) ? fs.readFileSync(filename).toString() : "null";
  return JSON.parse(content);
}
data = loadJSON(configPath);
if (data && !data.projects) data.projects = ["P1", "P2", "P3"];
focusTime = parseInt(data.time_data.focus_time.split(":")[0]); // orig val = 25
shortBreakTime = parseInt(data.time_data.short_break.split(":")[0]); // orid val = 5
longBreakTime = parseInt(data.time_data.long_break.split(":")[0]); // orig val = 15

timer = document.getElementById("timer");
if (timer) {
  timer.innerHTML = data.time_data.focus_time;
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

function getSelectedProject() {
  const selectedRadio = document.querySelector('input[name="project"]:checked');
  if (selectedRadio) {
    const index = parseInt(selectedRadio.value);
    return data.projects && data.projects[index] ? data.projects[index] : `P${index + 1}`;
  }
  return "Default";
}

function commitLog(note = "") {
  if (pendingLog) {
    // Only commit if the session is > 1 minute OR has a note
    const durationMs = pendingLog.end.getTime() - pendingLog.start.getTime();
    if (durationMs < 60000 && (!note || note.trim() === "")) {
      pendingLog = null;
      localStorage.removeItem('pendingLog');
      return;
    }

    if (!fs.existsSync(logFilePath)) {
      fs.writeFileSync(logFilePath, "Start Time,End Time,Session Type,Project,Note\n");
    } else {
      // Check if header needs update (legacy files)
      const firstLine = fs.readFileSync(logFilePath, 'utf8').split('\n')[0];
      if (!firstLine.includes("Project")) {
        const content = fs.readFileSync(logFilePath, 'utf8');
        const lines = content.split('\n');
        lines[0] = "Start Time,End Time,Session Type,Project,Note";
        fs.writeFileSync(logFilePath, lines.join('\n'));
      }
    }
    
    // Use ISO string for consistent parsing
    const startTime = pendingLog.start.toISOString();
    const endTime = pendingLog.end.toISOString();
    const project = getSelectedProject();
    const safeNote = note ? `"${note.replace(/"/g, '""')}"` : "";
    fs.appendFileSync(logFilePath, `${startTime},${endTime},${pendingLog.type},"${project}",${safeNote}\n`);
    pendingLog = null;
    localStorage.removeItem('pendingLog');
    updateDailyTotal();
  } else {
  }
}

function setupProjectLabels() {
  const container = document.getElementById('project-selection');
  if (data && data.projects && container) {
    container.innerHTML = ''; // clear old ones
    data.projects.forEach((name, index) => {
      if (!name.trim()) return;
      const label = document.createElement('label');
      label.className = 'project-radio';
      
      const input = document.createElement('input');
      input.type = 'radio';
      input.name = 'project';
      input.value = index;
      if (index === 0) input.checked = true; // default first item
      
      const span = document.createElement('span');
      span.className = 'radio-label';
      span.id = `project${index}-label`;
      span.innerText = name.trim();
      
      label.appendChild(input);
      label.appendChild(span);
      container.appendChild(label);
    });
  }
}

// Commit log on close if it exists
window.addEventListener('beforeunload', () => {
  if (currentSessionStartTime) {
    prepareLog(false);
  }
  if (pendingLog) {
    // Synchronous call to ensure it finishes before window closes
    commitLog("");
  }
});

// Function to setup note input listener
function setupNoteInput() {
  const noteInput = document.getElementById("log-note");
  const logSubmit = document.getElementById("log-submit");
  
  if (noteInput && logSubmit) {
    const handleLog = () => {
      const note = noteInput.value.trim();

      const showAcknowledgment = () => {
        const originalPlaceholder = "Session note (optional)...";
        noteInput.placeholder = "Registered!";
        logSubmit.classList.add('registered');
        noteInput.classList.add('registered-input');

        setTimeout(() => {
          noteInput.placeholder = originalPlaceholder;
          logSubmit.classList.remove('registered');
          noteInput.classList.remove('registered-input');
        }, 2000);
      };

      if (pendingLog) {
        commitLog(note);
        noteInput.value = "";
        noteInput.blur();
        showAcknowledgment();
      } else if (currentSessionStartTime) {
        prepareLog(true);
        commitLog(note);
        noteInput.value = "";
        noteInput.blur();
        currentSessionStartTime = new Date();
        showAcknowledgment();
      } else {
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
document.addEventListener('DOMContentLoaded', () => {
  setupNoteInput();
  setupProjectLabels();
  
  // Auto-focus note input when the app gains focus
  window.addEventListener('focus', () => {
    const noteInput = document.getElementById("log-note");
    if (noteInput) noteInput.focus();
  });

  // Auto-stop alarm when user starts typing in the note input
  const noteInput = document.getElementById("log-note");
  if (noteInput) {
    noteInput.addEventListener("input", () => {
      if (alarm && !alarm.paused) {
        stopAlarm();
      }
    });
  }
});

// Also setup immediately if DOM is already loaded
if (document.readyState === "loading") {
  // Will be handled by DOMContentLoaded
} else {
  setupNoteInput();
  setupProjectLabels();
  if (window.updateProgressRing) window.updateProgressRing(1, 1);
  
  // Auto-focus note input when the app gains focus
  window.addEventListener('focus', () => {
    const noteInput = document.getElementById("log-note");
    if (noteInput) noteInput.focus();
  });

  // Auto-stop alarm when user starts typing in the note input
  const noteInput = document.getElementById("log-note");
  if (noteInput) {
    noteInput.addEventListener("input", () => {
      if (alarm && !alarm.paused) {
        stopAlarm();
      }
    });
  }
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
            const durationMs = end - start;
            totalMs += durationMs;
            
            // Only count as a "deep session" if it's at least 1 minute long or has a note
            // Note is now at index 4 if Project is present, or index 3 if legacy
            const hasProject = line.includes("Project") || parts.length > 4;
            const noteIndex = hasProject ? 4 : 3;
            const noteStr = parts[noteIndex] ? parts[noteIndex].replace(/"/g, '').trim() : "";
            if (durationMs >= 60000 || noteStr !== "") {
              sessionCount++;
            }
          }
        }
      } catch (e) {
        console.error("Error parsing line:", line, e);
      }
    });
  }

  // No longer including pendingLog so the count only updates and animates
  // after the user presses Enter and the log is committed.
  
  const totalMinutes = Math.round(totalMs / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  const totalDisplay = document.getElementById("daily-total");
  const bigCountDisplay = document.getElementById("big-session-count");
  
  if (totalDisplay) {
    const finalDisplayStr = `Today: ${hours}h ${mins}m`;
    
    // Animate if we've initialized before and the session count increased
    if (window._lastSessionCount !== undefined && window._lastSessionCount < sessionCount) {
      const oldCount = window._lastSessionCount;
      const difference = sessionCount - oldCount;

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

      // 2. Visual Glitter/Confetti Effect
      const spawnGlitter = () => {
        const rect = totalDisplay.getBoundingClientRect();
        for (let i = 0; i < 30; i++) {
          const glitter = document.createElement('div');
          glitter.style.position = 'absolute';
          glitter.style.width = Math.random() * 6 + 4 + 'px';
          glitter.style.height = glitter.style.width;
          const colors = ['#FFD700', '#FF69B4', '#00FF00', '#00BFFF', '#FF4500'];
          glitter.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
          glitter.style.borderRadius = Math.random() > 0.5 ? '50%' : '2px';
          glitter.style.top = (rect.top + rect.height / 2) + 'px';
          glitter.style.left = (rect.left + rect.width / 2) + 'px';
          glitter.style.pointerEvents = 'none';
          glitter.style.zIndex = '1000';
          
          const angle = Math.random() * Math.PI * 2;
          const velocity = Math.random() * 60 + 20;
          const vx = Math.cos(angle) * velocity;
          const vy = Math.sin(angle) * velocity - 30; // slight upward bias
          
          document.body.appendChild(glitter);
          
          let opacity = 1;
          let posX = rect.left + rect.width / 2;
          let posY = rect.top + rect.height / 2;
          let currentVy = vy;
          
          const animateGlitter = () => {
            if (opacity <= 0) {
              glitter.remove();
              return;
            }
            posX += vx * 0.1;
            posY += currentVy * 0.1;
            currentVy += 5; // gravity
            opacity -= 0.02;
            
            glitter.style.left = posX + 'px';
            glitter.style.top = posY + 'px';
            glitter.style.opacity = opacity;
            glitter.style.transform = `rotate(${posX}deg)`;
            
            requestAnimationFrame(animateGlitter);
          };
          requestAnimationFrame(animateGlitter);
        }
      };

      // 3. Smooth Rolling Animation for the count
      let iterations = 0;
      const maxIterations = 15; // align with the zang sound timing
      
      if (totalDisplay) totalDisplay.innerText = finalDisplayStr;
      if (bigCountDisplay) bigCountDisplay.style.transition = 'none';
      
      const interval = setInterval(() => {
        iterations++;
        // Show random numbers briefly to simulate rolling, but only for the count part
        const rC = oldCount + Math.floor(Math.random() * (difference + 2)); 
        if (bigCountDisplay) bigCountDisplay.innerText = rC;
        
        if (iterations >= maxIterations) {
          clearInterval(interval);
          if (bigCountDisplay) bigCountDisplay.innerText = sessionCount;
          
          // Trigger glitter when the final number hits
          spawnGlitter();
          
          // Golden/Green achievement flash effect
          if (bigCountDisplay) {
            bigCountDisplay.style.color = '#FFD700'; // Gold color
            bigCountDisplay.style.textShadow = '0 0 15px rgba(255, 215, 0, 1)';
            bigCountDisplay.style.transform = 'scale(1.3)';
            bigCountDisplay.style.transition = 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)'; // bouncy pop
            
            setTimeout(() => {
              bigCountDisplay.style.color = '#4caf50'; // Settle on a success green
              bigCountDisplay.style.textShadow = '0 0 8px rgba(76, 175, 80, 0.6)';
              bigCountDisplay.style.transform = 'scale(1.05)';
              
              setTimeout(() => {
                 bigCountDisplay.style.color = '';
                 bigCountDisplay.style.textShadow = '';
                 bigCountDisplay.style.transform = '';
              }, 800);
            }, 400);
          }
        }
      }, 40);

    } else {
      totalDisplay.innerText = finalDisplayStr;
      if (bigCountDisplay) bigCountDisplay.innerText = sessionCount;
    }
    
    // Update Daily Goal Circle
    const goalCircle = document.getElementById("goal-circle");
    const dailyGoalText = document.getElementById("daily-goal-text");
    const dailyGoal = data.daily_goal || 50; // Configurable goal
    if (goalCircle && dailyGoalText) {
      dailyGoalText.innerText = dailyGoal;
      const radius = goalCircle.r.baseVal.value;
      const circumference = 2 * Math.PI * radius;
      goalCircle.style.strokeDasharray = `${circumference} ${circumference}`;
      
      // Calculate progress (capped at 100%)
      const percent = Math.min(1, sessionCount / dailyGoal);
      const offset = circumference - percent * circumference;
      
      // Give it a tiny delay to animate cleanly after load
      setTimeout(() => {
        goalCircle.style.strokeDashoffset = offset;
        goalCircle.style.stroke = "#256faf"; // Match the main theme color
      }, 50);
    }
    
    window._lastSessionCount = sessionCount;
  }
}

// Initial update
document.addEventListener('DOMContentLoaded', () => {
  updateDailyTotal();
  if (window.updateProgressRing) window.updateProgressRing(1, 1);
});

function check_timer_text() {
  timer_text = timer.innerHTML.split(":");
  starting_min = parseInt(timer_text[0]);
  starting_sec = parseInt(timer_text[1]);
}

workCount = 0;

document.addEventListener("keydown", (e) => {
  const inNote = document.activeElement.id === "log-note";

  // Global acknowledge: If alarm is ringing, 'k' stops it
  if (e.key.toLowerCase() === "k" && alarm && !alarm.paused) {
    if (!inNote) {
      e.preventDefault();
      e.stopPropagation();
      stopAlarm();
      return;
    }
    // If inNote is true, we let the keypress pass through so 'k' is typed.
    // The input event listener we added will handle stopping the alarm.
  }

  // Escape to blur the note input
  if (e.key === "Escape" && inNote) {
    document.activeElement.blur();
    return;
  }

  // Focus note shortcut: / or Cmd/Ctrl + N
  const ctrlOrCmd = e.ctrlKey || e.metaKey;

  // Standard App Shortcuts (work even when note input is focused)
  if (ctrlOrCmd) {
    if (e.key.toLowerCase() === "r") {
      e.preventDefault();
      // Clear session state so it's not saved by beforeunload
      currentSessionStartTime = null;
      pendingLog = null;
      localStorage.removeItem('pendingLog');
      ipcRenderer.send("ReloadMain");
      return;
    } else if (e.key.toLowerCase() === "q") {
      e.preventDefault();
      ipcRenderer.send("closeApp");
      return;
    } else if (e.key.toLowerCase() === "m") {
      e.preventDefault();
      ipcRenderer.send("minApp");
      return;
    } else if (e.key === ",") {
      e.preventDefault();
      ipcRenderer.send("openSettings");
      return;
    } else if (e.key === "1") {
      e.preventDefault();
      const el = document.getElementById("focus-mode");
      if (el) el.click();
      return;
    } else if (e.key === "2") {
      e.preventDefault();
      const el = document.getElementById("shortbreak-mode");
      if (el) el.click();
      return;
    } else if (e.key === "3") {
      e.preventDefault();
      const el = document.getElementById("longbreak-mode");
      if (el) el.click();
      return;
    } else if (e.key.toLowerCase() === "n") {
      e.preventDefault();
      const noteInput = document.getElementById("log-note");
      if (noteInput) noteInput.focus();
      return;
    }
  }

  if (!inNote && e.key === "/") {
    e.preventDefault();
    const noteInput = document.getElementById("log-note");
    if (noteInput) noteInput.focus();
    return;
  }

  if (inNote) return;

  const isRadio = document.activeElement.tagName === "INPUT" && document.activeElement.type === "radio";
  if (isRadio && (e.key === " " || e.key.startsWith("Arrow"))) return;

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
  } else if (ctrlOrCmd && e.key === "ArrowRight") {
    e.preventDefault();
    const modes = ["focus-mode", "shortbreak-mode", "longbreak-mode"];
    const modeElements = modes.map(id => document.getElementById(id));
    const currentIndex = modeElements.findIndex(el => el && el.classList.contains("change-opacity"));
    if (currentIndex !== -1) {
      const nextIndex = (currentIndex + 1) % modes.length;
      if (modeElements[nextIndex]) modeElements[nextIndex].click();
    }
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

document.addEventListener("keydown", (e) => {
  const inNote = document.activeElement.id === "log-note";
  const ctrlOrCmd = e.ctrlKey || e.metaKey;

  // We could add more shortcuts here
}, true);

function startTimer() {
  // Removed auto-commit of pendingLog here.
  // The user must manually log the session by entering a note and pressing Enter.
  if (!currentSessionStartTime) currentSessionStartTime = new Date();
  check_timer_text();
  minute = starting_min;
  second = starting_sec;
  workCount = 1;

  // minute = starting_min - 1;

  let currentTotal = minute * 60 + second;
  let maxFocus = parseInt(data.time_data.focus_time.split(":")[0]) * 60;
  let maxShort = parseInt(data.time_data.short_break.split(":")[0]) * 60;
  let maxLong = parseInt(data.time_data.long_break.split(":")[0]) * 60;

  if (!window.totalSessionSeconds || currentTotal === maxFocus || currentTotal === maxShort || currentTotal === maxLong) {
    window.totalSessionSeconds = currentTotal;
  }
  
  window.updateProgressRing(currentTotal, window.totalSessionSeconds);

  let timerFunction = () => {
    let tickTotal = minute * 60 + second;
    window.updateProgressRing(tickTotal, window.totalSessionSeconds);

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
        if (window.updateProgressRing) window.updateProgressRing(1, 1);
      }
    }
    // change timer
  };
  setIntervalFunction = setInterval(timerFunction, 1000);
}

function stopTimer() {
  check_timer_text();
  clearInterval(setIntervalFunction);
  // We no longer call logSession here to avoid fragmenting paused sessions
}

function endSession() {
  if (typeof logSession === "function") {
    logSession(false);
  }
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

// Goal Circle Interactions (since mode icons are hidden)
document.addEventListener("DOMContentLoaded", () => {
  const goalContainer = document.getElementById("daily-goal-container");
  if (goalContainer) {
    goalContainer.addEventListener("click", (e) => {
      // Cycle modes on left click
      const modes = ["focus-mode", "shortbreak-mode", "longbreak-mode"];
      const modeElements = modes.map(id => document.getElementById(id));
      const currentIndex = modeElements.findIndex(el => el && el.classList.contains("change-opacity"));
      if (currentIndex !== -1) {
        const nextIndex = (currentIndex + 1) % modes.length;
        if (modeElements[nextIndex]) modeElements[nextIndex].click();
      }
    });
    
    goalContainer.addEventListener("contextmenu", (e) => {
      // Open settings on right click
      e.preventDefault();
      ipcRenderer.send("openSettings");
    });
  }
});

