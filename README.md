
# PomoFocus

A Pomodoro Timer
Created using Electron.JS

## Screenshots
#### Main Window
![dark_theme](/showoff/dark_theme.png)
#### Settings Window
![dark_settings](/showoff/dark_settings.png)

## How to run App

1. Clone the repository and navigate to the app directory:
   ```bash
   git clone https://github.com/thatsyogeshjjr/PomoFocus.git
   cd PomoFocus/app
   ```
2. Install the required dependencies:
   ```bash
   npm install
   ```
3. Start the application:
   ```bash
   npm start
   ```

**Development**
If you want to develop this further, you can use the watch command:
```bash
npm run watch
```
This will update the app live as you change data.

## Application Info
**Different Modes**
* Focus
* Short break
* Long break

You can further modify then using the settings page, link to which is in the gear icon.

The timer **automatically** changes modes after a working session for a short break (default: 5min) and after every four sessions, long break (default: 15min) is started and continues further in the same way.
