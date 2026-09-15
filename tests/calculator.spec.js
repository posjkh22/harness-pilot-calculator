const fs = require('fs');
const net = require('net');
const os = require('os');
const path = require('path');
const { _electron: electron, test: base, expect } = require('@playwright/test');

const test = base.extend({
  calculator: async ({}, use, testInfo) => {
    const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pilot-calculator-'));
    const port = await reservePort();
    const logs = [];
    let app;
    let page;
    let tracingStarted = false;

    try {
      app = await electron.launch({
        executablePath: require('electron'),
        args: [
          `--user-data-dir=${userDataDir}`,
          `--test-port=${port}`,
          path.resolve(__dirname, '..', 'electron', 'main.js'),
        ],
        env: { ...process.env, LANG: 'ko_KR.UTF-8', TZ: 'Asia/Seoul' },
        timeout: 30_000,
      });
      page = await app.firstWindow();
      page.on('console', message => logs.push(`[console:${message.type()}] ${message.text()}`));
      page.on('pageerror', error => logs.push(`[pageerror] ${error.stack || error.message}`));
      const child = app.process();
      child?.stdout?.on('data', chunk => logs.push(`[stdout] ${chunk.toString()}`));
      child?.stderr?.on('data', chunk => logs.push(`[stderr] ${chunk.toString()}`));
      await page.waitForLoadState('domcontentloaded');
      await page.locator('[data-testid="display"]').waitFor({ state: 'visible' });
      await page.context().tracing.start({ screenshots: true, snapshots: true });
      tracingStarted = true;
      await use({ app, page, logs });
    } catch (error) {
      logs.push(`[fixture-error] ${error.stack || error.message}`);
      throw error;
    } finally {
      if (testInfo.status !== testInfo.expectedStatus && page) {
        try { await page.screenshot({ path: testInfo.outputPath('failure.png'), fullPage: true }); }
        catch (error) { logs.push(`[screenshot-error] ${error.message}`); }
      }
      if (tracingStarted) {
        try { await page.context().tracing.stop({ path: testInfo.outputPath('trace.zip') }); }
        catch (error) { logs.push(`[trace-error] ${error.message}`); }
      }
      await testInfo.attach('electron-console-and-server-log', {
        body: Buffer.from(logs.join('\n') || '(no console or process output)', 'utf8'),
        contentType: 'text/plain',
      });
      if (app) {
        try { await app.close(); }
        catch (error) { logs.push(`[close-error] ${error.message}`); }
      }
      fs.rmSync(userDataDir, { recursive: true, force: true });
    }
  },
});

async function reservePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      server.close(error => error ? reject(error) : resolve(address.port));
    });
  });
}

function selectorFor(token) {
  if (token === '=') return '[data-testid="equals"]';
  if (token === 'C') return '[data-testid="clear"]';
  if (/^[0-9]$/.test(token)) return `[data-testid="digit-${token}"]`;
  return `[data-testid="operator-${token}"]`;
}

async function clickSequence(page, sequence) {
  for (const token of sequence) await page.locator(selectorFor(token)).click();
}

async function displayText(page) {
  return page.locator('[data-testid="display"]').textContent();
}

