---
last_mapped_commit: d7cb05506bb3373788498af458bd8c8e4ef63412
mapped: 2026-08-12
---

# TESTING

## 결론: 자동화 테스트 코드가 존재하지 않음

파일시스템을 직접 확인한 결과, 이 프로젝트에는 테스트 코드가 전혀 없습니다.

- `**/*.test.*`, `**/*.spec.*` 패턴에 매칭되는 파일이 `src/`, 저장소 전체(node_modules 제외)에 하나도 없습니다.
- `jest`, `vitest`, `cypress`, `playwright`, `testing-library`, `mocha`, `jasmine`, `karma` 관련 파일/설정이 저장소에 없습니다.
- `package.json`의 `scripts`는 `dev`, `build`, `lint`, `preview` 4개뿐이고 `test` 스크립트가 없습니다.
- `dependencies`/`devDependencies`에 테스트 프레임워크, assertion 라이브러리, mocking 라이브러리가 전혀 포함되어 있지 않습니다(`firebase`, `react`, `react-dom` + Vite/ESLint/TypeScript 툴체인뿐).
- `node_modules`에도 위 테스트 관련 패키지가 설치되어 있지 않습니다(직접 설치된 devDependency가 아니면 존재하지 않음).
- CI 설정(`.github/workflows` 등)도 저장소에 없어 원격에서 테스트를 실행하는 파이프라인도 없습니다.

이 사실은 `CLAUDE.md`에도 프로젝트 지침으로 명시되어 있습니다: "테스트 코드가 없는 프로젝트입니다. 기능 검증은 `tsc -b` + `npm run lint` + `npm run build`로 하고, UI 변경은 가능하면 직접 켜서 확인." — 실제 코드 상태와 일치합니다.

## 실질적으로 쓰이는 검증 수단

테스트 프레임워크 대신 다음 세 가지가 "검증"의 전부입니다.

1. **`npm run build`** (`tsc -b && vite build`) — 타입 체크. `tsconfig.app.json`의 `noUnusedLocals`/`noUnusedParameters`/`noFallthroughCasesInSwitch` 등으로 일부 정적 오류를 잡습니다.
2. **`npm run lint`** (`eslint .`) — `eslint.config.js` 기준 `typescript-eslint` recommended + `eslint-plugin-react-hooks` recommended + `eslint-plugin-react-refresh`(vite) 규칙 검사. 현재 알려진 채로 남겨둔 lint 에러가 2개 있습니다(`react-hooks/set-state-in-effect`, `src/components/tabs/CalendarTab.tsx`와 `src/hooks/useData.ts`) — `CLAUDE.md`에 의도적으로 방치한 것으로 기록되어 있습니다.
3. **수동 UI 확인 / Firestore 에뮬레이터** — 코드 동작이나 Firestore 보안 규칙(`firestore.rules`) 검증은 사람이 `npm run dev`로 직접 켜보거나 `firebase emulators:exec`로 에뮬레이터를 띄워 시나리오를 확인하는 방식으로 이루어집니다. 이 과정을 코드로 남긴 스크립트/픽스처는 저장소에 없습니다(`.claude/settings.local.json`의 허용 명령 목록에 `firebase emulators:exec ...` 실행 이력이 남아 있지만, 실행됐던 임시 스크립트 자체는 저장소에 커밋되어 있지 않습니다).

## 커버리지

측정 불가 — 커버리지 도구(`c8`, `istanbul`, `vitest --coverage` 등)가 설정되어 있지 않고, 테스트 자체가 없으므로 커버리지 개념이 적용되지 않습니다.

## 참고: 테스트 부재가 실제로 버그를 놓친 사례

`.forge/retro/260812-200000-stock-profit-percent.md`(주식거래 수익률 표시 기능의 회고)에 따르면, 사람의 수동 확인(브라우저로 양수/0원 케이스 확인)은 통과했지만 이후 적대적 코드 리뷰에서 다음이 드러났습니다.
- 색상 규칙이 실행 중 바뀌면서 인접 요소(금액 색상)와 충돌하는 버그.
- `buyPrice`/`quantity`에 음수·0을 막는 실제 검증이 없었던 문제 — `<input min={0}>`은 `<form>` 없이 버튼 `onClick`으로 저장하는 구조에서 브라우저 constraint validation이 동작하지 않아 실질적 검증이 아니었음.

자동화 테스트가 없는 상태에서 이런 종류의 회귀를 잡는 유일한 수단이 수동 확인과 (있다면) 코드 리뷰라는 점을 보여주는 근거입니다.
