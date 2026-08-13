---
last_mapped_commit: d7cb05506bb3373788498af458bd8c8e4ef63412
mapped: 2026-08-12
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
- 탭: `src/components/tabs/{DashboardTab,ExpenseTab,FixedTab,AssetsTab,StockTab,CalendarTab}.tsx` — `App.tsx`에서 받은 데이터를 렌더링하고, 사용자 액션(추가/수정 버튼 클릭 등)을 `onAdd`/`onEdit`/`onEditCategories` 같은 콜백 prop 호출로 상위에 위임한다. Firebase나 `useData`를 직접 import하지 않는다.
- 모달: `src/components/modals/*.tsx` (14개 파일) — 각 모달은 `src/components/Modal.tsx`(오버레이/ESC 닫기/스크롤 잠금을 담당하는 공용 래퍼)로 감싸며, 폼 입력값은 모달 내부의 로컬 `useState`로 관리하고, 저장/삭제 시 `onSave`/`onDelete` 콜백을 호출한다. Firebase를 직접 호출하지 않고 항상 `App.tsx`가 넘겨준 콜백을 통해서만 데이터를 변경한다.
- 공용 컴포넌트: `src/components/Modal.tsx`(모달 오버레이), `src/components/CustomSelect.tsx`(커스텀 드롭다운), `src/components/DonutChart.tsx`(도넛 차트 SVG), `src/components/Header.tsx`/`src/components/Sidebar.tsx`(상단/좌측 네비게이션 UI), `src/components/TabBar.tsx`(하단 탭 바, `Tab` 타입 정의).

## 3. 데이터 흐름 (실제 코드 추적)

예시 1 — 지출 추가:
1. `ExpenseTab`(`src/components/tabs/ExpenseTab.tsx`)에서 사용자가 추가 버튼을 누르면 `onAdd` prop이 호출된다.
2. `App.tsx`의 `onAdd={() => setModal({ type: 'expense' })}` (App.tsx:142)가 실행되어 `modal` state가 바뀌고 `ExpenseModal`이 렌더링된다.
3. 사용자가 `ExpenseModal` 폼을 채우고 저장하면 `ExpenseModal`의 `onSave` prop이 호출된다. `App.tsx`(191~198행)의 구현은 `data.updateExpense(...)` 또는 `data.addExpense(d)`를 호출한다.
4. `data.addExpense`는 `useData.ts`(113행)에서 `(d) => addExpense(uid, d)`로 정의되어 있고, 이는 `firebase.ts`의 `addExpense(uid, data)`(80~81행)를 호출한다.
5. `firebase.ts`의 `addExpense`는 `addDoc(collection(db, 'expenses'), { ...data, uid, createdAt: Date.now() })`로 Firestore에 직접 문서를 생성한다.
6. Firestore에 문서가 생성되면, `useData.ts`에서 이미 구독 중인 `subscribeExpenses(uid, yearMonth, setExpenses)`(useData.ts:56)의 `onSnapshot` 콜백이 새 스냅샷을 받아 `setExpenses`를 호출한다.
7. `expenses` state가 바뀌면서 `App.tsx`가 재렌더되고, 그 값을 props로 받는 `ExpenseTab`, `CalendarTab`, `DashboardTab` 등이 자동으로 갱신된다.

예시 2 — 주식 매도 기록(연쇄 쓰기):
- `useData.ts`의 `addStockTrade`(118~130행)는 매도 데이터를 받아 `profit`을 계산한 뒤, 먼저 `addExpense(uid, {..., type: 'income', amount: profit})`로 수익을 하나의 소득 항목(expense 문서)으로 기록하고, 그 결과로 생성된 문서 id(`expenseRef.id`)를 `linkedExpenseId`로 넣어 `firebaseAddStockTrade`(즉 `firebase.ts`의 `addStockTrade`)를 호출해 `stock_trades` 문서를 별도로 생성한다. 즉 하나의 사용자 액션이 두 개의 Firestore 컬렉션(`expenses`, `stock_trades`)에 순차적으로 쓰기를 발생시킨다.

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
- 탭 선택은 `localStorage`의 `moneylog-tab` 키에 저장/복원되며(App.tsx 50~54행, 63~65행), 별도 라우팅 없이 클라이언트 state와 `localStorage`만으로 처리된다.
