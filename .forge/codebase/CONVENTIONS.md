---
last_mapped_commit: d7cb05506bb3373788498af458bd8c8e4ef63412
mapped: 2026-08-12
---

# CONVENTIONS

이 문서는 `moneylog` 코드베이스에서 실제로 관찰되는 코드 스타일·네이밍·패턴·에러 처리 방식을 정리한 것입니다. 도구(Prettier/ESLint 스타일 규칙 등)로 강제되는 것이 아니라 기존 코드를 관찰해서 추출한 관례이므로, 새 코드를 쓸 때 이 관례를 따르는 것이 일관성을 유지하는 방법입니다.

## 포맷 스타일

- **세미콜론 없음.** 문 끝에 `;`를 붙이지 않습니다(예: `src/App.tsx`, `src/hooks/useData.ts` 전체).
- **문자열은 싱글쿼트(`'...'`) 우선.** JSX 어트리뷰트 값이나 특정 표현에서만 더블쿼트가 섞여 있습니다.
- **들여쓰기 2스페이스.**
- Prettier·EditorConfig 설정 파일은 저장소에 없습니다(`.prettierrc*`, `.editorconfig` 없음) — 포맷은 오직 기존 코드 관찰로 유지됩니다.
- ESLint는 `eslint.config.js`에서 `@eslint/js` recommended + `typescript-eslint` recommended + `eslint-plugin-react-hooks`(flat recommended) + `eslint-plugin-react-refresh`(vite)로 구성됩니다. 포맷 규칙(세미콜론/쿼트 등)은 강제하지 않고 hooks 규칙과 TS 규칙만 검사합니다.
- `tsconfig.app.json`에 `noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch`가 켜져 있어 미사용 변수/파라미터는 빌드(`tsc -b`) 단계에서 에러가 됩니다.

## 네이밍

- **컴포넌트 파일/함수**: PascalCase, `export default function ComponentName(...)`. 파일명과 함수명이 동일합니다(예: `src/components/CustomSelect.tsx` → `CustomSelect`).
- **훅**: `useXxx` 형태, `src/hooks/` 아래 파일명도 동일(`useAuth.ts`, `useData.ts`, `useHousehold.ts`).
- **일반 함수/변수**: camelCase.
- **타입/인터페이스**: PascalCase (`Expense`, `FixedItem`, `AssetAccount` 등, 전부 `src/types.ts`에 모여 있음).
- **상수(기본값 배열)**: `DEFAULT_` 접두사 + SCREAMING_SNAKE_CASE (`DEFAULT_PAYMENT_METHODS`, `DEFAULT_CATEGORIES`, `DEFAULT_ASSET_TYPES`, `DEFAULT_STOCK_CATEGORIES`, `METHOD_COLORS`), 전부 `src/types.ts`에서 export.
- **Firestore 접근 함수(`src/firebase.ts`)**: 동사 접두사로 역할을 구분합니다.
  - `subscribeX(...)`: `onSnapshot`을 감싸 `Unsubscribe`를 리턴.
  - `setX`, `addX`, `updateX`, `deleteX`: 각각 `setDoc`/`addDoc`/`updateDoc`/`deleteDoc` 래퍼.
  - `getXFallback(...)`: 월별 문서가 없을 때 과거 달을 순회하며 값을 가져오는 비동기 함수.
  - `useData.ts`에서 `firebase.ts`의 함수를 그대로 재노출할 때 이름이 충돌하면 `firebaseXxx as` 형태로 alias import합니다(예: `addStockTrade as firebaseAddStockTrade`).
- **CSS 클래스명**: kebab-case, 대체로 `{도메인}-{요소}` 형태(`pm-row`, `pm-drag-handle`, `pm-color-btn`, `pm-delete-btn`, `pm-add-btn`, `dash-section-title`, `dash-remaining-value`, `expense-card-row1` 등). BEM 같은 형식적 규칙은 없고 관용적으로 굳어진 접두사들입니다.
- **CSS 커스텀 프로퍼티(디자인 토큰)**: `--bg`, `--surface`, `--surface-2`, `--border`, `--text`, `--text-dim`, `--accent`, `--danger`, `--income`, `--expense` 등. `src/index.css`의 `:root`(라이트)와 `[data-theme="dark"]`(다크)에서 동일한 이름을 재정의하는 라이트/다크 이중 정의 패턴을 따릅니다.

