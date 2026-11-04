---
last_mapped_commit: 9f44a98b1a28c5ded66cf41de8ee1280b6467f64
mapped: 2026-11-04
---

# CONCERNS

기술 부채, 알려진 버그, 보안·접근성·성능 우려를 실제 코드를 근거로 정리합니다. 다른 `.forge/codebase/` 문서에 이미 사실로 기록된 항목은 "왜 문제인지" 관점으로만 요약합니다.

`ebc2843` 이후 10커밋(반복 수입, 월 이동 규칙, 공유 가계부 에러 처리·household 삭제, 미사용 파일 정리) 기준으로 갱신했습니다. 해결되어 삭제한 항목: 월 이동 트랩, household 고아 문서, 가계부 생성/참여/나가기의 조용한 실패, 미사용 모달·에셋, README 노후.

## 1. 개발/운영 Firebase 환경이 분리되어 있지 않음

`src/firebase.ts:18`의 `projectId: 'moneylog-3c3d6'`(`firebaseConfig`)가 하드코딩되어 있고 `.env`나 스테이징 프로젝트가 없습니다. `npm run dev`와 배포 사이트가 **같은 운영 Firestore**를 씁니다. 로컬 개발·임시 스크립트가 곧 운영 데이터 쓰기이므로 검증은 Firestore 에뮬레이터(`firebase emulators:exec`)로만 해야 합니다. 아래 2번 사고가 실제 데이터까지 곧바로 번진 것도 이 때문입니다.

## 2. `monthly_income`은 지뢰 — 죽은 컬렉션을 되살리지 말 것

`monthly_income`은 예전 입력 화면이 만든 옛 문서가 남아 있는 죽은 컬렉션입니다. 2026-11-03에 반복 수입 기능의 저장소로 재사용하면서 월 이월(fallback) 규칙을 붙였더니, 옛 문서가 이후 모든 달로 번져 사용자의 실제 가계부가 오염되었습니다(1번 때문에 개발 중에도 운영 데이터가 그대로 영향을 받음). 변경을 전부 되돌리고 새 컬렉션 `recurring_income`으로 다시 구현했습니다.

- 현재 `monthly_income`은 `src/firebase.ts`의 `exportAllData`(368행)와 회원 탈퇴 삭제 목록(400행)에만 남아 있습니다. **읽기 경로를 다시 붙이지 말 것.** `src/firebase.ts:191-193` 주석에도 같은 경고가 있습니다.
- 규칙 쪽은 `recurring_income`이 `firestore.rules:110`에 별도로 정의되어 있습니다.
- 교훈: 겉보기에 죽은 컬렉션을 재사용하기 전에는 스키마가 맞는지가 아니라 **실제로 어떤 문서가 들어 있는지**를 먼저 확인할 것.

## 3. 반복 수입은 fallback 기반이라 미래 달에 문서를 만들지 않음

`recurring_income`은 해당 달에 문서가 없으면 과거 달에서 이월받는 방식(`src/hooks/useData.ts:97` `recurringIncome`, `subscribeRecurringIncome`)이라 미래 달에는 문서가 존재하지 않습니다. "다음 달에 데이터가 있나?"를 묻는 코드는 반복 수입을 볼 수 없습니다. `nextMonthHasData`(`src/hooks/useData.ts:62`, `subscribeExpensesExist`)는 `expenses`만 조회합니다. 그래서 `src/App.tsx:197`의 다음 달 버튼은 데이터 확인 대신 고정 6개월 앞보기(`monthOffset >= 6 && !data.nextMonthHasData`일 때만 비활성)를 씁니다. 같은 이유로 새로 "다음 달 데이터 유무"에 의존하는 로직을 만들면 반복 수입·고정지출 등 fallback 컬렉션을 놓칩니다.

## 4. `uid` 필드는 인증 uid가 아니라 spaceId

지출/자산/주식거래 등 대부분의 문서에서 `uid` 필드는 개인 모드면 실제 uid, 공유 모드면 household 초대 코드입니다. 진짜 auth uid로 키가 잡힌 것은 `user_profiles/{uid}`뿐입니다. 둘을 혼동하면 공유 가계부와 `firestore.rules`(`ownsSpace`, `ownsMonthlyDoc`)가 깨집니다. 회원 탈퇴(`src/firebase.ts`의 `deleteAccount`, 420행)도 이 구분에 의존해 `where('uid','==',uid)`로 개인 모드 데이터만 지우고, 공유 모드 데이터는 household 멤버에서 빠지기만 하고 남깁니다.

