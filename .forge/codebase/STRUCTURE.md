---
last_mapped_commit: a28aa9e61a6b8610bdfe37adc648b11f2eb413de
mapped: 2026-09-15
---

# 디렉토리 구조

## 1. 전체 디렉토리 구조

`node_modules`, `.git`, `dist`(빌드 출력, `.gitignore`에 포함)를 제외한 실제 소스/설정 파일 기준 트리:

```
moneylog/
├── src/
│   ├── main.tsx                  진입점
│   ├── App.tsx                   최상위 컨테이너 컴포넌트
│   ├── firebase.ts                Firebase 초기화 및 Firestore 접근 함수
│   ├── types.ts                   타입 정의 및 기본값 상수
│   ├── utils.ts                   공용 포맷팅/계산 헬퍼 (fmtWon, fmtNum, stockProfitOf 등)
│   ├── export.ts                  데이터 내보내기 필터링/텍스트 포맷팅 순수 함수
│   ├── index.css                  전역 스타일
│   ├── assets/
│   │   ├── hero.png
│   │   └── vite.svg
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   ├── useData.ts
│   │   └── useHousehold.ts
│   └── components/
│       ├── CustomSelect.tsx
│       ├── DonutChart.tsx
│       ├── ExportModal.tsx        데이터 내보내기 날짜 범위 서브 다이얼로그
│       ├── Header.tsx
│       ├── HouseholdSection.tsx   개인/공유 가계부 모드 토글 + 초대 코드 UI
│       ├── Modal.tsx
│       ├── Sidebar.tsx
│       ├── TabBar.tsx
│       ├── tabs/
│       │   ├── AssetsTab.tsx
│       │   ├── CalendarTab.tsx
│       │   ├── ExpenseTab.tsx
│       │   ├── FixedTab.tsx
│       │   ├── HomeTab.tsx        기본 랜딩 탭('home') — 예산 요약/도넛/수입/자산/최근활동
│       │   ├── MoreTab.tsx        아바타 클릭으로 진입하는 탭('more') — 계정/테마/가계부모드/내보내기/로그아웃
│       │   └── StockTab.tsx
│       └── modals/
│           ├── AssetAccountModal.tsx
│           ├── AssetTypeModal.tsx
│           ├── CategoryModal.tsx
│           ├── ExpenseModal.tsx
│           ├── FixedItemModal.tsx
│           ├── FixedListModal.tsx
│           ├── IncomeEntryModal.tsx
│           ├── IncomeModal.tsx
│           ├── PaymentLabelsModal.tsx
│           ├── SavingsItemModal.tsx
│           ├── SavingsListModal.tsx
│           ├── StockCategoryModal.tsx
│           └── StockTradeModal.tsx
├── public/                        정적 자산 (favicon, icons.svg, og-image.png 등)
├── index.html                     Vite HTML 엔트리
├── vite.config.ts
├── tsconfig.json / tsconfig.app.json / tsconfig.node.json
├── eslint.config.js
├── package.json / package-lock.json
├── firebase.json                  Firebase Hosting 설정
├── firestore.rules                Firestore 보안 규칙
├── .firebaserc
├── CLAUDE.md
├── README.md
└── .forge/                        forge 워크플로우 상태 (plan/run/retro 등)
```

디렉토리 깊이는 최대 `src/components/{tabs,modals}/` 수준까지이며, 그 이상의 하위 폴더는 존재하지 않는다.

## 2. 주요 파일 위치 (카테고리별)

### 진입점 / 최상위
- `src/main.tsx` — React root 렌더링
- `src/App.tsx` — 최상위 컨테이너 컴포넌트

### Firebase 관련
- `src/firebase.ts` — `initializeApp`/`getAuth`/`getFirestore` 초기화, 인증 함수, 컬렉션별 CRUD·구독 함수, `exportAllData`
- `firebase.json` — Hosting 배포 설정
- `firestore.rules` — 보안 규칙
- `.firebaserc` — Firebase 프로젝트 alias 설정

### 타입 정의
- `src/types.ts` — 모든 도메인 인터페이스(`Expense`, `FixedItem`, `SavingsItem`, `AssetAccount`, `AssetSnapshot`, `StockTrade`, `PaymentMethodDef`, `CategoryDef`, `AssetTypeDef`, `StockCategoryDef`, `UserProfile`, `Household` 등)와 `DEFAULT_*` 상수, `METHOD_COLORS`가 이 한 파일에 모여 있다.

### 공용 헬퍼 (root `src/`)
- `src/utils.ts` — React를 import하지 않는 순수 함수 모음: `fmtWon`/`fmtNum`(금액 포맷), `stockProfitOf`/`stockProfitPercentOf`/`fmtStockPercent`(주식 손익 계산·포맷), `badgeStyle`/`signColor`/`percentColor`. `HomeTab`, `StockTradeModal`, `hooks/useData.ts`, `export.ts` 등 여러 파일이 공통으로 import한다.
- `src/export.ts` — `filterByRange`(월 범위 필터), `formatAsText`(내보내기 텍스트 포맷)를 export하는 순수 함수 모듈. `firebase.ts`의 `exportAllData` 반환 타입을 `ExportData`로 재사용한다. `src/components/ExportModal.tsx`에서만 import된다.

### 훅
- `src/hooks/useAuth.ts` — 인증 상태 구독
- `src/hooks/useHousehold.ts` — 개인/공유 모드 및 `spaceId` 계산
- `src/hooks/useData.ts` — 도메인 데이터 구독 + CRUD 콜백 묶음

### 탭 컴포넌트 (`src/components/tabs/`)
`AssetsTab.tsx`, `CalendarTab.tsx`, `ExpenseTab.tsx`, `FixedTab.tsx`, `HomeTab.tsx`(기본 랜딩 탭, `Tab` 값 `'home'`), `MoreTab.tsx`(아바타 클릭으로 진입, `Tab` 값 `'more'`), `StockTab.tsx`

