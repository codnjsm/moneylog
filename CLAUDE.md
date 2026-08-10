# CLAUDE.md

머니로그(개인/가족 가계부 웹앱) 프로젝트 전용 지침입니다. 일반적인 작업 방식(커밋/배포 확인받기, 검증 후 완료 선언 등)은 전역 `~/.claude/CLAUDE.md`를 따르고, 여기에는 이 프로젝트에만 해당하는 사항만 적습니다.

## 프로젝트 개요

- React 19 + TypeScript + Vite, 백엔드는 Firebase(Auth/Firestore/Hosting)만 사용. 별도 서버 없음.
- 상태관리 라이브러리 없음 — `useState`/`useEffect`만 사용.
- 폴더 구조/아키텍처는 `README.md`에 정리되어 있음. 헷갈리면 먼저 그걸 참고.

## ⚠️ 이 프로젝트에서 특히 조심할 것

- **개발/운영 환경이 분리되어 있지 않음.** `src/firebase.ts`의 Firebase 프로젝트(`moneylog-3c3d6`)는 로컬 개발 서버(`npm run dev`)든 배포된 사이트든 **항상 같은 실제 운영 Firestore**를 씁니다. 테스트 스크립트나 임시 코드로 실제 데이터를 건드리지 않도록 주의. 검증이 필요하면 Firestore 에뮬레이터를 쓸 것 (`firebase emulators:exec`).
- **`uid` 필드는 실제 로그인 uid가 아닐 수 있음.** 지출/자산/주식거래 등 대부분의 문서에 있는 `uid` 필드는 사실 "spaceId"(개인모드면 실제 uid, 공유모드면 household 초대코드)입니다. `user_profiles/{uid}`만 진짜 auth uid로 키가 잡혀 있음. 이 구분을 헷갈리면 공유 가계부 기능이나 보안 규칙이 깨집니다.
- **월별 데이터는 "이전 달 복사 + 현재 달부터 고정" 패턴.** `fixed_monthly`, `savings_monthly`, `asset_accounts_monthly` 등은 특정 달에 자기 문서가 없으면 가장 가까운 과거 달의 데이터를 그대로 이어받고(fallback), 특정 달에서 삭제/수정하면 그 시점부터 이후 달들에 계속 적용됩니다(과거엔 영향 없음). 이건 버그가 아니라 사용자와 합의된 의도된 동작이니 임의로 "고치지" 말 것.
- **Firestore 보안 규칙(`firestore.rules`)이 실제 접근 제어를 담당합니다.** `firebase.ts`에 새 컬렉션/문서 구조를 추가하면 `firestore.rules`도 같이 업데이트해야 함. 규칙을 바꿀 때는 배포 전에 에뮬레이터로 시나리오 테스트를 해볼 것 (본인 데이터 접근, 타인 차단, 공유 멤버/비멤버 등).
- **"커스터마이즈 가능한 목록" 패턴이 통일되어 있음.** 결제수단/지출카테고리/자산종류/주식구분은 전부 `customX ?? DEFAULT_X` + Firestore 문서 하나(`{types: [...]}` 형태) 패턴을 그대로 씀. 비슷한 걸 새로 추가할 때는 이 패턴을 재사용.
- 테스트 코드가 없는 프로젝트입니다. 기능 검증은 `tsc -b` + `npm run lint` + `npm run build`로 하고, UI 변경은 가능하면 직접 켜서 확인.

## 명령어

```bash
npm run dev              # 개발 서버
npm run build            # tsc -b && vite build
npm run lint             # ESLint
firebase deploy --only hosting --project moneylog-3c3d6         # 사이트 배포
firebase deploy --only firestore:rules --project moneylog-3c3d6 # 보안 규칙 배포
```

## 알려진 상태

- `npm run lint`에 남아있는 `react-hooks/set-state-in-effect` 에러 2개(`CalendarTab.tsx`, `hooks/useData.ts`)는 알고 있는 채로 남겨둔 것. 실제 동작에는 문제 없고, 고치려면 핵심 구독 로직 구조를 바꿔야 해서 리스크 대비 이득이 낮다고 판단해 보류함. 임의로 고치지 말고, 고치고 싶으면 먼저 확인.
