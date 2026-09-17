# 설계 결정 (SDS / Design Decisions)

생성 시각: 2026-09-16T14:04:19.586Z

SRS가 "무엇을 만족해야 하는가"라면 이 문서는 "기술적으로 어떻게 구현하는가"의 결정 목록이다. 요구조건 여러 개에 걸치는 결정이므로 URS별 SRS 문서가 아니라 번들 수준에 두고 `appliesTo`로 명세를 역참조한다. 검증·커밋 뒤에는 As-Is 기준선의 채택 결정으로 흡수된다.

| ID | 종류 | 주제 | 선택 | 대안 | 적용 명세 | 의존성 | 대체 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| DD-001 | TECHNOLOGY | Electron runtime and application structure | Electron ^39 as the desktop runtime with Node.js main process and vanilla HTML/CSS/JavaScript renderer | A browser-only Node.js application; A different desktop framework; A renderer UI framework such as React | SRS-URS-001-01, SRS-URS-002-01, SRS-URS-003-01, SRS-URS-004-01, SRS-URS-005-01, SRS-URS-006-01 | electron@^39.0.0 (dev) | - |
| DD-002 | ARCHITECTURE | Calculator execution location | Run calculator state transitions and arithmetic entirely in the renderer process; use the main process only for window lifecycle | Move arithmetic into the main process over IPC; Run arithmetic in a worker; Use an external HTTP service | SRS-URS-002-01, SRS-URS-003-01, SRS-URS-004-01, SRS-URS-005-01, SRS-URS-006-01 | - | - |
| DD-003 | INTERFACE | Communication mechanism | No IPC or HTTP API for calculator operations; DOM events and internal modules are used | Expose calculator operations through Electron IPC; Expose a localhost HTTP API; Use preload methods for every button action | SRS-URS-002-01, SRS-URS-003-01, SRS-URS-004-01, SRS-URS-005-01, SRS-URS-006-01 | - | - |
| DD-004 | DATA | Persistence and storage | No persistent storage; calculator state is in-memory and reset on application reload | Persist state in a JSON file under userData; Use SQLite; Persist state through a remote service | SRS-URS-003-01, SRS-URS-004-01, SRS-URS-005-01, SRS-URS-006-01 | - | - |
| DD-005 | ARCHITECTURE | Synchronous versus asynchronous processing | Synchronous in-memory state transitions and arithmetic in renderer event handlers | Asynchronous IPC round trips; Worker-based asynchronous evaluation; HTTP request/response evaluation | SRS-URS-003-01, SRS-URS-004-01, SRS-URS-005-01, SRS-URS-006-01 | - | - |
| DD-006 | SECURITY | Electron security configuration | BrowserWindow uses contextIsolation: true, nodeIntegration: false, and sandbox: true; preload exposes no calculator API | Enable nodeIntegration in the renderer; Disable context isolation; Expose calculator operations through a broad preload bridge | SRS-URS-001-01, SRS-URS-002-01, SRS-URS-003-01, SRS-URS-004-01, SRS-URS-005-01, SRS-URS-006-01 | - | - |
| DD-007 | TESTING | Testing strategy | Use Node.js built-in node:test for calculator unit tests and Electron integration tests for the packaged UI; use stable data-testid hooks | Manual-only verification; A third-party test framework; HTTP contract tests | SRS-URS-001-01, SRS-URS-002-01, SRS-URS-003-01, SRS-URS-004-01, SRS-URS-005-01, SRS-URS-006-01 | - | - |
| DD-008 | PROCESS | Package and deployment configuration | Define package.json scripts for start and test, package the Electron application with local HTML/CSS/JavaScript assets, and inject environment-specific values only through build/launcher configuration | Run from an ad hoc source command without package metadata; Bundle a server and external runtime; Store environment secrets in renderer source | SRS-URS-001-01 | - | - |
| DD-009 | MIGRATION | Migration and compatibility | Treat the application as a new system with no legacy IPC, HTTP, or storage contracts; preserve stable UI test identifiers after initial release | Introduce compatibility adapters for nonexistent interfaces; Create a versioned storage migration before persistence exists; Allow identifiers to change freely | SRS-URS-001-01, SRS-URS-002-01, SRS-URS-003-01, SRS-URS-004-01, SRS-URS-005-01, SRS-URS-006-01 | - | - |

