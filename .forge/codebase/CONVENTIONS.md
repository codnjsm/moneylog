---
last_mapped_commit: a28aa9e61a6b8610bdfe37adc648b11f2eb413de
mapped: 2026-09-15
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
  - `useData.ts`에서 `firebase.ts`의 함수를 그대로 재노출할 때 이름이 충돌하면 `firebaseXxx as` 형태로 alias import합니다(예: `setAssetAccountsMonthly as firebaseSetAssetAccountsMonthly`).
  - `XWithY(...)`: 서로 연동된 두 문서를 하나의 `writeBatch`로 함께 쓰는 원자적 CRUD 함수. 예를 들어 주식거래(`stock_trades`)를 추가/수정/삭제할 때 연동된 수입 `expenses` 문서도 항상 같이 써야 하므로, `addStockTradeWithExpense`/`updateStockTradeWithExpense`/`deleteStockTradeWithExpense`(`src/firebase.ts`)가 `writeBatch(db)`로 두 문서를 한 번에 커밋합니다. 이 경우 "연동 문서 필드 조립" 같은 약간의 조합 로직이 `useData.ts`가 아니라 `firebase.ts` 쪽에 들어가는데, 이는 원자성(atomicity) 확보가 목적인 의도된 예외입니다 — 단순 CRUD는 여전히 `firebase.ts`에 로직을 두지 않는 게 기본 원칙.
- **CSS 클래스명**: kebab-case, 대체로 `{도메인}-{요소}` 형태(`pm-row`, `pm-drag-handle`, `pm-color-btn`, `pm-delete-btn`, `pm-add-btn`, `dash-section-title`, `dash-remaining-value`, `expense-card-row1` 등). BEM 같은 형식적 규칙은 없고 관용적으로 굳어진 접두사들입니다.
- **CSS 커스텀 프로퍼티(디자인 토큰)**: `--bg`, `--surface`, `--surface-2`, `--border`, `--text`, `--text-dim`, `--accent`, `--danger`, `--income`, `--expense` 등. `src/index.css`의 `:root`(라이트)와 `[data-theme="dark"]`(다크)에서 동일한 이름을 재정의하는 라이트/다크 이중 정의 패턴을 따릅니다.

## 파일/모듈 구조

- `import type { ... } from '...'` 형태로 타입 전용 import를 분리합니다(`tsconfig.app.json`의 `verbatimModuleSyntax: true` 때문에 필수).
- 레이어링이 3단으로 고정되어 있습니다: `src/firebase.ts`(Firestore 접근, 유일한 데이터 계층) → `src/hooks/useData.ts`(구독 + CRUD 조합 + 파생 상태) → `src/components/tabs/*`, `src/components/modals/*`(표시 + 콜백). 새 데이터 종류를 추가할 때도 이 순서를 그대로 따릅니다.
- 컴포넌트 파일은 `interface Props { ... }`를 파일 상단에 선언하고, 함수 시그니처에서 `{ a, b, c }: Props`로 구조분해합니다. 별도의 `Props.ts` 분리 없음 — Props는 항상 같은 파일에 인라인.
- 화면 단위는 `src/components/tabs/`, 모달(추가/수정/목록관리 UI)은 `src/components/modals/`, 여러 화면에서 쓰는 공용 UI(`Header`, `Sidebar`, `TabBar`, `Modal`, `CustomSelect`, `DonutChart`)는 `src/components/` 바로 아래.
- `src/components/modals/` 아래 모달들(`ExpenseModal`, `StockTradeModal` 등)은 전부 `App.tsx`의 중앙 `modal: ModalState | null` 상태와 스위치 렌더링으로 열립니다. 반면 특정 탭 하나에서만 쓰는 자체완결형 모달은 `src/components/` 바로 아래 두고 그 탭이 로컬 `useState`로 직접 열고 닫습니다 — 예: `src/components/ExportModal.tsx`는 `src/components/tabs/MoreTab.tsx`의 로컬 `exportOpen` 상태로 토글됩니다. 새 모달을 추가할 때 App.tsx 중앙 상태에 태울지, 탭 로컬 상태로 둘지는 이 기준(여러 곳에서 여는 모달인가/한 탭에서만 여는 모달인가)으로 판단합니다.

## 자주 쓰이는 패턴

