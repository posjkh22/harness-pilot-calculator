(function calculatorModule() {
  delete globalThis.process;

  const operators = new Set(['+', '-', '*', '/']);

  function reportDiagnostic(code, value) {
    console.error(code, value);
  }

  function formatResult(value) {
    return Number.isFinite(value) ? String(value) : 'Error';
  }

  function evaluateDivision(dividend, divisor) {
    if (!Number.isFinite(dividend) || !Number.isFinite(divisor) || divisor === 0) return 'Error';
    return formatResult(dividend / divisor);
  }

  function evaluate(left, operator, right) {
    if (!Number.isFinite(left) || !Number.isFinite(right) || !operators.has(operator)) return 'Error';
    if (operator === '+') return formatResult(left + right);
    if (operator === '-') return formatResult(left - right);
    if (operator === '*') return formatResult(left * right);
    return evaluateDivision(left, right);
  }

  function createState(displayElement) {
    if (!displayElement) throw new Error('Calculator display is missing');
    let currentInput = '0';
    let left = null;
    let operator = null;
    let waitingForRight = false;
    let hasResult = false;

    function render() {
      displayElement.textContent = currentInput;
    }

    function reset() {
      currentInput = '0';
      left = null;
      operator = null;
      waitingForRight = false;
      hasResult = false;
      render();
    }

    function handleDigit(digit) {
      if (!Number.isInteger(digit) || digit < 0 || digit > 9) {
        reportDiagnostic('calculator-invalid-digit', digit);
        return false;
      }
      if (hasResult || currentInput === 'Error') reset();
      if (waitingForRight) {
        currentInput = String(digit);
        waitingForRight = false;
      } else if (currentInput === '0') {
        currentInput = String(digit);
      } else {
        currentInput += String(digit);
      }
      render();
      return true;
    }

    function handleOperator(nextOperator) {
      if (!operators.has(nextOperator) || currentInput === 'Error') return false;
      left = Number(currentInput);
      operator = nextOperator;
      waitingForRight = true;
      hasResult = false;
      return true;
    }

    function handleEquals() {
      if (left === null || !operator || waitingForRight) {
        currentInput = 'Error';
      } else {
        currentInput = evaluate(left, operator, Number(currentInput));
      }
      left = null;
      operator = null;
      waitingForRight = false;
      hasResult = currentInput !== 'Error';
      render();
    }

    return { handleDigit, handleOperator, handleEquals, reset };
  }

  const api = { evaluate, evaluateDivision, createState };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;

  if (typeof document === 'undefined') return;
  const state = createState(document.querySelector('[data-testid="display"]'));
  document.addEventListener('click', event => {
    const target = event.target.closest('button[data-action]');
    if (!target) return;
    const action = target.dataset.action;
    if (action === 'digit') state.handleDigit(Number(target.dataset.digit));
    else if (action === 'operator') state.handleOperator(target.dataset.operator);
    else if (action === 'equals') state.handleEquals();
    else if (action === 'clear') state.reset();
    else reportDiagnostic('calculator-invalid-action', action);
  });
}());
