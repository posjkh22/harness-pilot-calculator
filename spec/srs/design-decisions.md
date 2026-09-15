# 설계 결정 (SDS / Design Decisions)

생성 시각: 2026-09-15T12:23:28.742Z

SRS가 "무엇을 만족해야 하는가"라면 이 문서는 "기술적으로 어떻게 구현하는가"의 결정 목록이다. 요구조건 여러 개에 걸치는 결정이므로 URS별 SRS 문서가 아니라 번들 수준에 두고 `appliesTo`로 명세를 역참조한다. 검증·커밋 뒤에는 As-Is 기준선의 채택 결정으로 흡수된다.

| ID | 종류 | 주제 | 선택 | 대안 | 적용 명세 | 의존성 | 대체 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| DD-001 | TECHNOLOGY | 애플리케이션 기술 기반 및 실행 경계 | Node.js 런타임과 Electron 데스크톱 앱을 사용하며 Electron main process가 BrowserWindow를 생성하고 ui 정적 리소스를 로드한다. | 브라우저 단독 애플리케이션; 다른 데스크톱 프레임워크 | SRS-URS-001-01, SRS-URS-002-01 | electron@^39.0.0 (dev) | - |
| DD-002 | TECHNOLOGY | UI 구현 기술 | renderer는 프레임워크 없이 HTML, CSS, vanilla JavaScript로 구현한다. | React; Vue; 브라우저 단독 HTML 페이지 | SRS-URS-001-01, SRS-URS-002-01, SRS-URS-003-01, SRS-URS-004-01, SRS-URS-005-01, SRS-URS-006-01 | - | - |
| DD-003 | INTERFACE | 통신 방식 | 계산 기능은 renderer 내부 모듈 호출과 DOM 이벤트로 처리하며 IPC와 HTTP API를 사용하지 않는다. | main process IPC 호출; 로컬 HTTP API 서버 | SRS-URS-002-01, SRS-URS-003-01, SRS-URS-004-01, SRS-URS-005-01, SRS-URS-006-01 | - | - |
| DD-004 | ARCHITECTURE | 실행 위치와 동기 구조 | 창 생성은 main process에서 수행하고 계산 상태·계산 함수·DOM 갱신은 renderer에서 동기 이벤트 처리로 수행한다. | 계산을 main process worker로 이동; 계산을 HTTP 서버로 분리 | SRS-URS-001-01, SRS-URS-003-01, SRS-URS-004-01, SRS-URS-005-01, SRS-URS-006-01 | - | - |
| DD-005 | DATA | 저장 방식 | 영속 저장소를 사용하지 않고 계산기 상태를 renderer 메모리에만 보관한다. | JSON 파일 저장; SQLite 저장 | SRS-URS-003-01, SRS-URS-004-01, SRS-URS-005-01, SRS-URS-006-01 | - | - |
| DD-006 | SECURITY | 입력 검증 및 계산 구현 | 허용된 digit/operator/action만 명시적 분기문으로 처리하고 eval 또는 Function 생성자를 사용하지 않는다. | 문자열 수식 eval; 서드파티 수식 파서 | SRS-URS-003-01, SRS-URS-004-01, SRS-URS-005-01, SRS-URS-006-01 | - | - |
| DD-007 | SECURITY | Electron 보안 설정 | contextIsolation=true, nodeIntegration=false, sandbox=true를 유지하고 preload에는 애플리케이션 API를 노출하지 않는다. | nodeIntegration 활성화; contextIsolation 비활성화 | SRS-URS-001-01, SRS-URS-002-01, SRS-URS-003-01, SRS-URS-004-01, SRS-URS-005-01, SRS-URS-006-01 | - | - |
| DD-008 | TESTING | 테스트 전략 | 계산 순수 함수는 단위 테스트하고, Electron 창에서 버튼·display 흐름은 Playwright 기반 Electron 통합 테스트로 검증한다. | 수동 검증만 수행; 브라우저 단위 테스트만 수행 | SRS-URS-001-01, SRS-URS-002-01, SRS-URS-003-01, SRS-URS-004-01, SRS-URS-005-01, SRS-URS-006-01 | @playwright/test@^1.55.0 (dev) | - |
| DD-009 | PROCESS | 빌드·배포 및 운영 | package.json에 Electron 실행 스크립트와 테스트 스크립트를 정의하고, 배포 전 설치·실행·전체 테스트를 통과한 산출물만 배포한다. 실패 시 직전 검증 통과 산출물로 rollback한다. | 수동 실행 후 배포; 외부 서버에 배포 | SRS-URS-001-01 | - | - |

