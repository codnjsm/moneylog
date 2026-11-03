---
last_mapped_commit: ebc284377e9b3c5c5fea2a12cc2a8f1485f13a97
mapped: 2026-11-03
---

# INTEGRATIONS

이 프로젝트는 별도 백엔드 서버가 없고, 클라이언트(브라우저)가 Firebase SDK를 통해 Firebase 프로젝트(`moneylog-3c3d6`)에 직접 접근하는 구조입니다. 모든 Firebase 초기화와 데이터 접근 함수는 `src/firebase.ts` 한 곳에 모여 있으며, 이 파일이 유일한 외부 연동 지점(데이터 접근 계층)입니다.

## Firebase 프로젝트 설정

`src/firebase.ts`에 `firebaseConfig` 객체가 코드에 직접 하드코딩되어 있음(환경변수 미사용, `.env` 파일 없음):

```ts
const firebaseConfig = {
  apiKey: '…',  // 실제 값은 src/firebase.ts 참조 (웹 apiKey 는 설계상 공개 값)
  authDomain: 'moneylog-3c3d6.firebaseapp.com',
  projectId: 'moneylog-3c3d6',
  storageBucket: 'moneylog-3c3d6.firebasestorage.app',
  messagingSenderId: '380428394736',
  appId: '1:380428394736:web:810d4039adfe5530f4e235',
  measurementId: 'G-GR7EHDDR41',
}
```

- `initializeApp(firebaseConfig)`으로 앱 초기화, `getAuth(app)`과 `initializeFirestore(...)`를 각각 `auth`, `db`로 export.
- `.firebaserc`의 `projects.default`도 동일하게 `moneylog-3c3d6`.
- 개발(`npm run dev`)과 배포된 프로덕션이 별도 Firebase 프로젝트로 분리되어 있지 않고, 항상 이 하나의 Firebase 프로젝트(실제 운영 Firestore)를 사용.
- Firestore는 `initializeFirestore(app, { localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }) })`로 초기화 — IndexedDB 영구 로컬 캐시(오프라인 열람, 월 이동 시 캐시 우선 렌더, 다중 탭 지원). `getFirestore()`가 아님.
- `measurementId`가 설정되어 있지만 `firebase/analytics` 모듈 import나 `getAnalytics()` 호출은 `src/firebase.ts`에 없음 — Analytics SDK는 코드상 미사용.

## 인증 (Firebase Auth)

- 사용하는 provider 두 가지: Google(`GoogleAuthProvider`, `prompt: 'select_account'`)과 이메일/비밀번호(`EmailAuthProvider`). `auth.languageCode = 'ko'`로 인증 메일을 한국어로 발송.
- Google 로그인: `signInWithPopup(auth, provider)` — 팝업 방식.
- 이메일/비밀번호 (`src/firebase.ts`):
  - `signUpWithEmail(name, email, password)` → `createUserWithEmailAndPassword` 후 `updateProfile`(displayName)을 먼저 하고, `user_profiles` 이름 저장(`updateUserName`)과 `sendEmailVerification`을 병렬 실행. 인증 메일 발송 실패는 삼키고 `verificationSent` 플래그로 반환.
  - `sendVerificationEmail()` 인증 메일 재발송, `signInWithEmail()`, `sendPasswordReset()` 비밀번호 재설정 메일.
  - 이메일 인증을 하지 않아도 앱 사용 가능 — `firestore.rules`가 `email_verified`를 검사하지 않음.
  - `authErrorMessage(err)` — `auth/*` 에러 코드를 한국어 메시지로 매핑(`popup-closed-by-user`, `cancelled-popup-request`는 null=무시). 이메일 로그인은 Firebase 콘솔에서 provider 활성화가 필요(`auth/operation-not-allowed` 메시지 존재).
