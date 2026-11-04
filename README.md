# moneylog

개인/가족 단위 가계부 웹앱. 수입·지출, 고정지출·적금, 자산, 주식거래를 월 단위로 기록하고 관리합니다.

## 기술 스택

- **프레임워크**: React 19 + TypeScript, Vite (개발서버/빌드)
- **백엔드**: Firebase
  - Auth — Google 로그인 + 이메일/비밀번호 (가입·인증메일·비밀번호 재설정)
  - Firestore — 데이터 저장. 접근 제어는 `firestore.rules`가 담당
  - Hosting — 배포
- **상태관리**: 별도 라이브러리 없이 React 훅(`useState`/`useEffect`)만 사용
- **스타일**: `src/index.css` 하나로 관리 (CSS 프레임워크 미사용)
- **린트**: ESLint (`typescript-eslint`, `eslint-plugin-react-hooks`)
- **PWA**: `public/manifest.json`으로 홈화면 설치 지원. 서비스워커는 없음(오프라인 미지원)

## 폴더 구조

```
src/
  main.tsx               앱 엔트리포인트
  App.tsx                최상위 컴포넌트 — 탭 라우팅, 모든 모달 상태(ModalState) 관리
  tabs.ts                탭 정의. 하단 탭바와 사이드바가 같은 목록을 쓴다
  types.ts               모든 도메인 타입 + 기본값 상수 (DEFAULT_*)
  firebase.ts            Firebase 초기화 + Firestore CRUD 함수 전부 (유일한 데이터 접근 계층)
  export.ts              데이터 내보내기(.txt) 포맷팅 — ExportModal이 사용
  utils.ts               금액 포맷 등 공용 헬퍼
  lib/
    image.ts             프로필 사진 리사이즈·크롭 결과를 data URI 로 만드는 처리
  hooks/
    useAuth.ts           로그인 상태
    useHousehold.ts      개인/공유 가계부 모드, spaceId 결정
    useData.ts           월별 데이터 전체를 구독하고 CRUD 함수를 리턴하는 핵심 훅
    useSaveGuard.ts      저장 버튼 중복 클릭 차단
  components/
    tabs/                화면 단위 컴포넌트 (홈/캘린더/지출/예산/자산/주식/더보기)
    modals/              추가·수정용 모달들 (지출, 수입, 자산계좌, 주식거래, 목록 관리 등)
    Header.tsx, Sidebar.tsx, TabBar.tsx, TabIcon.tsx     내비게이션
    Modal.tsx, CustomSelect.tsx, DonutChart.tsx, Toast.tsx   공용 UI
    HomeFab.tsx          홈의 빠른 추가 플로팅 버튼
    LoginOverlay.tsx     로그인·회원가입 화면
    HouseholdSection.tsx 개인/공유 모드 전환 UI — 더보기 탭이 사용
    ExportModal.tsx      데이터 내보내기 모달

firestore.rules            Firestore 보안 규칙 — 실제 접근 제어
public/, index.html, vite.config.ts, tsconfig*.json, eslint.config.js
firebase.json, .firebaserc  Firebase Hosting·Firestore 배포 설정
```

## 아키텍처 특징

- **레이어링**: `firebase.ts`(Firestore 접근) → `useData.ts`(구독 + 비즈니스 로직) → 탭/모달 컴포넌트(표시 + 콜백). 별도 API 서버 없이 클라이언트가 Firestore에 직접 접근합니다.

- **월 단위 데이터 모델**: `App.tsx`의 `yearMonth`(예: `2026-11`) 상태를 기준으로 `useData(spaceId, yearMonth)`가 그 달의 데이터를 구독합니다. 월별 문서는 ID를 `{spaceId}_{yearMonth}` 형식으로 만들어 분리 저장합니다.

