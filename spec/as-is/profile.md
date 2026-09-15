# As-Is System Baseline

이 문서는 하네스가 저장소를 스캔해 만든 **현재 시스템의 기준선**이다. 결정적 인벤토리(모듈·인터페이스·의존성·테스트)는 소스 트리가 바뀔 때마다 다시 만들어지고, 서술(narrative)은 LLM이 분석한 영역만 채워지며 근거 파일이 바뀌면 `STALE`로 표시된다. 채택된 설계 결정은 이전 실행에서 검증·커밋된 결정이다.

| 항목 | 값 |
| --- | --- |
| source tree hash | 37422f3ddf926bbc |
| 갱신 시각 | 2026-09-15T13:16:11.169Z |
| 갱신 실행 | RUN-20260915121559 (post-change) |
| 파일 / 모듈 / 테스트 | 6 / 5 / 1 |
| 서술 (stale) | 5 (0) |
| 채택된 설계 결정 | 9 |

## 1. 모듈 (영역별)

### electron/main

| 파일 | exports | dependents | 줄 |
| --- | --- | --- | --- |
| electron/main.js | - | 0 | 41 |

### electron/preload

| 파일 | exports | dependents | 줄 |
| --- | --- | --- | --- |
| electron/preload.js | - | 0 | 2 |

### renderer/ui

| 파일 | exports | dependents | 줄 |
| --- | --- | --- | --- |
| ui/calculator.js | calculate | 0 | 119 |
| ui/index.html | - | 0 | 35 |

### test-infra

| 파일 | exports | dependents | 줄 |
| --- | --- | --- | --- |
| tests/calculator.spec.js | - | 0 | 222 |

## 2. 인터페이스

### IPC

| 채널 | 측 | 종류 | 파일 | 신뢰도 |
| --- | --- | --- | --- | --- |
| - | - | - | - | - |

### preload API

| 노출 이름 | 메서드 | 파일 |
| --- | --- | --- |
| - | - | - |

### HTTP

| 메서드 | 경로 | 프레임워크 | 파일 | 신뢰도 |
| --- | --- | --- | --- | --- |
| - | - | - | - | - |

### 저장

| 종류 | 참조 | 파일 |
| --- | --- | --- |
| - | - | - |

## 3. 의존성

| 패키지 | 범위 | 종류 |
| --- | --- | --- |
| @playwright/test | ^1.55.0 | devDependency |
| electron | ^39.0.0 | devDependency |

import되지만 package.json에 없는 패키지: fs (tests/calculator.spec.js); net (tests/calculator.spec.js); os (tests/calculator.spec.js); path (electron/main.js, tests/calculator.spec.js)

## 4. 테스트

| 파일 | 프레임워크 | 케이스 수 |
| --- | --- | --- |
| tests/calculator.spec.js | @playwright/test | 13 |

## 5. 채택된 설계 결정 (ADR-lite)

