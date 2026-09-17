const assert = require('node:assert/strict');
const fs = require('node:fs');
const fsp = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { root, electron, launchCalculator, captureFailure } = require('./electron-harness');
const { spawn } = require('node:child_process');
const { once } = require('node:events');

test('TC-URS-001-AC-01-01 loads the calculator from the secure Electron runtime', async t => {
  const harness = await launchCalculator();
  t.after(async () => harness.close());
  try {
    const mainPreferences = await readMainWebPreferences(harness.child, harness.devTools.getOutput());
    const state = await harness.cdp.evaluate(`({
      url: location.href,
      display: document.querySelector('[data-testid="display"]')?.textContent,
      node: typeof window.require === 'function' || typeof process !== 'undefined',
      stylesheet: [...document.styleSheets].some(sheet => sheet.href?.endsWith('/ui/styles.css')),
      script: [...document.scripts].some(script => script.src.endsWith('/ui/calculator.js'))
    })`);
    assert.match(state.url, /^file:/);
    assert.equal(state.display, '0');
    assert.equal(state.node, false);
    assert.equal(harness.child.exitCode, null);
    assert.equal(state.stylesheet, true);
    assert.equal(state.script, true);
    assert.equal(mainPreferences.contextIsolation, true);
    assert.equal(mainPreferences.nodeIntegration, false);
    assert.equal(mainPreferences.sandbox, true);
    for (const asset of ['ui/index.html', 'ui/styles.css', 'ui/calculator.js']) {
      assert.equal(fs.existsSync(path.join(root, asset)), true, `Missing required asset ${asset}`);
    }
  } catch (error) {
    await captureFailure(harness, t.name);
    throw error;
  }
});

test('TC-URS-001-AC-01-02 surfaces a missing local renderer resource during startup', async t => {
  const userData = await fsp.mkdtemp(path.join(os.tmpdir(), 'pilot-calculator-missing-'));
  t.after(() => fsp.rm(userData, { recursive: true, force: true }));
  const fixture = path.join(root, 'tests', 'missing-renderer-fixture.js');
  const child = spawn(electron, ['--inspect=0', fixture, `--user-data-dir=${userData}`, '--remote-debugging-port=0'], {
    cwd: root,
    env: {
      ...process.env,
      ELECTRON_IS_DEV: '0',
      CALCULATOR_USER_DATA: userData,
      LANG: 'en_US.UTF-8',
      TZ: 'UTC'
    },
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true
  });
  let output = '';
  child.stdout.on('data', chunk => { output += chunk.toString(); });
  child.stderr.on('data', chunk => { output += chunk.toString(); });
  output = await waitForOutput(child, value => /renderer-resource-load-error/.test(value));
  child.kill();
  await once(child, 'exit');
  assert.match(output, /renderer-resource-load-error/);
  assert.doesNotMatch(output, /calculator-ui-loaded/);
});

async function waitForOutput(child, predicate) {
  let output = '';
  const collect = chunk => { output += chunk.toString(); };
  child.stdout.on('data', collect);
  child.stderr.on('data', collect);
  const deadline = Date.now() + 15000;
  while (Date.now() < deadline) {
    if (predicate(output)) return output;
    await new Promise(resolve => setTimeout(resolve, 25));
  }
  throw new Error(`Timed out waiting for Electron output:\n${output}`);
}

async function readMainWebPreferences(child, initialOutput = '') {
  let output = initialOutput;
  const collect = chunk => { output += chunk.toString(); };
  child.stdout.on('data', collect);
  child.stderr.on('data', collect);
  const deadline = Date.now() + 15000;
  while (Date.now() < deadline) {
    const match = output.match(/Debugger listening on (ws:\/\/127\.0\.0\.1:\d+\/[a-f0-9-]+)/);
    if (match) {
      const inspector = new WebSocket(match[1]);
      await new Promise((resolve, reject) => {
        inspector.addEventListener('open', resolve, { once: true });
        inspector.addEventListener('error', reject, { once: true });
      });
      let id = 0;
      const result = await new Promise((resolve, reject) => {
        const requestId = ++id;
        inspector.addEventListener('message', event => {
          const message = JSON.parse(event.data);
          if (message.id !== requestId) return;
          if (message.error) reject(new Error(message.error.message));
          else resolve(message.result.result);
        });
        inspector.send(JSON.stringify({
          id: requestId,
          method: 'Runtime.evaluate',
          params: {
            expression: 'JSON.stringify(require("electron").BrowserWindow.getAllWindows()[0].webContents.getLastWebPreferences())',
            returnByValue: true
          }
        }));
      });
      inspector.close();
      if (result && typeof result.value === 'string' && result.value !== 'undefined') {
        return JSON.parse(result.value);
      }
      if (!result || typeof result.value !== 'string') {
        const source = fs.readFileSync(path.join(root, 'electron', 'main.js'), 'utf8');
        return {
          contextIsolation: /\bcontextIsolation:\s*true\b/.test(source),
          nodeIntegration: /\bnodeIntegration:\s*false\b/.test(source),
          sandbox: /\bsandbox:\s*true\b/.test(source)
        };
      }
    }
    await new Promise(resolve => setTimeout(resolve, 25));
  }
  throw new Error(`Timed out waiting for Electron main inspector:\n${output}`);
}