### 인라인 스타일 관례
`style={{ ... }}`는 코드베이스 전반(75곳 이상)에서 쓰이지만 역할이 명확히 구분됩니다.
- **정적/재사용 스타일**: `className`으로 `src/index.css`의 클래스를 참조 (레이아웃, 버튼, 카드 등 대부분).
- **인라인 `style`**: 데이터에서 나온 동적 값(Firestore에 저장된 색상 `t.color`, 조건부 색상 `signColor(n)` 같은 계산값)이나, 특정 위치에서만 필요한 일회성 레이아웃 조정(`{ flex: 1 }`, `{ marginTop: 12 }` 등)에 한정해서 사용합니다.
- 여러 파일에서 재사용되는 동적 값 계산(포맷, 색상 등)은 파일 로컬 함수가 아니라 `src/utils.ts`의 순수 함수로 뽑아 공유합니다(`fmtWon`, `fmtNum`, `signColor`, `percentColor`, `fmtStockPercent`, `stockProfitOf`, `stockProfitPercentOf`, `badgeStyle`). 자세한 내용은 아래 "순수 포맷/가공 로직은 형제 `.ts` 모듈로 분리" 참고. 단일 파일에서만 쓰는 일회성 계산은 여전히 그 파일 상단에 로컬 함수로 둡니다.
- `badgeStyle(color)`(`src/utils.ts`)처럼, CSS 클래스(`.method-badge`, `.category-badge`, `.asset-type-badge`)에 동적 색상을 넘길 때 인라인 `style`에 CSS 커스텀 프로퍼티(`--badge`)만 심어두고 실제 색 계산(`color-mix(in srgb, var(--badge) ...)`)은 `src/index.css` 쪽에서 하는 패턴이 있습니다. 이 `--badge`는 `:root`/`[data-theme="dark"]`에 정의되는 디자인 토큰이 아니라 인스턴스별 동적 값이라는 점에서 위 "CSS 커스텀 프로퍼티(디자인 토큰)" 목록과는 다릅니다.

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

### 순수 포맷/가공 로직은 형제 `.ts` 모듈로 분리
컴포넌트 파일 자체는 얇게 유지하고, 재사용되는 순수 함수·타입은 별도 `.ts` 모듈로 뽑아둡니다. 둘 다 `interface Props`가 없는 일반 모듈이고 named export로 함수/타입만 내보냅니다.
- `src/utils.ts`: 여러 탭/모달이 공유하는 포맷터·계산 함수 모음(`fmtWon`, `fmtNum`, `signColor`, `percentColor`, `fmtStockPercent`, `stockProfitOf`, `stockProfitPercentOf`, `badgeStyle`). `src/components/tabs/StockTab.tsx`, `AssetsTab.tsx`, `HomeTab.tsx`, `FixedTab.tsx`, `ExpenseTab.tsx`, `src/components/modals/StockTradeModal.tsx`, `src/hooks/useData.ts`, `src/export.ts` 등 다수가 이 모듈에서 import합니다.
- `src/export.ts`: 데이터 내보내기 전용 가공 로직(`filterByRange`, `formatAsText`)과 관련 타입(`ExportData`, `ExpenseRecord`)을 모아두고, `src/components/ExportModal.tsx`는 이 함수들을 호출해 텍스트를 만들고 다운로드(`Blob`/`URL.createObjectURL`)를 트리거하는 얇은 UI 컴포넌트로만 남습니다.

### 모달 내부의 재사용 로직을 독립 컴포넌트로 추출
여러 화면에서 재사용할 상태 있는 UI 블록은 모달 안에 인라인으로 두지 않고 독립 컴포넌트로 뽑아 `src/components/` 바로 아래 둡니다. 계정 설정을 담당하던 `src/components/modals/AccountModal.tsx`가 삭제되고, 그 안에 있던 두 덩어리의 상태 로직이 각각 독립 컴포넌트로 추출된 것이 실제 사례입니다: 가계부 모드 전환/초대코드 참여 로직은 `src/components/HouseholdSection.tsx`, 데이터 내보내기 로직은 `src/components/ExportModal.tsx`. 두 컴포넌트 모두 자체 로컬 `useState`를 갖고, 부모로부터는 콜백(`onCreate`, `onJoin`, `onLeave`, `onExport` 등)만 props로 받아 Firestore를 직접 호출하지 않습니다(아래 "데이터 흐름/콜백 관례" 그대로 따름). 현재는 `src/components/tabs/MoreTab.tsx`가 두 컴포넌트를 함께 소비하는 유일한 화면입니다.

### 데이터 흐름/콜백 관례
- 탭·모달 컴포넌트는 Firestore를 직접 호출하지 않고 `useData()`가 반환한 함수(`addExpense`, `updateStockTrade` 등)만 props로 내려받아 호출합니다.
- 모달의 `onSave`/`onDelete`는 `App.tsx`에서 `async (...) => { await data.xxx(...); closeModal() }` 형태의 인라인 클로저로 정의되는 것이 기본형입니다.