## 5. 알려진 lint 에러 2건 (`react-hooks/set-state-in-effect`) — 의도적 보류

- `src/components/tabs/CalendarTab.tsx:27` — `setSelectedDate(...)` in `useEffect([yearMonth])`.
- `src/hooks/useData.ts:54` — `setFixedMonthly(null)` 등 월 변경 시 상태 초기화.

`react-hooks/exhaustive-deps` warning도 동반됩니다. 고치려면 구독 구조를 바꿔야 해서 보류한 것이며 결함으로 쫓지 않습니다(`CLAUDE.md` 명시).

## 6. 번들 크기 — 단일 청크 약 857 KB

`dist/assets/index-*.js`가 877,889 bytes(약 857 KB)이고 Vite가 chunk size 경고를 냅니다. 라우트/탭 단위 코드 분할(`React.lazy`, `manualChunks`)이 없어 모든 탭·모달·Firebase SDK·export 코드가 첫 로드에 포함됩니다.

## 7. Firestore 읽기량 미측정

사용자당 읽기 수를 측정한 적이 없어 Spark 무료 한도 여유는 미확인입니다(`MONEYLOG_PHASE1.md` 참고). 오프라인 영속 캐시(`persistentLocalCache`)와 월별 fallback 조회가 읽기 수에 미치는 영향도 수치가 없습니다. 화면당 구독이 월 변경마다 8개(`src/hooks/useData.ts:57-65`)에 fallback `getDoc`이 더해집니다.

## 8. 색 대비(WCAG AA 4.5:1) 미달 — iOS 시스템 색 유지로 의도적

`src/index.css`에 `--accent-text`(`#0066CC` 라이트 / `#409CFF` 다크, 24·56행)를 도입해 텍스트가 `--accent`(흰 배경 4.02:1)를 쓰지 않도록 했습니다. 다음은 AA 미달인 채로 iOS 시스템 색을 유지한 것입니다:

- 기본 버튼 흰 글자: 4.02:1(라이트) / 3.65:1(다크)
- 개인/공유 모드 뱃지: 약 4.0:1 (11px)
- 수입 금액 `#229058`: 4.04:1, 지출 금액 `#FF3B30`: 3.55:1
- 수입/지출 추가 버튼: 3.64 / 3.10:1
- 회원 탈퇴 목록 제목: 2.99:1

## 9. CSS 결함·불일치 (`src/index.css`)

- **`.cal-expense-amt` 무효화(여전히 존재)**: 648행의 `.cal-expense-amt { color: var(--expense) }`가 같은 특이도의 `.cal-item-amount`(673행, `color: var(--text)`)보다 앞에 있어, `src/components/tabs/CalendarTab.tsx:165`처럼 두 클래스가 함께 붙은 날짜 목록의 지출 금액은 기본 글자색으로 나옵니다. 수입은 674행 `.cal-item-amount.cal-income-amt`로 명시 덮어써서 색이 적용됩니다. 의도인지 불명확합니다(요약 `cal-summary-value`, 날짜 셀 `cal-amount`에서는 지출 색이 적용됨).
- **`--income`(초록) 의미 과적재**: 수입 외에 공유 모드 뱃지(146행), 총자산 제목 바(482행), 가계부 초대 코드(572행), 연결 상태 점(589행)에도 쓰여 색의 의미가 모호합니다.
- **모바일 글꼴 스케일 불완전**: 18px 미만 셀렉터 상당수가 `@media (max-width: 767px)`(388·677행) 축소 규칙이 없어 폰에서도 데스크톱 크기로 나옵니다. `.btn-sm`만 2px 줄고 나머지는 1px씩 줄어 일관성이 없습니다(개수는 이번 갱신에서 재측정하지 않음).

## 10. 웹폰트 가중치 불일치 (`index.html:20`)

