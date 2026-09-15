(function calculatorModule() {
  const OPERATORS = new Set(['+', '-', '*', '/']);
  const ERROR = 'Error';
  const state = {
    firstOperand: null,
    operator: null,
    currentInput: '0',
    errorState: null,
    hasResult: false,
    awaitingOperand: false,
  };

  function calculate(operand1, operator, operand2) {
    if (!OPERATORS.has(operator)) return null;
    if (!Number.isFinite(operand1) || !Number.isFinite(operand2)) return null;
    if (operator === '/' && operand2 === 0) return ERROR;
    if (operator === '+') return String(operand1 + operand2);
    if (operator === '-') return String(operand1 - operand2);
    if (operator === '*') return String(operand1 * operand2);
    return String(operand1 / operand2);
  }

  function displayElement() {
    return document.querySelector('[data-testid="display"]');
  }

  function render() {
    const display = displayElement();
    if (!display) {
      console.error('Calculator display element is missing');
      return;
    }
    display.textContent = state.errorState || state.currentInput;
  }

  function clear() {
    state.firstOperand = null;
    state.operator = null;
    state.currentInput = '0';
    state.errorState = null;
    state.hasResult = false;
    state.awaitingOperand = false;
    render();
  }

  function handleDigit(digit) {
    if (!/^[0-9]$/.test(digit)) return;
    if (state.errorState || state.hasResult) {
      state.currentInput = digit;
      state.firstOperand = null;
      state.operator = null;
      state.errorState = null;
      state.hasResult = false;
    } else if (state.awaitingOperand) {
      state.currentInput = digit;
      state.awaitingOperand = false;
    } else if (state.currentInput === '0') {
      state.currentInput = digit;
    } else {
      state.currentInput += digit;
    }
    render();
  }

  function handleOperator(operator) {
    if (!OPERATORS.has(operator) || state.errorState) return;
    if (state.operator !== null) return;
    state.firstOperand = state.currentInput;
    state.operator = operator;
    state.hasResult = false;
    state.awaitingOperand = true;
    render();
  }

  function handleEquals() {
    if (state.errorState || state.operator === null || state.firstOperand === null) return;
    // A missing second operand is represented by the untouched initial input.
    if (state.awaitingOperand) return;
    const result = calculate(Number(state.firstOperand), state.operator, Number(state.currentInput));
    if (result === null) return;
    if (result === ERROR) {
      state.errorState = ERROR;
      state.currentInput = '0';
    } else {
      state.currentInput = result;
      state.firstOperand = null;
      state.operator = null;
      state.hasResult = true;
      state.awaitingOperand = false;
    }
    render();
  }

  function handleAction(action) {
    if (/^[0-9]$/.test(action)) return handleDigit(action);
    if (OPERATORS.has(action)) return handleOperator(action);
    if (action === '=') return handleEquals();
    if (action === 'C') return clear();
    console.error(`Unknown calculator action: ${action}`);
  }

  function initialize() {
    const calculator = document.querySelector('[data-testid="calculator"]');
    if (!calculator || !displayElement()) {
      console.error('Calculator DOM is incomplete');
      return;
    }
    calculator.addEventListener('click', event => {
      const button = event.target.closest('button');
      if (!button || !calculator.contains(button)) return;
      handleAction(button.dataset.action);
    });
    render();
  }

  if (typeof module !== 'undefined' && module.exports) module.exports = { calculate };
  if (typeof document !== 'undefined') initialize();
}());
