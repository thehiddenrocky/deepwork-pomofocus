# PomoFocus: The Deep Work Edition ⏱️

[![License: CC0-1.0](https://img.shields.io/badge/License-CC0%201.0-lightgrey.svg)](http://creativecommons.org/publicdomain/zero/1.0/)

A standalone, local-first Pomodoro timer engineered for maximum focus and zero latency. Built with Electron.js, Vanilla CSS, and pure DOM manipulation.

Read the [PHILOSOPHY.md](PHILOSOPHY.md) to understand the "Deep Work" concepts driving this project.

## Why Another Timer?
Because most timers are distractions. They require mouse clicks, store your data in the cloud, or force you to stare at countdown numbers. **PomoFocus is built for developers and performance-minded individuals who treat their attention as their most valuable system resource.**

### Core Features
- ⌨️ **Hands-Free Control:** 100% keyboard accessible. Press `Space` to toggle, `k` to acknowledge alarms, and `/` to log notes. Never touch your mouse.
- 📊 **Local Audit Log:** Every session is streamed directly to a local CSV (`~/pomofocus-logs.csv`). No cloud, no subscriptions, full data ownership.
- 🎯 **Session Intentionality:** Forces a 5-second "Session Note" prompt after every block to prevent you from slipping into "Shallow Work."
- 🔊 **Synthesized Rewards:** Uses the Web Audio API (`AudioContext`) and canvas particles to create a "Glitter & Zang" dopamine loop when you complete a deep work session.
- ⭕ **Peripheral Progress Ring:** A smooth SVG ring lets you gauge remaining time subconsciously without "reading" numbers.

---

## 🚀 Quick Start

1. **Clone the repository:**
   ```bash
   git clone https://github.com/thatsyogeshjjr/PomoFocus.git
   cd PomoFocus/app
   ```
2. **Install dependencies:**
   ```bash
   npm install
   ```
3. **Start the Focus Engine:**
   ```bash
   npm start
   ```

*(For development, use `npm run watch` to enable hot-reloading).*

## 📈 Analyzing Your Lead Measures
Included in the `scripts/` directory is a Python script designed to parse your `pomofocus-logs.csv` and output a "Performance Report" of your Deep Work hours. 

```bash
python scripts/analyze_logs.py
```

## Shortcuts Cheat Sheet
- `Space`: Start/Pause Timer
- `k`: Acknowledge Alarm & Stop Sound
- `/` or `Cmd/Ctrl + N`: Focus Session Note
- `Cmd/Ctrl + 1, 2, 3`: Switch Modes (Focus, Short Break, Long Break)
- `Cmd/Ctrl + ,`: Open Settings
- `Cmd/Ctrl + M`: Minimize
- `Cmd/Ctrl + Q`: Quit