## DD-001 Electron runtime and application structure

**선택**: Electron ^39 as the desktop runtime with Node.js main process and vanilla HTML/CSS/JavaScript renderer

**근거**: URS-001 explicitly requires Node.js and Electron, and vanilla web assets satisfy the HTML/CSS requirement without introducing an unrequested framework.

**검토한 대안**

- A browser-only Node.js application
- A different desktop framework
- A renderer UI framework such as React

**의존성**: electron@^39.0.0 (devDependency) — Provides the required Electron desktop runtime and development launch command.

## DD-002 Calculator execution location

**선택**: Run calculator state transitions and arithmetic entirely in the renderer process; use the main process only for window lifecycle

**근거**: The calculator has no privileged data or I/O needs, so renderer-local synchronous state transitions minimize complexity and latency while preserving the Electron security boundary.

**검토한 대안**

- Move arithmetic into the main process over IPC
- Run arithmetic in a worker
- Use an external HTTP service

## DD-003 Communication mechanism

**선택**: No IPC or HTTP API for calculator operations; DOM events and internal modules are used

**근거**: The requirements are local UI interactions and do not require main-process privileges or external clients. Avoiding unnecessary IPC and HTTP surfaces reduces attack surface and contract overhead.

**검토한 대안**

- Expose calculator operations through Electron IPC
- Expose a localhost HTTP API
- Use preload methods for every button action

## DD-004 Persistence and storage

**선택**: No persistent storage; calculator state is in-memory and reset on application reload

**근거**: No requirement asks for history, settings, or recovery across launches. Avoiding storage prevents unnecessary sensitive-data retention and migration obligations.

**검토한 대안**

- Persist state in a JSON file under userData
- Use SQLite
- Persist state through a remote service

## DD-005 Synchronous versus asynchronous processing

**선택**: Synchronous in-memory state transitions and arithmetic in renderer event handlers

**근거**: All required operations are small and deterministic. Synchronous processing makes display updates immediate and avoids loading, retry, timeout, and duplicate-request concerns.

**검토한 대안**

- Asynchronous IPC round trips
- Worker-based asynchronous evaluation
- HTTP request/response evaluation

## DD-006 Electron security configuration

**선택**: BrowserWindow uses contextIsolation: true, nodeIntegration: false, and sandbox: true; preload exposes no calculator API

**근거**: The renderer needs only DOM APIs, so the strongest Electron defaults can be retained without weakening security.

**검토한 대안**

- Enable nodeIntegration in the renderer
- Disable context isolation
- Expose calculator operations through a broad preload bridge

## DD-007 Testing strategy

**선택**: Use Node.js built-in node:test for calculator unit tests and Electron integration tests for the packaged UI; use stable data-testid hooks

**근거**: The test strategy verifies pure state transitions quickly and validates the real Electron renderer without adding an unrequested test dependency.

**검토한 대안**

- Manual-only verification
- A third-party test framework
- HTTP contract tests

## DD-008 Package and deployment configuration

**선택**: Define package.json scripts for start and test, package the Electron application with local HTML/CSS/JavaScript assets, and inject environment-specific values only through build/launcher configuration

**근거**: The repository has no existing package manifest or deployment contract. Explicit scripts and local assets make build, pre-deployment validation, and rollback to the prior packaged artifact reproducible. This application has no secrets or environment-specific external integration.

**검토한 대안**

- Run from an ad hoc source command without package metadata
- Bundle a server and external runtime
- Store environment secrets in renderer source

## DD-009 Migration and compatibility

**선택**: Treat the application as a new system with no legacy IPC, HTTP, or storage contracts; preserve stable UI test identifiers after initial release

**근거**: The As-Is baseline contains no modules, interfaces, dependencies, tests, or storage. There is nothing to migrate, but UI automation identifiers become the first compatibility surface.

**검토한 대안**

- Introduce compatibility adapters for nonexistent interfaces
- Create a versioned storage migration before persistence exists
- Allow identifiers to change freely