test.describe('Electron calculator integration', () => {
  test('TC-URS-001-AC-01-01 Electron loads HTML and CSS in the Electron runtime', async ({ calculator }) => {
    const { page } = calculator;
    await expect(page.locator('[data-testid="calculator"]')).toBeVisible();
    await expect(page.locator('[data-testid="display"]')).toBeVisible();
    await expect(page.locator('button')).toHaveCount(16);
    const styles = await page.locator('[data-testid="calculator"]').evaluate(element => {
      const computed = getComputedStyle(element);
      return { display: computed.display, boxSizing: computed.boxSizing, backgroundColor: computed.backgroundColor };
    });
    expect(styles.display).not.toBe('');
    expect(styles.boxSizing).toBe('border-box');
    expect(styles.backgroundColor).not.toBe('rgba(0, 0, 0, 0)');
    const rendererGlobals = await page.evaluate(() => ({
      process: typeof window.process,
      require: typeof window.require,
      nodeVersion: typeof window.process?.versions?.node,
    }));
    expect(rendererGlobals).toEqual({ process: 'undefined', require: 'undefined', nodeVersion: 'undefined' });
  });

  test('TC-URS-002-AC-01-01 calculator exposes the required buttons exactly once', async ({ calculator }) => {
    const { page } = calculator;
    const digits = await page.locator('[data-testid^="digit-"]').allTextContents();
    const operators = await page.locator('[data-testid^="operator-"]').allTextContents();
    expect(digits).toHaveLength(10);
    expect([...digits].sort()).toEqual(['0', '1', '2', '3', '4', '5', '6', '7', '8', '9']);
    expect(operators).toHaveLength(4);
    expect([...operators].sort()).toEqual(['*', '+', '-', '/']);
    await expect(page.locator('[data-testid="equals"]')).toHaveCount(1);
    await expect(page.locator('[data-testid="clear"]')).toHaveCount(1);
    await expect(page.locator('[data-testid="clear"]')).toHaveText('C');
  });

  test('TC-URS-002-AC-01-02 unsupported action leaves calculator state unchanged', async ({ calculator }) => {
    const { page, logs } = calculator;
    await page.evaluate(() => {
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.action = '%';
      document.querySelector('[data-testid="calculator"]').append(button);
      button.click();
      button.remove();
    });
    expect(await displayText(page)).toBe('0');
    expect(await page.locator('[data-testid="display"]').textContent()).not.toMatch(/NaN|Infinity|%/);
    expect(logs.some(entry => entry.includes('Unknown calculator action: %'))).toBe(true);
  });

  test('TC-URS-003-AC-01-01 one digit input is shown on the display', async ({ calculator }) => {
    const { page } = calculator;
    await page.locator('[data-testid="digit-7"]').click();
    await expect(page.locator('[data-testid="display"]')).toHaveText('7');
  });

  test('TC-URS-003-AC-02-01 consecutive digits accumulate in click order', async ({ calculator }) => {
    const { page } = calculator;
    await clickSequence(page, ['1', '2', '3']);
    await expect(page.locator('[data-testid="display"]')).toHaveText('123');
    expect(await displayText(page)).toMatch(/^123$/);
  });

  test('TC-URS-003-AC-02-02 repeated initial zero does not create leading zeros', async ({ calculator }) => {
    const { page } = calculator;
    await clickSequence(page, ['0', '0', '5']);
    expect(await displayText(page)).not.toMatch(/^00|005$/);
    expect(await displayText(page)).toBe('5');
  });

  for (const [id, operator, expected] of [
    ['TC-URS-004-AC-01-01', '+', '10'],
    ['TC-URS-004-AC-02-01', '-', '6'],
    ['TC-URS-004-AC-03-01', '*', '16'],
    ['TC-URS-004-AC-04-01', '/', '4'],
  ]) {
    test(`${id} 8 ${operator} 2 displays ${expected}`, async ({ calculator }) => {
      const { page } = calculator;
      await clickSequence(page, ['8', operator, '2', '=']);
      await expect(page.locator('[data-testid="display"]')).toHaveText(expected);
    });
  }

  test('TC-URS-004-AC-01-02 equals without a second operand does not calculate', async ({ calculator }) => {
    const { page } = calculator;
    await clickSequence(page, ['8', '+', '=']);
    const display = await displayText(page);
    expect(display).toBe('8');
    expect(display).not.toMatch(/^(10|NaN|Infinity)$/);
  });

  test('TC-URS-005-AC-01-01 division of 8 by zero displays exactly Error', async ({ calculator }) => {
    const { page } = calculator;
    await clickSequence(page, ['8', '/', '0', '=']);
    expect(await displayText(page)).toBe('Error');
    expect(await displayText(page)).not.toMatch(/^(Infinity|NaN)$/);
  });

  test('TC-URS-005-AC-02-01 division of zero by zero displays exactly Error', async ({ calculator }) => {
    const { page } = calculator;
    await clickSequence(page, ['0', '/', '0', '=']);
    expect(await displayText(page)).toBe('Error');
    expect(await displayText(page)).not.toMatch(/^(Infinity|NaN)$/);
  });

  test('TC-URS-006-AC-01-01 clear resets an in-progress input to zero', async ({ calculator }) => {
    const { page } = calculator;
    await clickSequence(page, ['1', '2', '3']);
    await expect(page.locator('[data-testid="display"]')).toHaveText('123');
    await page.locator('[data-testid="clear"]').click();
    expect(await displayText(page)).toBe('0');
    expect(await displayText(page)).not.toBe('123');
  });

  test('TC-URS-006-AC-01-02 clear resets a result and removes pending state', async ({ calculator }) => {
    const { page } = calculator;
    await clickSequence(page, ['8', '+', '2', '=']);
    await expect(page.locator('[data-testid="display"]')).toHaveText('10');
    await page.locator('[data-testid="clear"]').click();
    await expect(page.locator('[data-testid="display"]')).toHaveText('0');
    await clickSequence(page, ['5', '=']);
    expect(await displayText(page)).toBe('5');
    expect(await displayText(page)).not.toBe('105');
  });

  test('TC-URS-006-AC-01-03 clear resets Error state to zero', async ({ calculator }) => {
    const { page } = calculator;
    await clickSequence(page, ['8', '/', '0', '=']);
    await expect(page.locator('[data-testid="display"]')).toHaveText('Error');
    await page.locator('[data-testid="clear"]').click();
    expect(await displayText(page)).toBe('0');
    expect(await displayText(page)).not.toContain('Error');
  });
});
