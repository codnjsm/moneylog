---
last_mapped_commit: d7cb05506bb3373788498af458bd8c8e4ef63412
mapped: 2026-08-12
---

# INTEGRATIONS

이 프로젝트는 별도 백엔드 서버가 없고, 클라이언트(브라우저)가 Firebase SDK를 통해 Firebase 프로젝트(`moneylog-3c3d6`)에 직접 접근하는 구조입니다. 모든 Firebase 초기화와 데이터 접근 함수는 `src/firebase.ts` 한 곳에 모여 있으며, 이 파일이 유일한 외부 연동 지점(데이터 접근 계층)입니다.

## Firebase 프로젝트 설정

`src/firebase.ts`에 `firebaseConfig` 객체가 코드에 직접 하드코딩되어 있음(환경변수 미사용, `.env` 파일 없음):

```ts
const firebaseConfig = {
  apiKey: 'AIzaSyA7jMyOyO_FCqXoGouKwDKBpfnBhvFk2LY',
  authDomain: 'moneylog-3c3d6.firebaseapp.com',
  projectId: 'moneylog-3c3d6',
  storageBucket: 'moneylog-3c3d6.firebasestorage.app',
  messagingSenderId: '380428394736',
  appId: '1:380428394736:web:810d4039adfe5530f4e235',
  measurementId: 'G-GR7EHDDR41',
}
```

- `initializeApp(firebaseConfig)`으로 앱 초기화, `getAuth(app)`과 `getFirestore(app)`를 각각 `auth`, `db`로 export.
- `.firebaserc`의 `projects.default`도 동일하게 `moneylog-3c3d6`.
- 개발(`npm run dev`)과 배포된 프로덕션이 별도 Firebase 프로젝트로 분리되어 있지 않고, 항상 이 하나의 Firebase 프로젝트(실제 운영 Firestore)를 사용.
- `measurementId`가 설정되어 있지만 `firebase/analytics` 모듈 import나 `getAnalytics()` 호출은 `src/firebase.ts`에 없음 — Analytics SDK는 코드상 미사용.

## 인증 (Firebase Auth)

- 사용하는 provider: `GoogleAuthProvider` (Google 로그인만 지원, 다른 provider 없음).
  ```ts
  const provider = new GoogleAuthProvider()
  provider.setCustomParameters({ prompt: 'select_account' })
  ```
- 로그인 방식: `signInWithPopup(auth, provider)` — 팝업 방식(리다이렉트 방식 아님).
- `src/firebase.ts`에서 export하는 인증 관련 함수:
  - `signIn()` → `signInWithPopup(auth, provider).then((r) => r.user)`
  - `signOutUser()` → `signOut(auth)`
  - `onAuth(cb)` → `onAuthStateChanged(auth, cb)`
- 이 함수들은 `src/hooks/useAuth.ts`에서 `onAuth`를 구독하는 형태로 소비됨(`user`, `loading` state 노출).
- `src/App.tsx`에서 Google 로그인 버튼에 Google 정적 아이콘(`https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg`)을 `<img src=...>`로 직접 로드 — 이것이 코드에서 발견되는 유일한 하드코딩된 외부 URL(폰트 CDN 제외).

## 데이터베이스 (Cloud Firestore)

클라이언트 SDK(`firebase/firestore`)로 직접 접근. 서버사이드 API, REST 엔드포인트, Cloud Functions 없음.

### 사용 중인 Firestore 컬렉션

`src/firebase.ts`와 `firestore.rules`에서 확인된 컬렉션 목록:

| 컬렉션 | 문서 ID 패턴 | 비고 |
|---|---|---|
| `user_profiles` | `{uid}` (실제 auth uid) | `subscribeUserProfile`, `setUserProfile` |
| `households` | `{code}` (초대코드) | `createHousehold`, `joinHousehold`, `leaveHousehold` |
| `expenses` | auto-id | `subscribeExpenses`, `addExpense`, `updateExpense`, `deleteExpense`, `subscribeExpensesExist`, `deleteExpensesByGroupId` |
| `stock_trades` | auto-id | `subscribeStockTrades`, `addStockTrade`, `updateStockTrade`, `deleteStockTrade` |
| `asset_accounts` | auto-id | fallback 조회 대상 (`getAssetAccountsFallback`) |
| `fixed_items` | auto-id | fallback 조회 대상 (`getFixedItemsFallback`) |
| `savings_items` | auto-id | fallback 조회 대상 (`getSavingsItemsFallback`) |
| `fixed_monthly` | `{uid}_{yearMonth}` | `subscribeFixedItemsMonthly`, `setFixedItemsMonthly` |
| `savings_monthly` | `{uid}_{yearMonth}` | `subscribeSavingsItemsMonthly`, `setSavingsItemsMonthly` |
| `monthly_income` | `{uid}_{yearMonth}` | `subscribeMonthlyIncome`, `setMonthlyIncome` |
| `asset_accounts_monthly` | `{uid}_{yearMonth}` | `subscribeAssetAccountsMonthly`, `setAssetAccountsMonthly` |
| `asset_snapshots` | `{uid}_{yearMonth}` | `subscribeAssetSnapshot`, `setAssetSnapshot` |
| `payment_labels` | `{uid}` | `subscribePaymentMethods`, `setPaymentMethods` |
| `expense_categories` | `{uid}` | `subscribeCategories`, `setCategories` |
| `asset_types` | `{uid}` | `subscribeAssetTypes`, `setAssetTypes` |
| `stock_categories` | `{uid}` | `subscribeStockCategories`, `setStockCategories` |

