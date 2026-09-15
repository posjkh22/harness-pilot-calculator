const { app, BrowserWindow } = require('electron');
const path = require('path');

function createWindow() {
  try {
    const window = new BrowserWindow({
      width: 800,
      height: 600,
      webPreferences: {
        preload: path.join(__dirname, 'preload.js'),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
      },
    });

    window.loadFile(path.join(__dirname, '..', 'ui', 'index.html'))
      .catch(error => {
        console.error('Failed to load calculator UI:', error);
        app.quit();
      });
  } catch (error) {
    console.error('Failed to create calculator window:', error);
    app.quit();
  }
}

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
}).catch(error => {
  console.error('Electron startup failed:', error);
  app.quit();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