- 공통: `signIn()`, `signOutUser()`, `onAuth(cb)`(`onAuthStateChanged`), `isPasswordAccount()`(`providerData`에 `password` 포함 여부).
- 회원 탈퇴 `deleteAccount(householdCode, password?)`: 먼저 재인증(비밀번호 계정은 `reauthenticateWithCredential`, Google은 `reauthenticateWithPopup`) → 본인 uid로 저장된 `OWNED_COLLECTIONS` 문서를 400건 단위 `writeBatch`로 삭제 → `KEYED_COLLECTIONS` 문서(`{uid}`) 삭제 → household 멤버에서 `arrayRemove` → `user_profiles/{uid}` 삭제 → 마지막에 `deleteUser`. 공유 가계부(household 코드로 저장된) 데이터는 지우지 않음. UI는 `src/components/modals/DeleteAccountModal.tsx`.
- 소비 지점: `src/hooks/useAuth.ts`(`onAuth` 구독), 로그인/가입 UI는 `src/components/LoginOverlay.tsx`.
- 프로필 사진: 크롭한 128px급 JPEG 데이터 URI를 `user_profiles.photoURL` 필드에 직접 저장(`updateUserPhoto`) — Firebase Storage는 쓰지 않음(`src/lib/image.ts`, `src/components/modals/AvatarCropModal.tsx`).
- 외부 하드코딩 URL: 로그인 화면의 Google 로고는 이제 `src/components/LoginOverlay.tsx` 안의 인라인 SVG(외부 이미지 로드 없음).

## 데이터베이스 (Cloud Firestore)

클라이언트 SDK(`firebase/firestore`)로 직접 접근. 서버사이드 API, REST 엔드포인트, Cloud Functions 없음.

### 사용 중인 Firestore 컬렉션

`src/firebase.ts`와 `firestore.rules`에서 확인된 컬렉션 목록:

| 컬렉션 | 문서 ID 패턴 | 비고 |
|---|---|---|
| `user_profiles` | `{uid}` (실제 auth uid) | `subscribeUserProfile`, `setUserProfile`, `updateUserName`, `updateUserPhoto` (`displayName`, `photoURL` 등을 `merge`로 저장) |
| `households` | `{code}` (초대코드) | `createHousehold`, `joinHousehold`, `leaveHousehold` |
| `expenses` | auto-id | `subscribeExpenses`, `addExpense`, `updateExpense`, `deleteExpense`, `subscribeExpensesExist`, `deleteExpensesByGroupId` |
| `stock_trades` | auto-id | `subscribeStockTrades`, `addStockTradeWithExpense`, `updateStockTradeWithExpense`, `deleteStockTradeWithExpense` — 각각 연결된 `expenses` 문서를 `writeBatch`로 같이 쓰고 지우며, 트레이드 문서의 `linkedExpenseId` 필드로 연결됨 |
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

`src/firebase.ts` 상단 import 기준: `collection`, `doc`, `setDoc`, `addDoc`, `updateDoc`, `deleteDoc`, `writeBatch`, `query`, `where`, `onSnapshot`, `getDoc`, `getDocs`, `arrayUnion`, `arrayRemove`, `limit`, `initializeFirestore`, `persistentLocalCache`, `persistentMultipleTabManager`.

- 실시간 구독은 `onSnapshot` 기반(`subscribe*` 함수들).
- 일회성 조회는 `getDoc`/`getDocs` 기반(fallback 함수들, `exportAllData`).
- `stock_trades` 추가/수정/삭제는 연결된 `expenses` 문서와 함께 `writeBatch`로 원자적으로 처리(`addStockTradeWithExpense`, `updateStockTradeWithExpense`, `deleteStockTradeWithExpense`) — 중간 실패로 트레이드와 연결 지출이 서로 어긋나는 상태를 방지.
- 쿼리는 전부 단일 필드 `where` 조건(`uid ==`, 일부는 `yearMonth ==`, `installmentGroupId ==` 추가) + 경우에 따라 `limit(1)`. 복합 인덱스 필요 여부를 명시하는 별도 `firestore.indexes.json` 파일은 저장소에 없음.
- `exportAllData(spaceId)`: 위 컬렉션들을 `Promise.all`로 병렬 조회해 사용자의 전체 데이터를 하나의 객체로 반환하는 데이터 export 함수.

### Firestore 보안 규칙 (`firestore.rules`)