이 표에서 `uid`는 문서 ID/필드로 쓰이는 문자열 값을 그대로 지칭한 것으로, 실제 auth uid와 다른 의미를 가질 수 있는 컬렉션도 있음(`user_profiles` 제외) — 값의 의미 자체는 이 문서의 범위 밖(CONTEXT.md 참고).

### 사용하는 Firestore SDK API

`src/firebase.ts` 상단 import 기준: `getFirestore`, `collection`, `doc`, `setDoc`, `addDoc`, `updateDoc`, `deleteDoc`, `query`, `where`, `onSnapshot`, `getDoc`, `getDocs`, `arrayUnion`, `arrayRemove`, `limit`.

- 실시간 구독은 `onSnapshot` 기반(`subscribe*` 함수들).
- 일회성 조회는 `getDoc`/`getDocs` 기반(fallback 함수들, `exportAllData`).
- 쿼리는 전부 단일 필드 `where` 조건(`uid ==`, 일부는 `yearMonth ==`, `installmentGroupId ==` 추가) + 경우에 따라 `limit(1)`. 복합 인덱스 필요 여부를 명시하는 별도 `firestore.indexes.json` 파일은 저장소에 없음.
- `exportAllData(uid)`: 위 컬렉션들을 `Promise.all`로 병렬 조회해 사용자의 전체 데이터를 하나의 객체로 반환하는 데이터 export 함수.

### Firestore 보안 규칙 (`firestore.rules`)

- `rules_version = '2'`.
- 핵심 헬퍼 함수: `signedIn()` (`request.auth != null`), `isHouseholdMember(code)` (`households/{code}` 문서의 `members` 배열에 uid 포함 여부 확인), `ownsSpace(spaceId)` (`signedIn() && (request.auth.uid == spaceId || isHouseholdMember(spaceId))`).
- `user_profiles/{uid}`: 본인만 read/write.
- `households/{code}`: `get`은 로그인 사용자 누구나 가능, `list`는 항상 `false`(전체 목록 열람 차단), `create`는 `createdBy`와 `members`가 생성자 본인으로 제한, `update`는 로그인 사용자 누구나 가능, `delete`는 항상 `false`.
- `expenses`, `stock_trades`, `asset_accounts`, `fixed_items`, `savings_items`: `resource.data.uid`/`request.resource.data.uid` 기준 `ownsSpace` 검사. `update` 시 `uid` 필드 값 변경은 금지(`request.resource.data.uid == resource.data.uid`).
- `fixed_monthly`, `savings_monthly`, `monthly_income`, `asset_accounts_monthly`, `asset_snapshots`: 위와 동일한 `ownsSpace` 패턴이지만 `delete` 규칙은 정의되어 있지 않음(따라서 기본적으로 거부).
- `payment_labels/{spaceId}`, `expense_categories/{spaceId}`, `asset_types/{spaceId}`, `stock_categories/{spaceId}`: 문서 ID 자체가 space id이며 `ownsSpace(spaceId)`로 read/write 모두 검사.
- 규칙 배포 명령: `firebase deploy --only firestore:rules --project moneylog-3c3d6` (README.md, CLAUDE.md에 기재).

## Hosting (Firebase Hosting)

- `firebase.json`의 `hosting.public: "dist"` — Vite 빌드 산출물을 배포.
- `hosting.rewrites`: 모든 경로(`**`)를 `/index.html`로 리다이렉트(SPA 클라이언트 라우팅 지원).
- `hosting.ignore`: `firebase.json`, dotfiles, `node_modules` 배포 제외.
- 배포 명령: `firebase deploy --only hosting --project moneylog-3c3d6`.
- 배포 대상 도메인: `moneylog-3c3d6.web.app` (`index.html`의 `og:url`, `og:image`에 하드코딩).
- CI/CD 파이프라인 없음 — 수동 CLI 배포만 존재.

## 외부 API / Webhook

- Firebase(Auth, Firestore, Hosting) 외의 외부 API 연동은 코드베이스에서 발견되지 않음. `fetch`, `axios`, `XMLHttpRequest` 호출이 소스코드(`src/**/*.ts`, `src/**/*.tsx`)에 없음.
- 외부 리소스 참조(코드/정적 파일에서 발견된 하드코딩 URL):
  - `index.html`: Google Fonts stylesheet (`https://fonts.googleapis.com/css2?...`)
  - `src/App.tsx`: Google 로그인 아이콘 이미지 (`https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg`)
- Webhook, 결제 연동(PG), 이메일/알림 발송 서비스, 서버사이드 Cloud Functions는 존재하지 않음.

## 환경변수 / Secrets

- `.env` 계열 파일 없음(`.gitignore`에 `*.local`만 있고 `.env`는 별도 명시 없음, 실제 파일도 없음).
- Firebase config 값이 `src/firebase.ts`에 코드로 직접 작성되어 있어 별도의 secret 관리 체계가 없음(공개 클라이언트 config이므로 Firebase 자체 설계상 노출을 전제로 함; 실제 접근 제어는 `firestore.rules`가 담당).
