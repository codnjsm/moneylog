---
last_mapped_commit: a28aa9e61a6b8610bdfe37adc648b11f2eb413de
mapped: 2026-09-15
---

# 아키텍처

## 1. 전체 아키텍처 패턴

이 저장소는 별도의 백엔드 서버 코드를 갖지 않는 **클라이언트 단독 SPA**다.

- `package.json`의 `dependencies`는 `firebase`, `react`, `react-dom` 세 개뿐이고, express/server 프레임워크나 자체 API 서버 코드는 저장소 어디에도 없다.
- `src/firebase.ts`가 `firebase/app`, `firebase/auth`, `firebase/firestore` 클라이언트 SDK를 브라우저에서 직접 `initializeApp`하고, 이후 모든 데이터 읽기/쓰기는 브라우저 -> Firestore(Firebase, BaaS) 직접 호출로 이루어진다. 즉 Firebase를 BaaS로 직접 사용하는 구조다.
- `firebase.json`은 Firebase Hosting(정적 파일 배포)과 `firestore.rules`만을 설정하며, Cloud Functions 등 서버 코드 배포 설정은 없다.
- 접근 제어는 서버 코드가 아니라 `firestore.rules`(보안 규칙)로 클라이언트의 직접 쓰기를 검증한다.
- 라우팅 라이브러리(react-router 등)는 `package.json`에 없고, 화면 전환은 `src/App.tsx` 내부의 `tab` state로만 처리된다(아래 5절).

## 2. 레이어 구조

코드는 4개 레이어로 나뉘며, 각 레이어는 실제 파일의 import/export 관계로 확인된다.

### 레이어 1 — Firebase 접근 계층: `src/firebase.ts` (260줄)
- `initializeApp`, `getAuth`, `getFirestore`를 호출해 `auth`, `db`를 export한다.
- `signIn`, `signOutUser`, `onAuth` — Google 로그인 팝업 및 인증 상태 구독 함수를 export한다.
- Firestore 컬렉션별로 `subscribe*`(onSnapshot 실시간 구독), `get*Fallback`(1회성 폴백 조회), `add*`/`update*`/`set*`/`delete*`(쓰기) 함수를 flat하게 export한다(예: `subscribeExpenses`, `addExpense`, `updateExpense`, `deleteExpense`, `subscribeFixedItemsMonthly`, `setFixedItemsMonthly`, `getFixedItemsFallback` 등).
- 이 파일은 React를 import하지 않는 순수 함수 모음이며, React 상태를 알지 못한다. 각 함수는 `uid`(실제로는 아래 4절에서 설명하는 spaceId)와 `yearMonth` 등을 매개변수로 받는다.
- `exportAllData(uid)`: 사용자의 모든 컬렉션을 `Promise.all`로 병렬 조회해 하나의 JSON 객체로 반환하는 데이터 내보내기 함수도 이 파일에 있다.
- households(`createHousehold`, `joinHousehold`, `leaveHousehold`)와 `user_profiles` 문서(`subscribeUserProfile`, `setUserProfile`) 관련 함수도 이 파일에 있다.

### 레이어 2 — 데이터 훅 계층: `src/hooks/*.ts`
- `useAuth.ts`(14줄): `onAuth`를 `useEffect`로 구독해 `{ user, loading }`을 반환한다.
- `useHousehold.ts`(40줄): `subscribeUserProfile`을 구독해 `householdCode`, `mode`('personal' | 'shared')를 state로 관리하고, `create`/`join`/`leave`/`switchMode` 액션과 `spaceId`(계산된 값)를 반환한다.
- `useData.ts`(176줄): `(uid, yearMonth)`를 받아 `firebase.ts`의 모든 `subscribe*` 함수를 `useEffect`로 구독해 `expenses`, `fixedItems`, `savingsItems`, `assetAccounts`, `assetSnapshot`, `stockTrades`, `paymentMethods`, `categories`, `assetTypes`, `stockCategories` 등을 state로 노출하고, 각 도메인에 대한 CRUD 콜백(`addExpense`, `updateExpense`, `bulkSaveFixedItems`, `addStockTrade` 등)을 함께 반환한다.
- 이 계층은 `firebase.ts`의 함수만 import하며, 컴포넌트를 import하지 않는다.

### 레이어 3 — 최상위 컨테이너: `src/App.tsx` (310줄)
- `useAuth`, `useHousehold`, `useData`를 호출해 데이터와 콜백을 얻는다.
- `tab`(현재 탭), `monthOffset`(조회 월), `modal`(현재 열린 모달과 그 payload)을 자체 `useState`로 관리한다.
- 모든 Tab 컴포넌트와 Modal 컴포넌트를 import하여, `data`에서 얻은 값과 `data`의 CRUD 함수를 각 컴포넌트에 props로 전달한다.
- Context API나 전역 상태 라이브러리는 사용하지 않는다 — `App.tsx` 자체가 유일한 상태 컨테이너이고, 하위 컴포넌트는 props로만 데이터를 받는다.

