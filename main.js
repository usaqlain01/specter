const { app, BrowserWindow, ipcMain, globalShortcut } = require('electron');
const path = require('path');

let win;

// ── Stability: reduce GPU pressure on transparent windows ──
// Uncomment the line below if you still get crashes — it forces software rendering
// app.disableHardwareAcceleration();
app.commandLine.appendSwitch('disable-gpu-compositing');
app.commandLine.appendSwitch('disable-software-rasterizer');
app.commandLine.appendSwitch('ignore-gpu-blocklist');

function createWindow() {
  win = new BrowserWindow({
    width: 960,
    height: 600,
    transparent: true,
    frame: false,
    hasShadow: false,
    alwaysOnTop: true,
    resizable: true,
    title: 'Specter',
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      backgroundThrottling: false,  // prevent throttle when unfocused
    },
  });

  win.loadFile('index.html');

  // ── IPC handlers ──
  ipcMain.on('set-ignore-mouse', (_e, ignore) => {
    if (win && !win.isDestroyed()) {
      win.setIgnoreMouseEvents(ignore, { forward: true });
    }
  });

  ipcMain.on('set-always-on-top', (_e, on) => {
    if (win && !win.isDestroyed()) {
      win.setAlwaysOnTop(on);
    }
  });

  ipcMain.on('minimize-window', () => {
    if (win && !win.isDestroyed()) {
      win.minimize();
    }
  });

  // ── Crash recovery ──
  win.webContents.on('render-process-gone', (event, details) => {
    console.error('Renderer crashed:', details.reason);
    if (win && !win.isDestroyed()) {
      win.destroy();
    }
    createWindow();
  });

  win.on('unresponsive', () => {
    console.error('Window unresponsive — reloading');
    if (win && !win.isDestroyed()) {
      win.webContents.reload();
    }
  });

  win.on('closed', () => { win = null; });
}

// ── GPU process crash recovery ──
app.on('child-process-gone', (event, details) => {
  if (details.type === 'GPU') {
    console.error('GPU process crashed — recreating window');
    if (win && !win.isDestroyed()) {
      win.destroy();
    }
    createWindow();
  }
});

app.whenReady().then(createWindow);
app.on('window-all-closed', () => app.quit());