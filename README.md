# moneylog (머니로그)

개인/가족 단위 가계부 웹앱. 지출, 고정지출·저축, 자산, 주식거래를 월 단위로 기록하고 관리합니다.

## 기술 스택

- **프레임워크**: React 19 + TypeScript, Vite (개발서버/빌드)
- **백엔드**: Firebase
  - Auth — Google 로그인
  - Firestore — 데이터 저장
  - Hosting — 배포
- **상태관리**: 별도 라이브러리 없이 React 훅(`useState`/`useEffect`)만 사용
- **스타일**: `src/index.css` 하나로 관리 (CSS 프레임워크 미사용)
- **린트**: ESLint (`typescript-eslint`, `eslint-plugin-react-hooks`)

## 폴더 구조

```
src/
  main.tsx              앱 엔트리포인트
  App.tsx                최상위 컴포넌트 — 탭 라우팅, 모든 모달 상태(ModalState) 관리
  types.ts               모든 도메인 타입 + 기본값 상수 (DEFAULT_*)
  firebase.ts             Firebase 초기화 + Firestore CRUD 함수 전부 (유일한 데이터 접근 계층)
  hooks/
    useAuth.ts             로그인 상태
    useHousehold.ts        개인/공유 가계부 모드, spaceId 결정
    useData.ts             월별 데이터 전체를 구독하고 CRUD 함수를 리턴하는 핵심 훅
  components/
    tabs/                  화면 단위 컴포넌트 (달력/대시보드/지출/고정지출/자산/주식)
    modals/                추가·수정용 모달들 (지출, 자산계좌, 주식거래, 카테고리 관리 등)
    Header.tsx, Sidebar.tsx, TabBar.tsx, Modal.tsx, CustomSelect.tsx, DonutChart.tsx  공용 UI

public/, index.html, vite.config.ts, tsconfig*.json, eslint.config.js
firebase.json, .firebaserc  Firebase Hosting 배포 설정
```

## 아키텍처 특징

- **레이어링**: `firebase.ts`(Firestore 접근) → `useData.ts`(구독 + 비즈니스 로직) → 탭/모달 컴포넌트(표시 + 콜백). 별도 API 서버 없이 클라이언트가 Firestore에 직접 접근합니다.
- **월 단위 데이터 모델**: `App.tsx`의 `yearMonth`(예: `2026-08`) 상태를 기준으로 `useData(uid, yearMonth)`가 그 달의 지출/고정지출/저축/자산/주식거래를 구독합니다. 문서 ID를 `{uid}_{yearMonth}` 형식으로 만들어 월별로 분리 저장합니다(`fixed_monthly`, `savings_monthly`, `asset_accounts_monthly`, `asset_snapshots` 등). 고정지출/저축/자산계좌는 특정 달에 자기만의 문서가 없으면 가장 가까운 과거 달의 데이터를 그대로 이어받는 fallback 로직이 있습니다.
- **커스터마이즈 가능한 목록**: 결제수단·지출카테고리·자산종류·주식구분처럼 사용자가 편집 가능한 목록은 `customX ?? DEFAULT_X` 패턴으로 통일되어 있습니다 — Firestore에 커스텀 값이 없으면 `types.ts`의 기본값을 사용합니다.
- **개인/공유 모드**: `useHousehold`가 `spaceId`(개인이면 `uid`, 공유면 household 코드)를 계산해서 `useData`에 넘깁니다. 같은 코드를 쓰는 가족 구성원끼리 데이터를 공유합니다.
- **인증**: Firebase Auth Google 로그인만 지원합니다.
- **Firebase 설정**: `src/firebase.ts`에 `firebaseConfig` 값이 코드로 직접 작성되어 있습니다(환경변수 미사용).

## 개발

```bash
npm install
npm run dev       # 개발 서버 (Vite)
npm run build     # tsc -b && vite build → dist/
npm run lint      # ESLint
npm run preview   # 빌드 결과 로컬 프리뷰
```

## 배포

```bash
npm run build
firebase deploy --only hosting --project moneylog-3c3d6
```

Firebase Hosting(`moneylog-3c3d6`)에 `dist/`를 배포합니다. CI/CD 파이프라인은 없고 수동 배포입니다.