### 레이어 4 — 화면 컴포넌트
- 탭: `src/components/tabs/{HomeTab,ExpenseTab,FixedTab,AssetsTab,StockTab,CalendarTab,MoreTab}.tsx` — `App.tsx`에서 받은 데이터를 렌더링하고, 사용자 액션(추가/수정 버튼 클릭 등)을 `onAdd`/`onEdit`/`onEditCategories` 같은 콜백 prop 호출로 상위에 위임한다. Firebase나 `useData`를 직접 import하지 않는다.
  - `src/components/tabs/HomeTab.tsx`는 `Tab` 값 `'home'`에 대응하는 앱의 기본 랜딩 탭이다(기존 도넛 차트 전용 `DashboardTab.tsx`는 삭제됨). 남은 지출 가능액 히어로 + 다가오는 결제, 예산 사용률 진행바, 최다 지출 카테고리 하이라이트, 카테고리 도넛 차트, 수입 목록+합계, 자산종류별 목록+합계, 최근 활동 피드를 한 화면에서 보여준다.
  - `src/components/tabs/MoreTab.tsx`는 `Tab` 값 `'more'`에 대응하며, `Header`/`Sidebar`의 아바타 클릭으로만 진입한다(하단 탭 바 버튼 없음). 기존 `AccountModal.tsx`(삭제됨)를 대체하며, 계정 정보 카드·테마 토글(라이트/다크)·가계부 모드(개인/공유) 섹션·데이터 내보내기 행·로그아웃을 담는다.
- 모달: `src/components/modals/*.tsx` — 각 모달은 `src/components/Modal.tsx`(오버레이/ESC 닫기/스크롤 잠금을 담당하는 공용 래퍼)로 감싸며, 폼 입력값은 모달 내부의 로컬 `useState`로 관리하고, 저장/삭제 시 `onSave`/`onDelete` 콜백을 호출한다. Firebase를 직접 호출하지 않고 항상 `App.tsx`가 넘겨준 콜백을 통해서만 데이터를 변경한다. (기존 `AccountModal.tsx`는 삭제되고 `MoreTab`과 아래 두 공용 컴포넌트로 대체되었다.)
- 공용 컴포넌트: `src/components/Modal.tsx`(모달 오버레이), `src/components/CustomSelect.tsx`(커스텀 드롭다운), `src/components/DonutChart.tsx`(도넛 차트 SVG), `src/components/Header.tsx`/`src/components/Sidebar.tsx`(상단/좌측 네비게이션 UI, 아바타 클릭 시 `onAvatarClick`으로 `more` 탭 진입 위임), `src/components/TabBar.tsx`(하단 탭 바, `Tab` 타입 정의).
  - `src/components/HouseholdSection.tsx` — 개인/공유 가계부 모드 토글 + 초대 코드 UI. 기존 `useHousehold` 훅을 그대로 사용하며, `MoreTab`(그리고 예전에는 `AccountModal`)에서 재사용하기 위해 별도 컴포넌트로 추출됨.
  - `src/components/ExportModal.tsx` — 날짜 범위를 입력받아 데이터 내보내기를 실행하는 서브 다이얼로그. `src/export.ts`의 `filterByRange`/`formatAsText`로 실제 필터링·텍스트 포맷팅을 수행하고, 결과를 `.txt` 파일로 다운로드한다. `App.tsx`가 넘겨준 `onExport`(= `firebase.ts`의 `exportAllData(uid)`) 콜백으로 원본 데이터를 받아온다.
- 순수 헬퍼 모듈: `src/utils.ts`(금액/퍼센트 포맷팅 등 `fmtWon`/`fmtNum`/`stockProfitOf`/`stockProfitPercentOf`/`fmtStockPercent`/`signColor`/`percentColor`, React를 import하지 않는 순수 함수 모음), `src/export.ts`(내보내기 데이터 필터링/텍스트 포맷팅 순수 함수, `exportAllData`의 반환 타입을 `ExportData`로 재사용). 여러 탭/모달(`HomeTab`, `StockTradeModal`, `useData.ts` 등)이 `utils.ts`를 공통으로 import한다.

## 3. 데이터 흐름 (실제 코드 추적)

