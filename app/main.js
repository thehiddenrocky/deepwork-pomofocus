const {
  app,
  BrowserWindow,
  ipcMain,
  Notification,
  webContents,
} = require("electron");
const electronLocalshortcut = require("./electron-localshortcut");
let SettingWin;
let mainWindow;

// SET ENV
process.env.NODE_ENV = "production";

// Get Data from JSON file
const fs = require("fs");
const path = require("path");
const configPath = path.join(__dirname, "config.json");

function loadJSON(filename = "") {
  try {
    return fs.existsSync(filename)
      ? JSON.parse(fs.readFileSync(filename).toString())
      : {};
  } catch (error) {
    console.error("Error loading JSON:", error);
    return {};
  }
}

let data = loadJSON(configPath);

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 460,
    height: 380,
    frame: false,
    resizable: false,
    skipTaskbar: false,
    icon: path.join(__dirname, "home/images/icons/icon.png"),
    alwaysOnTop: !!(data && data.always_on_top),
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      devTools: true,
    },
  });

  if (data && data.always_on_top) {
    if (process.platform === "darwin") {
      // Use 'floating' to be above normal windows.
      // visibleOnFullScreen ensures it stays above full-screen apps without breaking Cmd+Tab.
      mainWindow.setAlwaysOnTop(true, "floating", 1);
      // Ensure it shows up on all workspaces and over full-screen apps
      mainWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
    } else {
      mainWindow.setAlwaysOnTop(true);
    }
  }

  mainWindow.loadFile("home/index.html");
  if (process.platform === "darwin") {
    app.dock.show();
  }
  mainWindow.on("closed", () => {
    mainWindow = null;
    app.quit();
  });

  // Shortcut keys
  /* electronLocalshortcut.register(mainWindow, "Space", () => {
    mainWindow.webContents.send("Pause-timer");
  }); */
}

ipcMain.on("closeApp", () => {
  if (mainWindow) mainWindow.close();
});
ipcMain.on("minApp", () => {
  if (mainWindow) mainWindow.minimize();
});

ipcMain.on("openSettings", () => {
  const isSettingOpened = () =>
    !SettingWin?.isDestroyed() && SettingWin?.isFocusable();
  if (isSettingOpened()) {
    SettingWin.close();
  }

  SettingWin = new BrowserWindow({
    height: 500,
    width: 350,
    frame: false,
    alwaysOnTop: !!(data && data.always_on_top),
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      devTools: false,
    },
    resizable: false,
  });

  if (data && data.always_on_top && process.platform === "darwin") {
    SettingWin.setAlwaysOnTop(true, "floating", 1);
    SettingWin.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  }

  SettingWin.loadFile("settings/index.html");
});

ipcMain.on("closeSetting", () => {
  if (SettingWin) SettingWin.close();
});
ipcMain.on("minSetting", () => {
  if (SettingWin) SettingWin.minimize();
});
ipcMain.on("ReloadMain", () => {
  app.relaunch();
  app.quit();
});

// Notifications
ipcMain.on("ShowNotification_focus", () => {
  NOTIFICATION_TITLE = "PomoFocus!";
  NOTIFICATION_BODY = "Time to focus up.";
  new Notification({
    title: NOTIFICATION_TITLE,
    body: NOTIFICATION_BODY,
  }).show();
});

ipcMain.on("ShowNotification_shortbreak", () => {
  NOTIFICATION_TITLE = "PomoFocus!";
  NOTIFICATION_BODY = "Short break started.";
  new Notification({
    title: NOTIFICATION_TITLE,
    body: NOTIFICATION_BODY,
  }).show();
});

ipcMain.on("ShowNotification_longbreak", () => {
  NOTIFICATION_TITLE = "PomoFocus!";
  NOTIFICATION_BODY = "Long break started";
  new Notification({
    title: NOTIFICATION_TITLE,
    body: NOTIFICATION_BODY,
  }).show();
});

app.on("ready", () => {
  if (process.platform === "darwin") {
    if (app.setActivationPolicy) {
      app.setActivationPolicy("regular");
    }
    app.dock.setIcon(path.join(__dirname, "home/images/icons/icon.png"));
  }
  createWindow();
});

app.on("window-all-closed", function () {
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (mainWindow === null) createWindow();
});
