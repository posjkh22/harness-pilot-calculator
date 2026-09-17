const { app, BrowserWindow } = require('electron');
const path = require('node:path');

if (process.env.CALCULATOR_USER_DATA) {
  app.setPath('userData', process.env.CALCULATOR_USER_DATA);
}

app.whenReady().then(async () => {
  const window = new BrowserWindow({
    show: false,
    webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true }
  });
  let failed = false;
  window.webContents.once('did-fail-load', (_event, errorCode, errorDescription, validatedURL) => {
    failed = true;
    process.stdout.write(`renderer-resource-load-error ${errorCode} ${errorDescription} ${validatedURL}\n`);
    app.exit(0);
  });
  await window.loadFile(path.join(__dirname, 'missing-ui-resource.html')).catch(() => {});
  if (failed) return;
  process.stdout.write('calculator-ui-loaded\n');
  app.exit(1);
}).catch(error => {
  process.stderr.write(`${error.stack}\n`);
  app.exit(1);
});