예시 1 — 지출 추가:
1. `ExpenseTab`(`src/components/tabs/ExpenseTab.tsx`)에서 사용자가 추가 버튼을 누르면 `onAdd` prop이 호출된다.
2. `App.tsx`의 `onAdd={() => setModal({ type: 'expense' })}` (App.tsx:142)가 실행되어 `modal` state가 바뀌고 `ExpenseModal`이 렌더링된다.
3. 사용자가 `ExpenseModal` 폼을 채우고 저장하면 `ExpenseModal`의 `onSave` prop이 호출된다. `App.tsx`(191~198행)의 구현은 `data.updateExpense(...)` 또는 `data.addExpense(d)`를 호출한다.
4. `data.addExpense`는 `useData.ts`(113행)에서 `(d) => addExpense(uid, d)`로 정의되어 있고, 이는 `firebase.ts`의 `addExpense(uid, data)`(80~81행)를 호출한다.
5. `firebase.ts`의 `addExpense`는 `addDoc(collection(db, 'expenses'), { ...data, uid, createdAt: Date.now() })`로 Firestore에 직접 문서를 생성한다.
6. Firestore에 문서가 생성되면, `useData.ts`에서 이미 구독 중인 `subscribeExpenses(uid, yearMonth, setExpenses)`(useData.ts:56)의 `onSnapshot` 콜백이 새 스냅샷을 받아 `setExpenses`를 호출한다.
7. `expenses` state가 바뀌면서 `App.tsx`가 재렌더되고, 그 값을 props로 받는 `ExpenseTab`, `CalendarTab`, `HomeTab` 등이 자동으로 갱신된다.

예시 2 — 주식 매도 기록(원자적 배치 쓰기):
- `useData.ts`의 `addStockTrade`는 매도 데이터를 받아 `utils.ts`의 `stockProfitOf`로 `profit`을 계산한 뒤, 수익 소득 항목(`expenses` 문서 초안)과 매매 데이터(`stock_trades` 문서 초안)를 함께 `firebase.ts`의 `addStockTradeWithExpense(uid, stockData, expenseData)`로 넘긴다.
- `addStockTradeWithExpense`는 `writeBatch(db)`로 `expenses`와 `stock_trades` 두 문서를 미리 만든 `doc()` ref에 `batch.set`하고 `linkedExpenseId`로 서로를 연결한 뒤 `batch.commit()`한다. 즉 두 컬렉션에 대한 쓰기가 하나의 원자적 배치로 묶여, 중간 실패로 인해 한쪽 문서만 생성되는 상태(orphan)가 발생하지 않는다. 수정/삭제도 각각 `updateStockTradeWithExpense`/`deleteStockTradeWithExpense`가 동일하게 `writeBatch`로 `stock_trades`와 연결된 `expenses` 문서를 함께 갱신/삭제한다(이전에는 `addExpense` 후 별도로 `addStockTrade`를 호출하는 순차 쓰기였으나, 배치 쓰기로 교체됨).

이처럼 전 구간에서 상태 관리 라이브러리(Redux 등)는 사용되지 않고, "Firestore `onSnapshot` 구독 → React `useState` → props 전달"이 유일한 갱신 경로다.

## 4. 핵심 추상화

### 4.1 `customX ?? DEFAULT_X` — 커스텀 목록 폴백 패턴
`src/hooks/useData.ts`(83~86행)에 실제로 존재하는 패턴:
```ts
const paymentMethods: PaymentMethodDef[] = customMethods ?? DEFAULT_PAYMENT_METHODS
const categories: CategoryDef[] = customCategories ?? DEFAULT_CATEGORIES
const assetTypes: AssetTypeDef[] = customAssetTypes ?? DEFAULT_ASSET_TYPES
const stockCategories: StockCategoryDef[] = customStockCategories ?? DEFAULT_STOCK_CATEGORIES
```
`customMethods`, `customCategories`, `customAssetTypes`, `customStockCategories`는 `firebase.ts`의 `subscribePaymentMethods`/`subscribeCategories`/`subscribeAssetTypes`/`subscribeStockCategories`가 문서가 없을 때 `null`을 콜백으로 전달하는 값이며, `DEFAULT_PAYMENT_METHODS`/`DEFAULT_CATEGORIES`/`DEFAULT_ASSET_TYPES`/`DEFAULT_STOCK_CATEGORIES`는 `src/types.ts`에 하드코딩된 상수 배열이다.

### 4.2 월별 데이터 + 과거 12개월 폴백 패턴
`useData.ts`(80~82행)에도 같은 형태의 `??` 패턴이 쓰인다:
```ts
const fixedItems: FixedItem[] = fixedMonthly ?? fixedFallback
const savingsItems: SavingsItem[] = savingsMonthly ?? savingsFallback
const assetAccounts: AssetAccount[] = assetAccountsMonthly ?? assetAccountsFallback
```
`fixedMonthly` 등은 `{spaceId}_{yearMonth}` 문서(`fixed_monthly` 등 컬렉션)의 실시간 구독 결과이고, 해당 월 문서가 없으면(`null`) `getFixedItemsFallback`/`getSavingsItemsFallback`/`getAssetAccountsFallback`(모두 `firebase.ts`)이 실행되어 최대 12개월 전까지 역순으로 문서를 조회하거나, 끝까지 없으면 레거시 컬렉션(`fixed_items`, `savings_items`, `asset_accounts`)을 조회한다.

