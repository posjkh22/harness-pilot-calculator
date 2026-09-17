const assert = require('node:assert/strict');
const test = require('node:test');
const { click, launchCalculator, waitForDisplay, captureFailure } = require('./electron-harness');

const required = [
  ...Array.from({ length: 10 }, (_, digit) => [`digit-${digit}`, String(digit)]),
  ['operator-add', '+'],
  ['operator-subtract', '-'],
  ['operator-multiply', '*'],
  ['operator-divide', '/'],
  ['equals', '='],
  ['clear', 'Clear']
];

async function withCalculator(t, callback) {
  const harness = await launchCalculator();
  t.after(async () => harness.close());
  try {
    await callback(harness);
  } catch (error) {
    await captureFailure(harness, t.name);
    throw error;
  }
}

async function enter(harness, digits) {
  for (const digit of String(digits)) await click(harness.cdp, `digit-${digit}`);
}

test('TC-URS-002-AC-01-01 renders every required calculator button with stable identifiers', async t => {
  await withCalculator(t, async ({ cdp }) => {
    const result = await cdp.evaluate(`(() => {
      const elements = [...document.querySelectorAll('[data-testid]')];
      return elements
        .filter(element => element.tagName === 'BUTTON')
        .map(element => ({ id: element.dataset.testid, label: element.getAttribute('aria-label') || element.textContent.trim() }));
    })()`);
    assert.equal(result.length, 16);
    assert.deepEqual(result.map(item => item.id), required.map(item => item[0]));
    assert.deepEqual(result.map(item => item.label), required.map(item => item[1]));
    assert.equal(new Set(result.map(item => item.id)).size, 16);
  });
});

test('TC-URS-002-AC-01-02 rejects an unknown calculator action without changing the display', async t => {
  await withCalculator(t, async ({ cdp }) => {
    await waitForDisplay(cdp, '0');
    const result = await cdp.evaluate(`(() => {
      const diagnostics = [];
      const originalError = console.error;
      console.error = (...args) => diagnostics.push(args);
      const button = document.createElement('button');
      button.dataset.action = 'not-a-calculator-action';
      button.textContent = 'invalid';
      document.body.append(button);
      button.click();
      button.remove();
      const invalidDigit = document.createElement('button');
      invalidDigit.dataset.action = 'digit';
      invalidDigit.dataset.digit = 'not-a-digit';
      document.body.append(invalidDigit);
      invalidDigit.click();
      invalidDigit.remove();
      console.error = originalError;
      return {
        display: document.querySelector('[data-testid="display"]')?.textContent,
        required: document.querySelectorAll('button[data-testid]').length,
        diagnostics
      };
    })()`);
    assert.equal(result.display, '0');
    assert.equal(result.required, 16);
    assert.deepEqual(result.diagnostics, [
      ['calculator-invalid-action', 'not-a-calculator-action'],
      ['calculator-invalid-digit', null]
    ]);
  });
});

test('TC-URS-003-AC-01-01 displays the selected digit immediately', async t => {
  await withCalculator(t, async harness => {
    await click(harness.cdp, 'digit-7');
    await waitForDisplay(harness.cdp, value => value.includes('7'));
    await click(harness.cdp, 'digit-2');
    await waitForDisplay(harness.cdp, '72');
  });
});

test('TC-URS-004-AC-01-01 displays results for all four basic operations', async t => {
  await withCalculator(t, async harness => {
    for (const [operator, expected] of [['add', '10'], ['subtract', '6'], ['multiply', '16'], ['divide', '4']]) {
      await click(harness.cdp, 'clear');
      await enter(harness, 8);
      await click(harness.cdp, `operator-${operator}`);
      await enter(harness, 2);
      await click(harness.cdp, 'equals');
      await waitForDisplay(harness.cdp, expected);
    }
  });
});

test('TC-URS-004-AC-01-02 rejects an incomplete expression instead of displaying a numeric result', async t => {
  await withCalculator(t, async harness => {
    await click(harness.cdp, 'digit-8');
    await click(harness.cdp, 'operator-add');
    await click(harness.cdp, 'equals');
    await waitForDisplay(harness.cdp, value => value !== '8' && value !== '0' && value !== 'NaN' && value !== 'Infinity');
    const display = await harness.cdp.evaluate(`document.querySelector('[data-testid="display"]').textContent`);
    assert.equal(display, 'Error');
  });
});

test('TC-URS-005-AC-01-01 displays exactly Error for a nonzero dividend divided by zero', async t => {
  await withCalculator(t, async harness => {
    await enter(harness, 8);
    await click(harness.cdp, 'operator-divide');
    await click(harness.cdp, 'digit-0');
    await click(harness.cdp, 'equals');
    await waitForDisplay(harness.cdp, 'Error');
    assert.equal(await harness.cdp.evaluate(`document.querySelector('[data-testid="display"]').textContent`), 'Error');
  });
});

test('TC-URS-005-AC-01-02 displays exactly Error for zero divided by zero', async t => {
  await withCalculator(t, async harness => {
    await click(harness.cdp, 'digit-0');
    await click(harness.cdp, 'operator-divide');
    await click(harness.cdp, 'digit-0');
    await click(harness.cdp, 'equals');
    await waitForDisplay(harness.cdp, 'Error');
    assert.equal(await harness.cdp.evaluate(`document.querySelector('[data-testid="display"]').textContent`), 'Error');
  });
});

test('TC-URS-006-AC-01-01 resets a numeric display to zero', async t => {
  await withCalculator(t, async harness => {
    await enter(harness, 42);
    await waitForDisplay(harness.cdp, '42');
    await click(harness.cdp, 'clear');
    await waitForDisplay(harness.cdp, '0');
  });
});

test('TC-URS-006-AC-01-02 resets an Error display to zero', async t => {
  await withCalculator(t, async harness => {
    await enter(harness, 8);
    await click(harness.cdp, 'operator-divide');
    await click(harness.cdp, 'digit-0');
    await click(harness.cdp, 'equals');
    await waitForDisplay(harness.cdp, 'Error');
    await click(harness.cdp, 'clear');
    await waitForDisplay(harness.cdp, '0');
    assert.equal(await harness.cdp.evaluate(`document.querySelector('[data-testid="display"]').textContent`), '0');
  });
});