- `rules_version = '2'`.
- 핵심 헬퍼 함수: `signedIn()` (`request.auth != null`), `isHouseholdMember(code)` (`households/{code}` 문서의 `members` 배열에 uid 포함 여부 확인), `ownsSpace(spaceId)` (`signedIn() && (request.auth.uid == spaceId || isHouseholdMember(spaceId))`).
- `ownsMonthlyDoc(id)`: `fixed_monthly`/`savings_monthly`/`monthly_income`/`asset_accounts_monthly`/`asset_snapshots`(문서 ID가 `{spaceId}_{yearMonth}`)의 `read` 규칙 전용 헬퍼. 앱의 "가장 가까운 과거 달로 폴백" 로직은 존재하지 않는 달의 문서도 정확한 ID로 읽으려 시도하는데, 이때 `resource`가 `null`이라 `resource.data.uid`에 접근하면 규칙이 예외를 던지며 거부됨. `ownsMonthlyDoc`은 `resource == null`이면 문서 ID를 `_`로 split한 앞부분(spaceId)으로 `ownsSpace`를 검사하고, 문서가 있으면 기존처럼 `resource.data.uid`로 검사함 — 월별 carry-forward 폴백이 깨지던 버그 수정(`9d8ccbd` 커밋).
- `user_profiles/{uid}`: 본인만 read/write.
- `households/{code}`: `get`은 로그인 사용자 누구나 가능, `list`는 항상 `false`(전체 목록 열람 차단), `create`는 `createdBy`와 `members`가 생성자 본인으로 제한, `delete`는 항상 `false`. `update`는 로그인 사용자면 누구나가 아니라 `members` 필드만 변경 가능하고, 그마저도 호출자 자신의 uid를 추가(`concat`)하거나 제거(`removeAll`)하는 경우로만 제한(임의의 필드 덮어쓰기 차단).
- `expenses`, `stock_trades`, `asset_accounts`, `fixed_items`, `savings_items`: `read`/`delete`는 `resource.data.uid`/`request.resource.data.uid` 기준 `ownsSpace` 검사. `update` 시 `uid` 필드 값 변경은 금지(`request.resource.data.uid == resource.data.uid`).
- `fixed_monthly`, `savings_monthly`, `monthly_income`, `asset_accounts_monthly`, `asset_snapshots`: `read`는 위의 `ownsMonthlyDoc(id)`, `create`/`update`는 기존과 동일한 `ownsSpace` 패턴. `delete`는 `ownsSpace(resource.data.uid)`로 허용 — 회원 탈퇴 시 본인 공간 문서를 지우기 위한 것(주석 명시).
- `payment_labels/{spaceId}`, `expense_categories/{spaceId}`, `asset_types/{spaceId}`, `stock_categories/{spaceId}`: 문서 ID 자체가 space id이며 `ownsSpace(spaceId)`로 read/write 모두 검사.
- 규칙 배포 명령: `firebase deploy --only firestore:rules --project moneylog-3c3d6` (README.md, CLAUDE.md에 기재).

## Hosting (Firebase Hosting)

- `firebase.json`의 `hosting.public: "dist"` — Vite 빌드 산출물을 배포.
- `hosting.rewrites`: 모든 경로(`**`)를 `/index.html`로 리다이렉트(SPA 클라이언트 라우팅 지원).
- `hosting.ignore`: `firebase.json`, dotfiles, `node_modules` 배포 제외.
- 배포 명령: `firebase deploy --only hosting --project moneylog-3c3d6`.
- `hosting.headers`: 전체 `no-cache`, `/assets/**`는 1년 immutable 캐시.
- 배포 대상 도메인: `moneylog-3c3d6.web.app` (`index.html`의 `og:url`, `og:image`(`/og-image.jpg`)에 하드코딩).
- CI/CD 파이프라인 없음 — 수동 CLI 배포만 존재.

## 외부 API / Webhook

- Firebase(Auth, Firestore, Hosting) 외의 외부 API 연동은 코드베이스에서 발견되지 않음. `fetch`, `axios`, `XMLHttpRequest` 호출이 소스코드(`src/**/*.ts`, `src/**/*.tsx`)에 없음.
- 외부 리소스 참조(코드/정적 파일에서 발견된 하드코딩 URL):
  - `index.html`: Google Fonts stylesheet (`https://fonts.googleapis.com/css2?...`)
  - (이전에 있던 `gstatic.com` Google 로고 `<img>` 로드는 제거됨 — 인라인 SVG로 대체)
  - Firebase Auth가 인증/재설정 메일을 발송(Firebase 관리형, 코드상 별도 메일 서비스 없음)
- Webhook, 결제 연동(PG), 별도 이메일/알림 발송 서비스(인증·재설정 메일은 Firebase Auth 내장), 서버사이드 Cloud Functions는 존재하지 않음.

## 환경변수 / Secrets

- `.env` 계열 파일 없음(`.gitignore`에 `*.local`만 있고 `.env`는 별도 명시 없음, 실제 파일도 없음).
- Firebase config 값이 `src/firebase.ts`에 코드로 직접 작성되어 있어 별도의 secret 관리 체계가 없음(공개 클라이언트 config이므로 Firebase 자체 설계상 노출을 전제로 함; 실제 접근 제어는 `firestore.rules`가 담당).
