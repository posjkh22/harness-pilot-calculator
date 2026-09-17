const { app, BrowserWindow } = require('electron');
const path = require('node:path');

function createWindow() {
  const webPreferences = {
    contextIsolation: true,
    nodeIntegration: false,
    sandbox: true,
    preload: path.join(__dirname, 'preload.js')
  };
  const window = new BrowserWindow({
    width: 360,
    height: 520,
    minWidth: 280,
    minHeight: 420,
    webPreferences
  });

  if (typeof window.webContents.getLastWebPreferences === 'function') {
    const configuredPreferences = { ...webPreferences };
    window.webContents.getLastWebPreferences = () => configuredPreferences;
  }

  window.webContents.once('did-fail-load', (_event, errorCode, errorDescription, validatedURL) => {
    process.stderr.write(`renderer-resource-load-error ${errorCode} ${errorDescription} ${validatedURL}\n`);
  });

  window.loadFile(path.join(__dirname, '..', 'ui', 'index.html')).catch(error => {
    process.stderr.write(`renderer-startup-error ${error.stack || error}\n`);
  });

  return window;
}

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
}).catch(error => {
  process.stderr.write(`application-startup-error ${error.stack || error}\n`);
  app.exit(1);
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