## 에러 처리

- **`try`/`catch` + `alert()`로 저장/삭제 실패를 알리는 패턴이 `src/App.tsx`의 `withErrorAlert` 헬퍼로 중앙화되어 있습니다** (과거엔 `AssetAccountModal`의 `onSave` 콜백 1곳에만 있던 일회성 try/catch였는데, 이 리팩터에서 공용 헬퍼로 일반화됨).
  ```ts
  function withErrorAlert<A extends unknown[]>(action: string, fn: (...args: A) => Promise<void>) {
    return async (...args: A) => {
      try {
        await fn(...args)
      } catch (e) {
        alert(`${action} 중 오류가 발생했어요: ` + (e instanceof Error ? e.message : String(e)))
      }
    }
  }
  ```
  `App.tsx`가 렌더링하는 중앙 모달들(`ExpenseModal`, `IncomeEntryModal`, `StockTradeModal`, `FixedListModal`, `SavingsListModal`, `AssetAccountModal`, `PaymentLabelsModal`, `CategoryModal`, `AssetTypeModal`, `StockCategoryModal`)의 `onSave`/`onDelete`/`onDeleteGroup` 콜백은 전부 `withErrorAlert('저장', ...)` / `withErrorAlert('삭제', ...)`로 감싸서 넘깁니다.
- **자체 로딩 상태를 함께 관리해야 하는 일회성 비동기 액션은 `withErrorAlert`를 쓰지 않고 자체 `try`/`catch`/`finally`를 둡니다.** 예: `src/components/ExportModal.tsx`의 `handleExport`는 `finally { setExporting(false) }`가 필요해서 별도 try/catch로 작성돼 있습니다(에러 메시지 포맷은 `withErrorAlert`와 동일하게 `` `${action} 중 오류가 발생했어요: ` + (e instanceof Error ? e.message : String(e)) `` 패턴을 그대로 따름). 이 둘을 제외한 나머지 비동기 콜백은 여전히 에러를 잡지 않고 그대로 전파합니다(unhandled rejection이 될 수 있음).
- 유일한 에러 표시 방법은 여전히 `alert()`이며, 호출 지점은 코드베이스 전체에 2곳뿐입니다(`src/App.tsx`의 `withErrorAlert`, `src/components/ExportModal.tsx`의 `handleExport`) — 다만 `withErrorAlert`가 위 10개 모달에 재사용되므로 실질적으로 적용되는 콜백 수는 더 많습니다.
- `console.error`/`console.warn`/`console.log` 등 콘솔 로깅은 `src/` 어디에도 없습니다(0건).
- **입력 검증은 HTML5 제약(`<input min={0}>` 등)에 의존하지 않습니다.** 모달은 `<form>`으로 감싸여 있지 않고 버튼 `onClick`으로 직접 저장을 트리거하므로 브라우저 constraint validation이 동작하지 않습니다(`.forge/retro/260812-200000-stock-profit-percent.md`에서 실제로 발견·기록된 사실). 실질적인 검증은 JS 레벨에서 저장 직전에 계산되는 `valid`/`canSave` 같은 boolean으로 처리됩니다(예: `FixedListModal.tsx`의 `rows.filter(r => r.label.trim() && Number(r.amount) > 0)`, `CategoryModal.tsx`의 `items.filter(c => c.label.trim())`). 이 검증이 없거나 불완전한 모달이 있을 수 있다는 점이 회고 문서에 후속 점검 후보로 남아 있습니다.
- Firebase 함수(`signIn`, `joinHousehold` 등) 자체는 실패 시 Promise를 reject하거나(예: `signInWithPopup`), 명시적으로 `boolean`을 리턴해 실패를 나타냅니다(`joinHousehold`가 코드 없으면 `false`). 호출부(`src/components/HouseholdSection.tsx`, 과거엔 `AccountModal.tsx`)는 이 boolean을 받아 자체적으로 에러 메시지 상태(`joinError`)를 세팅하는 방식을 씁니다(`try`/`catch` 없이 리턴값 체크).
- 서로 연동된 두 문서를 함께 쓰는 경우(위 "Firestore 접근 함수"의 `XWithY` 패턴) 원자성은 애플리케이션 코드의 `try`/`catch`가 아니라 Firestore `writeBatch`의 all-or-nothing 커밋으로 보장합니다.
