const {
  app,
  BrowserWindow,
  ipcMain,
  Notification,
  webContents,
} = require("electron");
const electronLocalshortcut = require("./electron-localshortcut");
let SettingWin;

// SET ENV
process.env.NODE_ENV = "production";

// Get Data from JSON file
const fs = require("fs");
function loadJSON(filename = "") {
  return JSON.parse(
    fs.existsSync(filename) ? fs.readFileSync(filename).toString() : "null"
  );
}

data = loadJSON("config.json");

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 460,
    height: 275,
    frame: false,
    resizable: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      devTools: true,
    },
  });

  if (data.always_on_top) {
    mainWindow.setAlwaysOnTop(true, "screen");
  }

  mainWindow.loadFile("home/index.html");
  mainWindow.on("closed", () => {
    mainWindow = null;
    app.quit();
  });

  ipcMain.on("closeApp", () => {
    mainWindow.close();
  });
  ipcMain.on("minApp", () => {
    mainWindow.minimize();
  });

  ipcMain.on("openSettings", () => {
    const isSettingOpened = () =>
      !SettingWin?.isDestroyed() && SettingWin?.isFocusable();
    if (isSettingOpened()) {
      SettingWin.close();
    }

    SettingWin = new BrowserWindow({
      parent: mainWindow,
      height: 500,
      width: 350,
      frame: false,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false,
        devTools: false,
      },
      resizable: false,
    });
    SettingWin.loadFile("settings/index.html");
  });

  ipcMain.on("closeSetting", () => {
    SettingWin.close();
  });
  ipcMain.on("minSetting", () => {
    SettingWin.minimize();
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

  // Shortcut keys
  /* electronLocalshortcut.register(mainWindow, "Space", () => {
    mainWindow.webContents.send("Pause-timer");
  }); */
}

app.on("ready", createWindow);

app.on("window-all-closed", function () {
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (mainWindow === null) createWindow();
});