| ID | 종류 | 주제 | 선택 | 근거 | 상태 | 실행 |
| --- | --- | --- | --- | --- | --- | --- |
| DD-001 | TECHNOLOGY | 애플리케이션 기술 기반 및 실행 경계 | Node.js 런타임과 Electron 데스크톱 앱을 사용하며 Electron main process가 BrowserWindow를 생성하고 ui 정적 리소스를 로드한다. | URS-001의 Node.js·Electron 제약을 충족한다. 사용자는 로컬 Electron 앱과 상호작용하며 외부 시스템 연동은 없다. | ADOPTED | RUN-20260915121559 |
| DD-002 | TECHNOLOGY | UI 구현 기술 | renderer는 프레임워크 없이 HTML, CSS, vanilla JavaScript로 구현한다. | URS-001의 HTML·CSS 제약을 충족하고 의존성과 빌드 복잡도를 최소화한다. | ADOPTED | RUN-20260915121559 |
| DD-003 | INTERFACE | 통신 방식 | 계산 기능은 renderer 내부 모듈 호출과 DOM 이벤트로 처리하며 IPC와 HTTP API를 사용하지 않는다. | 계산기에는 권한 있는 main 기능이나 외부 클라이언트 연동이 필요 없다. | ADOPTED | RUN-20260915121559 |
| DD-004 | ARCHITECTURE | 실행 위치와 동기 구조 | 창 생성은 main process에서 수행하고 계산 상태·계산 함수·DOM 갱신은 renderer에서 동기 이벤트 처리로 수행한다. | 계산은 짧고 CPU 비용이 낮으며 main 권한이나 외부 자원이 필요하지 않다. | ADOPTED | RUN-20260915121559 |
| DD-005 | DATA | 저장 방식 | 영속 저장소를 사용하지 않고 계산기 상태를 renderer 메모리에만 보관한다. | 요구조건은 입력·결과 표시와 초기화만 정의하며 재시작 후 복구나 이력 보존을 요구하지 않는다. | ADOPTED | RUN-20260915121559 |
| DD-006 | SECURITY | 입력 검증 및 계산 구현 | 허용된 digit/operator/action만 명시적 분기문으로 처리하고 eval 또는 Function 생성자를 사용하지 않는다. | 입력 범위가 단순하고 명확하며 사용자 문자열 실행을 제거한다. | ADOPTED | RUN-20260915121559 |
| DD-007 | SECURITY | Electron 보안 설정 | contextIsolation=true, nodeIntegration=false, sandbox=true를 유지하고 preload에는 애플리케이션 API를 노출하지 않는다. | renderer가 계산만 수행하므로 Node.js 권한이나 IPC bridge가 필요하지 않다. | ADOPTED | RUN-20260915121559 |
| DD-008 | TESTING | 테스트 전략 | 계산 순수 함수는 단위 테스트하고, Electron 창에서 버튼·display 흐름은 Playwright 기반 Electron 통합 테스트로 검증한다. | UI DOM 계약과 실제 Electron 리소스 로딩을 함께 검증해야 모든 수용 기준을 자동화할 수 있다. | ADOPTED | RUN-20260915121559 |
| DD-009 | PROCESS | 빌드·배포 및 운영 | package.json에 Electron 실행 스크립트와 테스트 스크립트를 정의하고, 배포 전 설치·실행·전체 테스트를 통과한 산출물만 배포한다. 실패 시 직전 검증 통과 산출물로 rollback한다. | 신규 로컬 데스크톱 앱이며 외부 시스템이 없다. secret과 외부 연동의 timeout, retry/backoff, idempotency, fallback은 적용되지 않는다. | ADOPTED | RUN-20260915121559 |

## 6. 서술 (LLM 분석, 근거 파일 해시 고정)

### electron/main.js [electron/main]

Electron main process entry point. Creates the desktop BrowserWindow and loads the renderer’s static calculator page.

**책임**

- Waits for Electron readiness before creating the window.
- Configures the BrowserWindow security boundary with preload, context isolation, disabled Node integration, and sandboxing.
- Loads ui/index.html into the renderer.
- Handles application lifecycle events, including window closure and macOS reactivation.

**불변식**

- Window creation remains in the Electron main process.
- The renderer is loaded from the repository’s ui/index.html resource.
- contextIsolation=true, nodeIntegration=false, and sandbox=true remain enabled.
- The application must not introduce IPC or HTTP as the calculator’s communication path.

**함정**

- The preload path is resolved relative to the Electron main-process module and must continue to resolve correctly in packaged or development execution.
- window-all-closed behavior is platform-sensitive: macOS keeps the application alive while other platforms quit.
- The activate handler must not create duplicate windows when a window already exists.

**관례**

- Use Electron app lifecycle callbacks for startup and reactivation.
- Resolve local resources with path utilities rather than hard-coded platform separators.
- Keep renderer computation out of the main process.

근거: electron/main.js@fcccd799, electron/preload.js@046719a4, ui/index.html@24603e78, ui/calculator.js@963076f7, tests/calculator.spec.js@72f83070 · 갱신 2026-09-15T13:17:32.646Z (RUN-20260915121559)

### electron/preload.js [electron/preload]

Preload boundary for the calculator renderer. It is intentionally kept without an application API because calculator operations occur entirely inside the renderer.

**책임**

- Provides the configured preload script referenced by BrowserWindow.
- Maintains the boundary between the isolated renderer and Node/Electron APIs.
- Exposes no calculator IPC or application API.

**불변식**

- No Node or Electron capability is exposed to the renderer through preload.
- No IPC channel or preload method is added for calculator operations unless the communication architecture changes explicitly.
- The file remains compatible with sandboxed, context-isolated execution.

**함정**

- An apparently harmless contextBridge exposure would change the adopted security and communication boundary.
- The renderer must not depend on undeclared globals supplied by preload.

**관례**

- Keep the preload surface minimal and explicit.
- Use renderer-local DOM events and module calls for calculation behavior.

근거: electron/preload.js@046719a4, electron/main.js@fcccd799, ui/calculator.js@963076f7, ui/index.html@24603e78, tests/calculator.spec.js@72f83070 · 갱신 2026-09-15T13:17:32.646Z (RUN-20260915121559)

### tests/calculator.spec.js [test-infra]

Calculator verification suite. It combines direct tests of the calculation function with Playwright Electron integration coverage for the rendered window and button/display flow.

**책임**