- **「이전 달 복사 + 현재 달부터 고정」**: `fixed_monthly`, `savings_monthly`, `recurring_income`, `asset_accounts_monthly`는 특정 달에 자기 문서가 없으면 **가장 가까운 과거 달**의 데이터를 그대로 이어받습니다(fallback, 최대 12개월 역추적). 어떤 달에서 수정하면 그 달부터 이후에 적용되고 과거는 바뀌지 않습니다. 의도된 동작입니다.

- **수입이 두 갈래**: 일시 수입은 `expenses`에 `type: 'income'`으로, 매달 반복되는 수입은 `recurring_income`에 위 fallback 규칙으로 저장됩니다. `monthly_income`은 더 이상 쓰지 않는 옛 컬렉션으로, 내보내기·탈퇴 처리에만 남아 있습니다.

- **커스터마이즈 가능한 목록**: 결제수단·지출카테고리·자산종류·주식구분은 `customX ?? DEFAULT_X` 패턴으로 통일되어 있습니다 — Firestore에 커스텀 값이 없으면 `types.ts`의 기본값을 사용합니다.

- **개인/공유 모드**: `useHousehold`가 `spaceId`(개인이면 `uid`, 공유면 household 초대코드)를 계산해서 `useData`에 넘깁니다. 같은 코드를 쓰는 가족 구성원끼리 데이터를 공유합니다. 대부분의 문서에 있는 `uid` 필드는 **실제 auth uid가 아니라 이 spaceId**입니다. `user_profiles/{uid}`만 진짜 auth uid로 키가 잡혀 있습니다.

- **Firebase 설정**: `src/firebase.ts`에 `firebaseConfig` 값이 코드로 직접 작성되어 있습니다(환경변수 미사용). 웹 apiKey는 설계상 공개 값이며, 실제 보호는 `firestore.rules`가 합니다.

### Firestore 컬렉션

| 컬렉션 | 문서 ID | 내용 |
|---|---|---|
| `expenses` | 자동 | 지출·일시 수입 (`type`으로 구분) |
| `stock_trades` | 자동 | 주식 거래 |
| `fixed_monthly` | `{spaceId}_{YYYY-MM}` | 고정 지출 |
| `savings_monthly` | `{spaceId}_{YYYY-MM}` | 적금 |
| `recurring_income` | `{spaceId}_{YYYY-MM}` | 반복 수입 |
| `asset_accounts_monthly` | `{spaceId}_{YYYY-MM}` | 자산 계좌 목록 |
| `asset_snapshots` | `{spaceId}_{YYYY-MM}` | 그 달의 자산 잔액 |
| `payment_labels` · `expense_categories` · `asset_types` · `stock_categories` | `{spaceId}` | 커스터마이즈 목록 |
| `user_profiles` | `{auth uid}` | 이름·사진·가계부 모드·household 코드 |
| `households` | 초대코드 | 공유 가계부 멤버 목록 |
| `monthly_income` · `fixed_items` | — | 쓰지 않는 옛 컬렉션 |

## 개발

```bash
npm install
npm run dev       # 개발 서버 (Vite)
npm run build     # tsc -b && vite build → dist/
npm run lint      # ESLint
npm run preview   # 빌드 결과 로컬 프리뷰
```

테스트 코드는 없습니다. 검증은 `tsc -b` + `npm run lint` + `npm run build`로 하고, 보안 규칙은 Firestore 에뮬레이터로 확인합니다.

> ⚠️ **개발/운영 환경이 분리되어 있지 않습니다.** `npm run dev`도 배포된 사이트와 **같은 실제 운영 Firestore**를 씁니다.

## 배포

```bash
npm run build
firebase deploy --only hosting --project moneylog-3c3d6         # 사이트
firebase deploy --only firestore:rules --project moneylog-3c3d6 # 보안 규칙
```

Firebase Hosting(`moneylog-3c3d6`)에 `dist/`를 배포합니다. CI/CD 파이프라인은 없고 수동 배포입니다.

`firestore.rules`를 바꿨다면 **보안 규칙을 먼저** 배포해야 합니다. 새 컬렉션을 쓰는 코드가 먼저 올라가면 권한 오류로 해당 기능이 동작하지 않습니다.
