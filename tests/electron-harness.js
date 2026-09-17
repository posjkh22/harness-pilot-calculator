const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const http = require('node:http');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');
const { once } = require('node:events');

const electron = require('electron');
const root = path.resolve(__dirname, '..');

function requestJson(url) {
  return new Promise((resolve, reject) => {
    const request = http.get(url, response => {
      let body = '';
      response.setEncoding('utf8');
      response.on('data', chunk => { body += chunk; });
      response.on('end', () => {
        try {
          resolve(JSON.parse(body));
        } catch (error) {
          reject(error);
        }
      });
    });
    request.on('error', reject);
  });
}

async function waitForDevTools(process) {
  let output = '';
  const onData = chunk => { output += chunk.toString(); };
  process.stderr.on('data', onData);
  process.stdout.on('data', onData);
  const deadline = Date.now() + 15000;
  while (Date.now() < deadline) {
    const match = output.match(/DevTools listening on ws:\/\/127\.0\.0\.1:(\d+)\//);
    if (match) {
      const port = Number(match[1]);
      const targetsDeadline = Date.now() + 15000;
      while (Date.now() < targetsDeadline) {
        try {
          const targets = await requestJson(`http://127.0.0.1:${port}/json/list`);
          const page = targets.find(target => target.type === 'page' && target.webSocketDebuggerUrl);
          if (page) return { port, page, getOutput: () => output };
        } catch {
          // The debugging endpoint can appear shortly after its listening message.
        }
        await new Promise(resolve => setTimeout(resolve, 25));
      }
    }
    await new Promise(resolve => setTimeout(resolve, 25));
  }
  throw new Error(`Electron DevTools did not start. Output:\n${output}`);
}

class CdpClient {
  constructor(url) {
    this.socket = new WebSocket(url);
    this.nextId = 1;
    this.pending = new Map();
    this.events = [];
    this.socket.addEventListener('message', event => {
      const message = JSON.parse(event.data);
      if (message.id) {
        const pending = this.pending.get(message.id);
        if (!pending) return;
        this.pending.delete(message.id);
        if (message.error) pending.reject(new Error(message.error.message));
        else pending.resolve(message.result);
      } else {
        this.events.push(message);
      }
    });
  }

  async open() {
    if (this.socket.readyState === WebSocket.OPEN) return;
    await new Promise((resolve, reject) => {
      this.socket.addEventListener('open', resolve, { once: true });
      this.socket.addEventListener('error', reject, { once: true });
    });
  }

  command(method, params = {}) {
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.socket.send(JSON.stringify({ id, method, params }));
    });
  }

  async evaluate(expression) {
    const result = await this.command('Runtime.evaluate', {
      expression,
      awaitPromise: true,
      returnByValue: true
    });
    if (result.exceptionDetails) {
      throw new Error(result.exceptionDetails.text || 'Renderer evaluation failed');
    }
    return result.result.value;
  }

  close() {
    this.socket.close();
  }
}

async function launchCalculator() {
  const userData = await fs.mkdtemp(path.join(os.tmpdir(), 'pilot-calculator-'));
  const child = spawn(electron, ['--inspect=0', root, `--user-data-dir=${userData}`, '--remote-debugging-port=0'], {
    cwd: root,
    env: { ...process.env, ELECTRON_IS_DEV: '0', LANG: 'en_US.UTF-8', TZ: 'UTC' },
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true
  });
  const devTools = await waitForDevTools(child);
  const cdp = new CdpClient(devTools.page.webSocketDebuggerUrl);
  await cdp.open();
  await cdp.command('Runtime.enable');
  await cdp.command('Page.enable');
  await cdp.evaluate(`(() => {
    const display = document.querySelector('[data-testid="display"]');
    if (!display) throw new Error('Calculator display is missing');
    return document.readyState;
  })()`);

  async function close() {
    cdp.close();
    if (!child.killed) {
      child.kill();
      await Promise.race([once(child, 'exit'), new Promise(resolve => setTimeout(resolve, 3000))]);
    }
    await fs.rm(userData, { recursive: true, force: true });
  }

  return { child, cdp, userData, devTools, close };
}

async function waitForDisplay(cdp, expected) {
  const deadline = Date.now() + 3000;
  while (Date.now() < deadline) {
    const value = await cdp.evaluate(`document.querySelector('[data-testid="display"]')?.textContent`);
    if (typeof expected === 'function' ? expected(value) : value === expected) return value;
    await new Promise(resolve => setTimeout(resolve, 10));
  }
  const actual = await cdp.evaluate(`document.querySelector('[data-testid="display"]')?.textContent`);
  assert.equal(actual, expected);
}

async function click(cdp, testId) {
  const clicked = await cdp.evaluate(`(() => {
    const element = document.querySelector('[data-testid="${testId}"]');
    if (!element) return false;
    element.click();
    return true;
  })()`);
  assert.equal(clicked, true, `Missing button ${testId}`);
}

async function captureFailure(harness, label) {
  // Under the harness, failure evidence belongs to that run
  // (.harness/runs/<runId>/04-verification/test-results); a developer running the
  // tests by hand gets the project-level test-results/ (gitignored).
  const artifactDir = process.env.HARNESS_TEST_RESULTS_DIR || path.join(root, 'test-results');
  await fs.mkdir(artifactDir, { recursive: true });
  const safeLabel = label.replace(/[^a-z0-9-]/gi, '-');
  try {
    const screenshot = await harness.cdp.command('Page.captureScreenshot', { format: 'png' });
    await fs.writeFile(path.join(artifactDir, `${safeLabel}.png`), Buffer.from(screenshot.data, 'base64'));
  } catch {
    // Preserve the original assertion when the renderer has already exited.
  }
  await fs.writeFile(path.join(artifactDir, `${safeLabel}.server.log`), harness.devTools.getOutput(), 'utf8');
}

module.exports = {
  root,
  electron,
  launchCalculator,
  waitForDisplay,
  click,
  captureFailure
};
