# Hands-Free Keyboard Experience Plan

To achieve a completely hands-free experience for PomoFocus, we need to implement a robust keyboard shortcut system. Currently, the app only supports toggling the timer via the `Spacebar` and submitting notes via `Enter`.

Here is the step-by-step, actionable plan to make the entire app keyboard-accessible:

## 1. Global vs. Local Shortcuts
- **Recommendation:** Use `electron-localshortcut` (already a dependency in `main.js` but commented out) or standard DOM `keydown` event listeners in `app/home/index.js` to define application-specific local shortcuts so they only trigger when the app is in focus.

## 2. Recommended Key Bindings
Implement the following shortcuts to control every aspect of the app without a mouse:

### Session Controls
- **Toggle Timer (Start/Pause):** `Spacebar` (Already partially implemented, but should be centralized).
- **Restart Current Session:** `Ctrl + R` / `Cmd + R`
- **Skip to Next Mode:** `Ctrl + Right Arrow` / `Cmd + Right Arrow`
- **Focus Note Input:** `/` or `Ctrl + N` / `Cmd + N` (Jumps cursor directly to the "Session note" box).

### Mode Switching
- **Focus Mode:** `Ctrl + 1` / `Cmd + 1`
- **Short Break Mode:** `Ctrl + 2` / `Cmd + 2`
- **Long Break Mode:** `Ctrl + 3` / `Cmd + 3`

### App & Window Controls
- **Open Settings:** `Ctrl + ,` / `Cmd + ,` (Standard macOS/Windows shortcut for preferences).
- **Minimize App:** `Ctrl + M` / `Cmd + M`
- **Quit App:** `Ctrl + Q` / `Cmd + Q`
- **Close Settings (when open):** `Escape`

## 3. Implementation Steps
1. **Unify Keydown Listeners:** Update `document.addEventListener("keydown", ...)` in `app/home/index.js` to use a `switch(e.key)` statement to handle the various keyboard inputs efficiently.
2. **Bind Mode Switches:** Trigger the exact same `click` logic for the Focus (`#focus-mode`), Short break (`#shortbreak-mode`), and Long break (`#longbreak-mode`) images when their respective shortcuts are pressed.
3. **IPC Messaging for Window Controls:** For app-level actions like Settings, Minimize, and Quit, send messages to `ipcMain` from the renderer via `ipcRenderer.send("openSettings")`, `ipcRenderer.send("minApp")`, etc., when the shortcut keys are pressed.
4. **Visual Feedback:** We have already added focus outlines for `tab` navigation. Add a small visual highlight/flash when a mode is switched via a shortcut so the user knows their action registered.

## Summary
By intercepting these keys in the renderer process (and ignoring them if the user is currently typing in the note text box), you will never need to use your mouse again.

Let me know if you would like me to proceed with implementing this plan!