- `Source Code Pro`는 700만 로드하는데 `.login-warning-url`(`src/index.css:220`)은 400을 요청 → 합성/대체 렌더링.
- `Noto Sans KR`은 400/500/700만 로드하는데 CSS는 `font-weight: 600`을 13곳에서 사용 → Android/Windows에서 700 또는 500으로 치환. Apple 플랫폼은 `-apple-system`이 우선이라 영향 없음.

## 11. 데스크톱 드롭다운 스크롤바 드래그 불가 (`src/components/CustomSelect.tsx`)

iOS Safari가 `::-webkit-scrollbar`를 무시해 스크롤바를 직접 그리도록 바꿨고, 그려진 바(`.custom-select-track`, `src/index.css:353`)가 `pointer-events: none`이라 데스크톱에서 마우스로 드래그할 수 없습니다. 휠/트랙패드 스크롤은 동작합니다. 컴포넌트에 포인터 이벤트 핸들러가 없습니다.

## 12. 수익 계산·포맷 헬퍼 중복 — `CalendarTab.tsx`만 예외

`src/utils.ts`로 대부분 통합되었으나(`stockProfitOf`, `fmtWon`, `fmtNum`, `signColor`, `fmtStockPercent` 등) `src/components/tabs/CalendarTab.tsx:72-73`은 여전히 `fmtNum`/`fmtWon`을 로컬 재정의합니다.

## 13. `.expense-amount` 클래스를 여러 탭이 공유하며 인라인 색으로 덮어씀

`StockTab.tsx`가 `ExpenseTab.tsx`와 같은 `.expense-amount` 클래스를 쓰면서 인라인 `style.color`로 덮어씁니다. 클래스 기본 스타일을 바꾸면 양쪽에 영향이 갑니다.

## 14. `households/{code}` 잔여 항목

- `createHousehold`(`src/firebase.ts:471-473`)는 코드 중복 확인 없이 `setDoc`으로 덮어쓰고, deprecated `String.prototype.substr()`로 코드를 만듭니다.
- 삭제 규칙(`firestore.rules:58`)은 `members == [request.auth.uid]`, 즉 요청자가 유일한 멤버일 때만 허용하고, `leaveHousehold`(`src/firebase.ts:485`)가 마지막 멤버면 문서를 지웁니다. `deleteAccount`도 같은 함수를 거칩니다.
- `update`는 `members`만 바꾸도록 제한되고, 월별 컬렉션에는 `allow delete: if ownsSpace(resource.data.uid)`가 있습니다(`firestore.rules:95` 등, 회원 탈퇴용).

## 15. 에러 처리 — `deleteAccount`는 비원자적

`src/App.tsx:65`의 `withErrorAlert`가 모달 콜백과 가계부 모드 변경/생성/나가기(302-305행)를 감싸 실패 시 `alert`로 알립니다(쓰기를 기다리지 않고 모달을 먼저 닫는 오프라인 친화 설계). `join`은 `src/components/HouseholdSection.tsx:37-43`이 자체 `try/catch`로 처리합니다. 남은 문제:

- `deleteAccount`(`src/firebase.ts:420`)는 여러 단계의 비원자적 삭제(재인증 → 컬렉션별 batch 삭제 → household 탈퇴 → 프로필 삭제 → Auth 삭제)입니다. 재인증을 먼저 하고 Auth 삭제를 마지막에 두어 중간 실패 시 재시도할 수 있게 했지만, 중간에 끊기면 일부 데이터만 지워진 상태가 됩니다.

## 16. 입력 검증

각 모달의 JS 조건식(`Number(amount) <= 0` 등)에만 의존합니다. `<form>`은 `src/components/LoginOverlay.tsx`(124, 171행) 두 곳에만 있고, 나머지 모달은 HTML5 constraint validation을 쓰지 않습니다. 중복 저장은 `src/hooks/useSaveGuard.ts`(`runSave`로 저장 중 재클릭 차단)로 막습니다.

## 17. 테스트·CI 부재

- 자동화 테스트가 없고 검증은 `tsc -b` + `npm run lint` + `npm run build` + 수동 UI 확인입니다.
- CI/CD가 없습니다(`.github/workflows` 없음).
- `firestore.indexes.json`이 없어 새 복합 쿼리의 인덱스 누락을 사전에 잡을 방법이 없습니다.
- `firestore.rules`는 에뮬레이터 시나리오 테스트를 사람이 직접 돌려야 합니다.