## 파일/모듈 구조

- `import type { ... } from '...'` 형태로 타입 전용 import를 분리합니다(`tsconfig.app.json`의 `verbatimModuleSyntax: true` 때문에 필수).
- 레이어링이 3단으로 고정되어 있습니다: `src/firebase.ts`(Firestore 접근, 유일한 데이터 계층) → `src/hooks/useData.ts`(구독 + CRUD 조합 + 파생 상태) → `src/components/tabs/*`, `src/components/modals/*`(표시 + 콜백). 새 데이터 종류를 추가할 때도 이 순서를 그대로 따릅니다.
- 컴포넌트 파일은 `interface Props { ... }`를 파일 상단에 선언하고, 함수 시그니처에서 `{ a, b, c }: Props`로 구조분해합니다. 별도의 `Props.ts` 분리 없음 — Props는 항상 같은 파일에 인라인.
- 화면 단위는 `src/components/tabs/`, 모달(추가/수정/목록관리 UI)은 `src/components/modals/`, 여러 화면에서 쓰는 공용 UI(`Header`, `Sidebar`, `TabBar`, `Modal`, `CustomSelect`, `DonutChart`)는 `src/components/` 바로 아래.

## 자주 쓰이는 패턴

### 인라인 스타일 관례
`style={{ ... }}`는 코드베이스 전반(75곳 이상)에서 쓰이지만 역할이 명확히 구분됩니다.
- **정적/재사용 스타일**: `className`으로 `src/index.css`의 클래스를 참조 (레이아웃, 버튼, 카드 등 대부분).
- **인라인 `style`**: 데이터에서 나온 동적 값(Firestore에 저장된 색상 `t.color`, 조건부 색상 `signColor(n)` 같은 계산값)이나, 특정 위치에서만 필요한 일회성 레이아웃 조정(`{ flex: 1 }`, `{ marginTop: 12 }` 등)에 한정해서 사용합니다.
- 재사용되는 동적 색상 계산은 파일 상단에 순수 함수로 뽑아둡니다(예: `src/components/tabs/StockTab.tsx`의 `signColor`, `percentColor`, `fmtPercent`).

### 커스터마이즈 가능한 목록 패턴
결제수단(`PaymentMethodDef`)·지출카테고리(`CategoryDef`)·자산종류(`AssetTypeDef`)·주식구분(`StockCategoryDef`) 네 가지가 동일한 구조를 그대로 복붙해서 구현되어 있습니다.
- 데이터: Firestore에 유저당 문서 하나(`payment_labels/{uid}`, `expense_categories/{uid}`, `asset_types/{uid}`, `stock_categories/{uid}`), 필드는 `{ methods: [...] }` / `{ categories: [...] }` / `{ types: [...] }` 배열 하나.
- 로직: `customX ?? DEFAULT_X` (`src/hooks/useData.ts`) — 커스텀 문서가 없으면 `src/types.ts`의 `DEFAULT_*` 상수를 그대로 사용.
- UI: `src/components/modals/CategoryModal.tsx`, `AssetTypeModal.tsx`, `StockCategoryModal.tsx`, `PaymentLabelsModal.tsx`가 거의 동일한 구현을 가진 개별 모달로 각각 존재합니다(공용 컴포넌트로 추출되어 있지 않음). 새 커스터마이즈 목록을 추가할 때는 기존 모달 중 하나(예: `CategoryModal.tsx`)를 그대로 복사해서 타입/문구만 바꾸는 방식이 이 코드베이스의 실제 관례입니다. 단, `CategoryModal.tsx`만 포인터 드래그로 순서 변경(`pm-drag-handle`, `handleDragStart/Move/End`)이 구현돼 있고 나머지는 없어 완전히 동일하지는 않습니다.