- Launches or connects to the Electron application under test.
- Exercises calculator behavior through the Electron window and visible controls.
- Verifies display results for representative calculator interactions.
- Covers calculator logic through direct or isolated function-level assertions.
- Uses filesystem, networking, and operating-system helpers needed by the Electron/Playwright harness.

**불변식**

- The test suite must validate both pure calculation behavior and user-visible Electron button/display behavior.
- Tests must use the same local application entry point and renderer contract as production execution.
- The harness must clean up launched Electron or supporting resources so later tests are not affected.
- Selectors and expected display/error behavior must stay aligned with ui/index.html and ui/calculator.js.

**함정**

- Electron startup and teardown are asynchronous; assertions made before the window is ready can create timing-sensitive failures.
- A test that passes through the pure function does not prove that button wiring and DOM updates work, so both layers must remain covered.
- Port or temporary-resource helpers can be platform-sensitive and must not assume a fixed available port or Unix-only path behavior.
- Changing visible labels or DOM identifiers can break integration tests even when arithmetic logic remains correct.

**관례**

- Use Playwright Electron APIs for end-to-end interaction.
- Keep pure calculation assertions independent from Electron startup where possible.
- Assert user-visible display/error outcomes rather than implementation internals for integration coverage.
- Use temporary filesystem/network resources supplied by the test harness rather than persistent application state.

근거: tests/calculator.spec.js@72f83070, electron/main.js@fcccd799, electron/preload.js@046719a4, ui/calculator.js@963076f7, ui/index.html@24603e78 · 갱신 2026-09-15T13:17:32.646Z (RUN-20260915121559)

### ui/calculator.js [renderer/ui]

Renderer-side calculator logic. It contains the calculation function and calculator state transitions used by the HTML button handlers without IPC, HTTP, or persistent storage.

**책임**

- Exports the calculate function for direct unit testing.
- Processes supported digit, operator, and action inputs through explicit branching.
- Maintains calculator state in renderer memory.
- Updates calculation state synchronously in response to DOM-driven button actions.
- Performs arithmetic without eval or Function construction.
- Handles the divide-by-zero case as a calculator error state.

**불변식**

- Only explicitly supported digit, operator, and action inputs may alter state.
- Calculation and DOM updates remain renderer-local and synchronous.
- The implementation must not evaluate arbitrary input through eval or Function.
- A divide-by-zero operation must not silently produce an ordinary numeric result.
- Reset must return the calculator to its initial state and display.

**함정**

- The order of state transitions matters when entering the first operand, selecting an operator, entering the second operand, and requesting a result.
- Repeated operator, equals, clear, and digit actions can expose assumptions about whether a second operand or prior result exists.
- The in-memory state is lost when the renderer is reloaded or the window is recreated; there is no persistence fallback.
- Changing display element identifiers or button action values breaks the HTML event wiring and the Playwright flow.

**관례**

- Use explicit action/operator branches and direct arithmetic.
- Keep calculation errors represented in the calculator’s display/state flow rather than throwing through the UI event handler.
- Keep the pure calculation surface callable independently of Electron for unit tests.

근거: ui/calculator.js@963076f7, ui/index.html@24603e78, electron/main.js@fcccd799, electron/preload.js@046719a4, tests/calculator.spec.js@72f83070 · 갱신 2026-09-15T13:17:32.646Z (RUN-20260915121559)

### ui/index.html [renderer/ui]

Static calculator renderer page. It defines the visible calculator controls and display, and loads the vanilla JavaScript calculator behavior.

**책임**

- Provides the calculator display element.
- Provides digit, arithmetic-operator, equals, and reset/clear controls.
- Associates controls with the renderer calculator actions.
- Loads the calculator JavaScript used by the page.
- Defines the HTML/CSS presentation without a UI framework.

**불변식**

- Every supported calculator action must remain reachable from a visible control.
- Control identifiers or action metadata used by ui/calculator.js and tests must remain stable unless all consumers are updated together.
- The page must remain loadable as a local static resource by Electron main.
- The page must not require a backend, IPC endpoint, or persisted store to perform a calculation.

**함정**

- A markup-only change can break the calculator if it changes button labels, identifiers, or the display target expected by the renderer or integration tests.
- The page is loaded as a local file in Electron, so assumptions about a web server or HTTP-relative routing are invalid.
- DOM event order and synchronous display updates are part of the tested behavior.

**관례**

- Use plain HTML, CSS, and vanilla JavaScript.
- Represent calculator actions with explicit controls rather than free-form expression evaluation.
- Keep the page self-contained and local-resource compatible.

근거: ui/index.html@24603e78, electron/main.js@fcccd799, ui/calculator.js@963076f7, tests/calculator.spec.js@72f83070 · 갱신 2026-09-15T13:17:32.646Z (RUN-20260915121559)
