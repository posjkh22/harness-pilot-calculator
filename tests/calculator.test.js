const assert = require('node:assert/strict');
const test = require('node:test');

const calculator = require('../ui/calculator.js');

test('TC-URS-004-AC-01-03 evaluates supported operators through the pure calculator transition', () => {
  assert.equal(typeof calculator.evaluate, 'function', 'calculator.evaluate must be exported for deterministic unit coverage');

  const cases = [
    [9, '+', 3, '12'],
    [9, '-', 3, '6'],
    [9, '*', 3, '27'],
    [9, '/', 3, '3'],
    [0, '/', 0, 'Error']
  ];
  for (const [left, operator, right, expected] of cases) {
    assert.equal(calculator.evaluate(left, operator, right), expected);
  }

  const source = require('node:fs').readFileSync(require.resolve('../ui/calculator.js'), 'utf8');
  assert.doesNotMatch(source, /\beval\s*\(|\bnew\s+Function\s*\(/);
});