### 월별 데이터 + fallback 패턴 (구현 메커니즘)
`fixed_monthly`, `savings_monthly`, `asset_accounts_monthly` 세 곳에서 동일한 구현 패턴이 반복됩니다(`src/firebase.ts`):
- 문서 ID는 `` `${uid}_${yearMonth}` ``.
- `subscribeXMonthly`는 해당 달 문서를 구독하고, 문서가 없으면 `null`을 콜백.
- `getXFallback`은 `null`일 때만 `useData.ts`의 `useEffect`에서 호출되어, 최대 12개월 과거로 거슬러 올라가며 가장 가까운 문서를 찾고, 끝까지 없으면 레거시 컬렉션(`fixed_items`, `savings_items`, `asset_accounts`)에서 `uid` 기준으로 조회.
- `useData.ts`에서 최종값은 `xMonthly ?? xFallback`로 합성됩니다.

### 리스트 관리 모달의 공통 골격
`FixedListModal.tsx`, `SavingsListModal.tsx` 같은 "여러 항목을 한 화면에서 편집 후 통째로 저장" 모달은 로컬 `Row` 타입(모든 값을 문자열로 들고 있음)으로 입력을 받고, 저장 시점에 `Number(...)`/`.trim()`으로 변환·정제한 뒤 `onSave`로 한 번에 넘기는 구조를 공유합니다. 개별 항목 단위로 즉시 Firestore에 쓰지 않고, "전체 배열을 통째로 `setDoc`"하는 상위 `bulkSaveXxx`(`useData.ts`)로 넘깁니다.

### 데이터 흐름/콜백 관례
- 탭·모달 컴포넌트는 Firestore를 직접 호출하지 않고 `useData()`가 반환한 함수(`addExpense`, `updateStockTrade` 등)만 props로 내려받아 호출합니다.
- 모달의 `onSave`/`onDelete`는 `App.tsx`에서 `async (...) => { await data.xxx(...); closeModal() }` 형태의 인라인 클로저로 정의되는 것이 기본형입니다.

## 에러 처리

- **`try`/`catch`는 코드베이스 전체에 단 1곳뿐입니다** (`src/App.tsx`의 `AssetAccountModal`의 `onSave` 콜백, 자산 계좌 저장 로직). 그 외 모든 비동기 `onSave`/`onDelete` 콜백은 에러를 잡지 않고 그대로 전파합니다(unhandled rejection이 될 수 있음).
- 유일한 에러 표시 방법은 `alert()`이며, 코드베이스 전체에서 1회 사용됩니다:
  ```ts
  } catch (e) {
    alert('저장 중 오류가 발생했어요: ' + (e instanceof Error ? e.message : String(e)))
  }
  ```
- `console.error`/`console.warn`/`console.log` 등 콘솔 로깅은 `src/` 어디에도 없습니다(0건).
- **입력 검증은 HTML5 제약(`<input min={0}>` 등)에 의존하지 않습니다.** 모달은 `<form>`으로 감싸여 있지 않고 버튼 `onClick`으로 직접 저장을 트리거하므로 브라우저 constraint validation이 동작하지 않습니다(`.forge/retro/260812-200000-stock-profit-percent.md`에서 실제로 발견·기록된 사실). 실질적인 검증은 JS 레벨에서 저장 직전에 계산되는 `valid`/`canSave` 같은 boolean으로 처리됩니다(예: `FixedListModal.tsx`의 `rows.filter(r => r.label.trim() && Number(r.amount) > 0)`, `CategoryModal.tsx`의 `items.filter(c => c.label.trim())`). 이 검증이 없거나 불완전한 모달이 있을 수 있다는 점이 회고 문서에 후속 점검 후보로 남아 있습니다.
- Firebase 함수(`signIn`, `joinHousehold` 등) 자체는 실패 시 Promise를 reject하거나(예: `signInWithPopup`), 명시적으로 `boolean`을 리턴해 실패를 나타냅니다(`joinHousehold`가 코드 없으면 `false`). 호출부(`AccountModal.tsx`)는 이 boolean을 받아 자체적으로 에러 메시지 상태(`joinError`)를 세팅하는 방식을 씁니다(`try`/`catch` 없이 리턴값 체크).