### 4.3 `spaceId` — 개인/공유 모드 전환 추상화
`src/hooks/useHousehold.ts`(37행):
```ts
const spaceId = mode === 'shared' && householdCode ? householdCode : uid
```
`App.tsx`(59~60행)는 이 `spaceId`를 `useData(household.spaceId, yearMonth)`로 전달한다. `useData.ts`와 `firebase.ts`의 함수들은 매개변수명이 `uid`로 되어 있지만, 실제로 전달되는 값은 개인 모드에서는 실제 uid, 공유 모드에서는 household 초대 코드다. 이 사실은 `firestore.rules`의 주석(15~19행)에도 "Most documents in this app are keyed by a 'space id': the user's own uid in personal mode, or a shared household's invite code in shared mode"로 명시되어 있고, 규칙의 `ownsSpace(spaceId)` 함수가 이를 근거로 접근을 검증한다.

### 4.4 모달 컴포넌트 패턴
`src/components/Modal.tsx`는 오버레이 클릭/ESC 키로 닫기, body 스크롤 잠금을 담당하는 공용 래퍼이며, 모든 모달(`CategoryModal`, `ExpenseModal` 등 `src/components/modals/*`)이 이를 감싸 사용한다. 각 모달은 자체 로컬 `useState`로 편집 중인 폼 데이터를 들고 있다가, 저장 시점에만 `onSave` prop을 통해 상위(`App.tsx`)로 완성된 데이터를 넘긴다 — 즉 "모달은 스스로 Firebase를 호출하지 않고, 항상 부모가 넘겨준 콜백을 통해서만 쓰기가 일어난다"는 일관된 규약이 코드 전체에서 관찰된다.

### 4.5 `App.tsx`의 단일 `ModalState` 판별 유니언
`App.tsx`(28~40행)는 열려 있는 모달의 종류와 그 모달에 필요한 payload(예: 수정 대상 `item`, `initialDate`)를 하나의 판별 유니언 타입 `ModalState`와 단일 `modal` state로 관리한다. 새 모달을 열 때는 항상 `setModal({ type: '...', ... })` 형태로 호출되고, 렌더링 시 `modal?.type === '...'` 조건으로 분기한다.

## 5. 진입점

- `src/main.tsx`(10줄): `createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>)`만 수행한다. 라우터, Context Provider, 전역 상태 라이브러리 Provider는 전혀 감싸져 있지 않다.
- `src/App.tsx`의 `export default function App()`이 최상위 컴포넌트다. 렌더링은 세 단계로 분기한다: `loading`이 true면 로딩 문구, `user`가 없으면 Google 로그인 카드(`login-overlay`), 그 외에는 `Sidebar` + `Header` + `main.app-main`(현재 탭 컴포넌트) + `TabBar` + (열려 있다면) 모달을 렌더링한다.
- 탭 선택은 `localStorage`의 `moneylog-tab` 키에 저장/복원되며, 별도 라우팅 없이 클라이언트 state와 `localStorage`만으로 처리된다. `Tab` 타입(`src/components/TabBar.tsx`)은 `'home' | 'calendar' | 'expense' | 'fixed' | 'assets' | 'stocks' | 'more'`이고, 기본값은 `'home'`이다. 하단 `TabBar`는 `'more'`를 제외한 6개 탭(홈/캘린더/예산/지출/주식/자산)만 직접 탭 버튼으로 노출하며, `'more'` 탭은 오직 `Header`/`Sidebar`의 아바타 클릭(`onAvatarClick={() => changeTab('more')}`, `App.tsx`)으로만 진입한다 — 예전에 있던 별도의 "더보기 시트"는 없다.
- 다크/라이트 테마는 `App.tsx`의 `theme` state로 관리되고 `setTheme`이 `document.documentElement`의 `data-theme` 속성과 `localStorage`의 `moneylog-theme` 키를 함께 갱신한다. `MoreTab`의 테마 토글에서 이 값을 바꾼다. `index.html`의 인라인 부트스트랩 스크립트는 React가 로드되기 전에(FOUC 방지) `localStorage.getItem('moneylog-theme')`를 먼저 확인해 저장된 값이 있으면 그것을 `data-theme`에 적용하고, 없을 때만 `prefers-color-scheme` 미디어쿼리 리스너로 폴백한다.