### 모달 컴포넌트 (`src/components/modals/`)
`AssetAccountModal.tsx`, `AssetTypeModal.tsx`, `CategoryModal.tsx`, `ExpenseModal.tsx`, `FixedItemModal.tsx`, `FixedListModal.tsx`, `IncomeEntryModal.tsx`, `IncomeModal.tsx`, `PaymentLabelsModal.tsx`, `SavingsItemModal.tsx`, `SavingsListModal.tsx`, `StockCategoryModal.tsx`, `StockTradeModal.tsx`

(예전에 있던 `AccountModal.tsx`는 삭제되었다 — 계정/테마/가계부모드/내보내기 UI는 `src/components/tabs/MoreTab.tsx`와 `src/components/HouseholdSection.tsx`/`src/components/ExportModal.tsx`로 옮겨갔다.)

참고(사실 확인): 저장소 전체에서 `import` 문을 검색한 결과, `src/components/modals/FixedItemModal.tsx`, `src/components/modals/SavingsItemModal.tsx`, `src/components/modals/IncomeModal.tsx` 세 파일은 자기 자신 외의 어떤 파일에서도 import되지 않는다(`App.tsx`, `FixedListModal.tsx`, `SavingsListModal.tsx` 어디에도 참조 없음).

### 공용 UI 컴포넌트 (`src/components/`)
`CustomSelect.tsx`(커스텀 드롭다운), `DonutChart.tsx`(SVG 도넛 차트), `ExportModal.tsx`(데이터 내보내기 날짜 범위 서브 다이얼로그), `Header.tsx`, `HouseholdSection.tsx`(개인/공유 가계부 모드 토글 + 초대 코드 UI), `Sidebar.tsx`, `TabBar.tsx`(`Tab` 타입 정의 포함), `Modal.tsx`(모달 오버레이 래퍼)

### 빌드/설정
- `vite.config.ts` — `@vitejs/plugin-react`만 등록
- `tsconfig.json`, `tsconfig.app.json`, `tsconfig.node.json`
- `eslint.config.js`
- `package.json`, `package-lock.json`

## 3. 네이밍 컨벤션 (관찰된 사실)

- **컴포넌트 파일**: PascalCase + `.tsx` (예: `App.tsx`, `Header.tsx`, `CustomSelect.tsx`, `ExpenseModal.tsx`, `HomeTab.tsx`). 예외 없이 모든 `src/components/**/*.tsx`, `src/App.tsx`가 이 규칙을 따른다.
- **훅 파일**: `use` 접두사 + camelCase + `.ts` 확장자, `src/hooks/` 폴더에 위치 (`useAuth.ts`, `useData.ts`, `useHousehold.ts`). 이 파일들은 JSX를 반환하지 않으므로 `.tsx`가 아닌 `.ts`다.
- **비컴포넌트 로직 파일**: camelCase + `.ts` (`firebase.ts`, `types.ts`, `utils.ts`, `export.ts`) — `src/hooks/*` 와 동일하게 JSX 미포함 파일은 `.ts` 확장자를 쓴다.
- **탭 컴포넌트 접미사**: `<도메인>Tab.tsx` 형태로 통일 (`ExpenseTab`, `FixedTab`, `AssetsTab`, `StockTab`, `CalendarTab`, `HomeTab`, `MoreTab`), `src/components/tabs/` 폴더에 위치.
- **모달 컴포넌트 접미사**: `<도메인>Modal.tsx` 형태로 통일 (`ExpenseModal`, `StockTradeModal`, `CategoryModal` 등), `src/components/modals/` 폴더에 위치. (예외: `ExportModal.tsx`는 이름은 같은 `*Modal.tsx` 패턴을 따르지만 `src/components/` 루트에 있다 — `HouseholdSection.tsx`와 함께 여러 화면이 공유하는 컴포넌트라 `modals/` 하위가 아닌 루트에 배치됨.)
- **List/Item 모달 분리 네이밍**: `FixedListModal` vs `FixedItemModal`, `SavingsListModal` vs `SavingsItemModal` — "목록 전체를 관리하는 모달"과 "단일 항목 모달"을 별도 파일로 분리하는 이름 패턴이 존재한다(다만 위 2절 참고사항대로 `*ItemModal` 두 파일은 현재 어디서도 import되지 않는다).
- **Firebase 접근 함수 네이밍**(`src/firebase.ts`): `subscribe*`(실시간 onSnapshot 구독), `get*Fallback`(1회성 폴백 조회), `set*`/`add*`/`update*`/`delete*`(쓰기)로 동사 접두사가 기능별로 일관되게 사용된다.
- **기본값 상수 네이밍**(`src/types.ts`): `DEFAULT_*` 형태의 대문자 스네이크케이스 (`DEFAULT_PAYMENT_METHODS`, `DEFAULT_CATEGORIES`, `DEFAULT_ASSET_TYPES`, `DEFAULT_STOCK_CATEGORIES`), 그리고 `METHOD_COLORS`.
- **폴더명**: 모두 소문자 단수/복수 명사 (`hooks`, `components`, `tabs`, `modals`, `assets`), 케밥케이스나 언더스코어 폴더명은 없다.
- **Firestore 컬렉션명**: 코드 내 문자열 리터럴은 snake_case (`fixed_monthly`, `savings_monthly`, `asset_accounts_monthly`, `asset_snapshots`, `payment_labels`, `expense_categories`, `asset_types`, `stock_categories`, `stock_trades`, `user_profiles`, `households`) — TypeScript 파일명/식별자의 camelCase·PascalCase와 대비된다.