## DD-001 애플리케이션 기술 기반 및 실행 경계

**선택**: Node.js 런타임과 Electron 데스크톱 앱을 사용하며 Electron main process가 BrowserWindow를 생성하고 ui 정적 리소스를 로드한다.

**근거**: URS-001의 Node.js·Electron 제약을 충족한다. 사용자는 로컬 Electron 앱과 상호작용하며 외부 시스템 연동은 없다.

**검토한 대안**

- 브라우저 단독 애플리케이션
- 다른 데스크톱 프레임워크

**의존성**: electron@^39.0.0 (devDependency) — Electron 런타임과 BrowserWindow 제공

## DD-002 UI 구현 기술

**선택**: renderer는 프레임워크 없이 HTML, CSS, vanilla JavaScript로 구현한다.

**근거**: URS-001의 HTML·CSS 제약을 충족하고 의존성과 빌드 복잡도를 최소화한다.

**검토한 대안**

- React
- Vue
- 브라우저 단독 HTML 페이지

## DD-003 통신 방식

**선택**: 계산 기능은 renderer 내부 모듈 호출과 DOM 이벤트로 처리하며 IPC와 HTTP API를 사용하지 않는다.

**근거**: 계산기에는 권한 있는 main 기능이나 외부 클라이언트 연동이 필요 없다.

**검토한 대안**

- main process IPC 호출
- 로컬 HTTP API 서버

## DD-004 실행 위치와 동기 구조

**선택**: 창 생성은 main process에서 수행하고 계산 상태·계산 함수·DOM 갱신은 renderer에서 동기 이벤트 처리로 수행한다.

**근거**: 계산은 짧고 CPU 비용이 낮으며 main 권한이나 외부 자원이 필요하지 않다.

**검토한 대안**

- 계산을 main process worker로 이동
- 계산을 HTTP 서버로 분리

## DD-005 저장 방식

**선택**: 영속 저장소를 사용하지 않고 계산기 상태를 renderer 메모리에만 보관한다.

**근거**: 요구조건은 입력·결과 표시와 초기화만 정의하며 재시작 후 복구나 이력 보존을 요구하지 않는다.

**검토한 대안**

- JSON 파일 저장
- SQLite 저장

## DD-006 입력 검증 및 계산 구현

**선택**: 허용된 digit/operator/action만 명시적 분기문으로 처리하고 eval 또는 Function 생성자를 사용하지 않는다.

**근거**: 입력 범위가 단순하고 명확하며 사용자 문자열 실행을 제거한다.

**검토한 대안**

- 문자열 수식 eval
- 서드파티 수식 파서

## DD-007 Electron 보안 설정

**선택**: contextIsolation=true, nodeIntegration=false, sandbox=true를 유지하고 preload에는 애플리케이션 API를 노출하지 않는다.

**근거**: renderer가 계산만 수행하므로 Node.js 권한이나 IPC bridge가 필요하지 않다.

**검토한 대안**

- nodeIntegration 활성화
- contextIsolation 비활성화

## DD-008 테스트 전략

**선택**: 계산 순수 함수는 단위 테스트하고, Electron 창에서 버튼·display 흐름은 Playwright 기반 Electron 통합 테스트로 검증한다.

**근거**: UI DOM 계약과 실제 Electron 리소스 로딩을 함께 검증해야 모든 수용 기준을 자동화할 수 있다.

**검토한 대안**

- 수동 검증만 수행
- 브라우저 단위 테스트만 수행

**의존성**: @playwright/test@^1.55.0 (devDependency) — Electron UI 통합 테스트와 assertion 제공

## DD-009 빌드·배포 및 운영

**선택**: package.json에 Electron 실행 스크립트와 테스트 스크립트를 정의하고, 배포 전 설치·실행·전체 테스트를 통과한 산출물만 배포한다. 실패 시 직전 검증 통과 산출물로 rollback한다.

**근거**: 신규 로컬 데스크톱 앱이며 외부 시스템이 없다. secret과 외부 연동의 timeout, retry/backoff, idempotency, fallback은 적용되지 않는다.

**검토한 대안**

- 수동 실행 후 배포
- 외부 서버에 배포
