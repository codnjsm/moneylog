---
last_mapped_commit: a28aa9e61a6b8610bdfe37adc648b11f2eb413de
mapped: 2026-09-15
---

# CONCERNS

기술 부채, 알려진 버그, 보안 우려, 성능/데이터 무결성 문제를 실제 코드를 근거로 정리합니다. `ARCHITECTURE.md`/`INTEGRATIONS.md`/`TESTING.md`에 이미 사실로 기록된 항목은 여기서는 "왜 문제인지" 관점으로만 요약하고 해당 문서를 참조합니다.

이번 갱신에서 이전 목록의 상당수 항목(입력값 검증, 저장/삭제 에러 처리, 주식 거래 원자성, `households` 규칙)이 이미 해결되어 있는 것을 확인했습니다(주로 `5320f56`, `9d8ccbd` 커밋에서). 홈 대시보드/더보기 탭 리디자인(`a28aa9e`) 자체가 새로 만든 문제는 크지 않았고, 대신 몇 가지 잔여 항목과 테마 상태 동기화 관련 소소한 항목 하나를 새로 확인했습니다.

## 1. 개발/운영 Firebase 환경이 분리되어 있지 않음

`src/firebase.ts:9-17`의 `firebaseConfig`(프로젝트 `moneylog-3c3d6`)가 여전히 코드에 하드코딩되어 있고, `.env` 계열 파일이나 별도 스테이징 프로젝트가 없습니다. `npm run dev`로 띄우는 로컬 개발 서버도 배포된 프로덕션과 **완전히 동일한 실제 운영 Firestore**에 연결됩니다. 이번 diff에서도 변화 없음(여전히 유효).

- 상세 근거: `INTEGRATIONS.md` "Firebase 프로젝트 설정" 절.

## 2. 알려진 lint 에러 2건 (`react-hooks/set-state-in-effect`) — 여전히 존재

`npm run lint` 재실행 결과, 다음 2개의 error가 현재도 남아 있습니다:

- `src/components/tabs/CalendarTab.tsx:22` — `useEffect(() => { setSelectedDate(...) }, [yearMonth])`.
- `src/hooks/useData.ts:52` — `useEffect(() => { setFixedMonthly(null); setSavingsMonthly(null); setAssetAccountsMonthly(null); ... }, [uid, yearMonth])` (이번 diff로 `stockProfitOf` import가 추가되며 줄 번호가 51→52로 한 줄 밀렸을 뿐 내용은 동일).

각각 `react-hooks/exhaustive-deps` warning도 함께 발생(`today`, `nextYearMonth` 누락). `CLAUDE.md`에 의도적으로 방치한 것으로 명시되어 있어 임의로 고치지 않았습니다.

## 3. 수익 계산·포맷 헬퍼 중복 — 대부분 해결, `CalendarTab.tsx`만 예외로 남음

이전에 지적된 `profitOf`/`fmt` 중복은 새로 추가된 `src/utils.ts`로 대부분 통합되었습니다:

- `stockProfitOf`/`stockProfitPercentOf`(`src/utils.ts:12-15`)를 `src/components/tabs/StockTab.tsx:4`, `src/components/modals/StockTradeModal.tsx:5`, `src/hooks/useData.ts:4`(`addStockTrade`/`updateStockTrade` 내부, `useData.ts:120,129`) 세 곳 모두 공용으로 import해서 사용 — 세 곳에 따로 구현되어 있던 중복이 해소됨.
- `fmtWon`/`fmtNum`(`src/utils.ts:3-4`)과 `signColor`/`percentColor`(`src/utils.ts:29-30`)도 `ExpenseTab.tsx:4`, `FixedTab.tsx:2`, `AssetsTab.tsx:4`, `StockTab.tsx:4`, `HomeTab.tsx:3`가 공용으로 import.
- `fmtStockPercent`(`src/utils.ts:19-24`)는 `MAX_PERCENT_MAGNITUDE = 9999` 상한을 적용해 문자열을 `+9999%+` 형태로 잘라내므로, 8번 항목에서 지적했던 "수익률 문자열 길이 무제한" 문제도 함께 해결됨.

다만 **`src/components/tabs/CalendarTab.tsx:51-52`는 이번 diff의 변경 대상이 아니어서** 여전히 자체 `fmtNum`/`fmtWon`을 로컬로 재정의하고 있습니다(`src/utils.ts`를 import하지 않음). 공용 유틸 모듈이 생긴 지금은 이 파일만 예외로 남아 있는 상태라, 다음에 손댈 때 정리 후보입니다.

## 4. `.expense-amount` CSS 클래스가 여러 탭에서 공유되며 인라인 스타일로 덮어씀

`src/components/tabs/StockTab.tsx:68` — `<div className="expense-amount" style={{ color: signColor(profit) }}>`처럼, `ExpenseTab.tsx:110,140`이 쓰는 것과 같은 `.expense-amount` 클래스(`src/index.css:332`)를 주식 탭에서도 그대로 쓰면서 인라인 `style.color`로 덮어쓰고 있습니다. 이 클래스의 기본 스타일(`index.css:332`)을 바꾸면 지출/수입 탭과 주식 탭 양쪽에 영향이 가는 결합 구조가 그대로 남아 있습니다.

## 5. 테마 라이트/다크 토글의 React 상태와 `data-theme` 속성이 시스템 설정 변경 시 어긋날 수 있음 (신규)

`index.html:21-34`의 부트스트랩 스크립트는 `localStorage`에 저장된 테마가 없을 때 `prefers-color-scheme` 미디어쿼리에 `change` 리스너를 달아, 시스템 테마가 바뀌면 `document.documentElement`의 `data-theme` 속성을 **직접 DOM으로** 갱신합니다(`localStorage`에는 쓰지 않음, 21-33행).

반면 `src/App.tsx:64-66`의 React `theme` 상태는 마운트 시점에 `document.documentElement.getAttribute('data-theme')`를 **한 번만** 읽어 초기화하고, 이후 이 속성이 외부(index.html의 리스너)에서 바뀌는 것을 구독하지 않습니다. `MoreTab.tsx:54-55`의 라이트/다크 토글 버튼은 이 React `theme` 상태를 기준으로 `active` 클래스를 매깁니다.

결과적으로: 사용자가 앱에서 한 번도 테마를 직접 선택하지 않은 상태(즉 `localStorage`에 `moneylog-theme`가 없는 상태)로 앱을 열어둔 채 OS의 라이트/다크 모드가 자동으로(또는 사용자가 OS 설정에서) 바뀌면, 실제 화면 색상은 `data-theme` 속성을 통해 즉시 바뀌지만 `더보기` 탭의 토글 버튼은 이전 상태를 계속 가리키는 채로 남습니다. 두 값이 실제로 다시 맞아떨어지려면 사용자가 토글 버튼을 직접 눌러 `setTheme`(`App.tsx:70-74`)을 한 번 호출해야 합니다. 시각적 크래시는 아니지만 UI 표시가 실제 상태와 어긋나는 경우입니다.

## 6. `households/{code}` 관련 항목들 — 대부분 해결

- **`update` 필드 제한**: `firestore.rules:50-56`이 이제 `request.resource.data.diff(resource.data).affectedKeys().hasOnly(['members'])`와 `arrayUnion`/`arrayRemove` 패턴 일치 검사를 요구하도록 강화되어, 이전에 지적했던 "로그인만 하면 임의 필드를 덮어쓸 수 있는" 문제는 해결되었습니다.
- **월별 문서 fallback이 규칙에 막히는 문제**: `firestore.rules:30-32`의 `ownsMonthlyDoc(id)` 함수가 문서가 존재하지 않을 때(`resource == null`) id의 `spaceId` 접두어로 소유권을 판단하도록 추가되어(9d8ccbd), "이전 달 복사" fallback 조회가 규칙에 막히지 않습니다.
- **여전히 남아 있는 것**: `allow delete: if false`(`firestore.rules:57`)가 항상 적용되므로 마지막 멤버가 나가도(`leaveHousehold`) `households/{code}` 문서 자체는 영구히 고아로 남습니다. `createHousehold`(`src/firebase.ts:272-276`)도 여전히 코드 중복 여부를 확인하지 않고 `setDoc`으로 곧바로 덮어쓰며, 코드 생성에 deprecated API인 `String.prototype.substr()`(`firebase.ts:273`)을 사용합니다.

## 7. 저장/삭제 에러 처리 — 모달 콜백은 해결, 가계부 참여/생성/나가기는 여전히 미처리

`src/App.tsx:47-55`에 추가된 `withErrorAlert` 헬퍼가 모든 모달의 `onSave`/`onDelete`/`onDeleteGroup` 콜백(`App.tsx:231`부터 끝까지 전부)을 감싸면서, 이전에 지적했던 "대부분의 저장/삭제 동작에 에러 처리가 없음" 문제는 해결되었습니다. `ExportModal.tsx:15-34`도 `try/catch/finally`로 제대로 감싸져 있어(예전 `AccountModal.handleExport`의 `catch` 누락 문제도 해결됨), 내보내기 실패 시 `alert`로 사용자에게 알립니다.

다만 **가계부(household) 생성/참여/나가기 흐름은 여전히 에러 처리가 없습니다**:

- `src/App.tsx:212-214` — `onCreate={household.create}`, `onJoin={household.join}`, `onLeave={household.leave}`가 `withErrorAlert` 없이 그대로 전달됩니다.
- `src/components/HouseholdSection.tsx:32-38,40-43,93` — `handleJoin`/`handleLeave`와 "새로 만들기" 버튼의 `onClick`이 각각 `onJoin`/`onLeave`/`onCreate`를 호출하지만 `try/catch`가 없습니다.
- `src/hooks/useHousehold.ts:16-35`의 `create`/`join`/`leave`/`switchMode`도 내부에서 에러를 잡지 않고 그대로 던집니다.

`createHousehold`/`joinHousehold`/`leaveHousehold`/`setUserProfile`(Firestore 쓰기)이 실패하면(오프라인, 권한 규칙 거부 등) unhandled promise rejection이 되고 사용자에게는 아무 알림도 가지 않습니다. 이 부분은 이번 리디자인 diff가 새로 만든 문제는 아니며(구 `AccountModal.tsx`도 동일하게 에러 처리가 없었음을 `git show`로 확인함), 리디자인 과정에서 다른 모든 저장/삭제 경로가 `withErrorAlert`로 정비된 것과 대비되어 이제 유일하게 남은 미처리 경로가 되었습니다.

## 8. 주식 거래 ↔ 연동 소득 항목 쓰기 — 해결됨 (writeBatch 적용)

이전에 지적했던 "두 개의 독립된 Firestore 쓰기를 순차 실행해 부분 실패 시 데이터가 어긋날 수 있다"는 문제는 해결되었습니다. `src/firebase.ts:109-143`의 `addStockTradeWithExpense`/`updateStockTradeWithExpense`/`deleteStockTradeWithExpense`가 모두 `writeBatch(db)`로 `expenses`와 `stock_trades` 문서를 원자적으로 함께 쓰고, `src/hooks/useData.ts:119-140`의 `addStockTrade`/`updateStockTrade`/`deleteStockTrade`가 이 batch 함수들을 사용합니다.

## 9. 입력값 검증 — 해결됨

이전에 지적했던 "단일 항목 모달"들의 부호(음수) 검사 누락 문제는 해결되었습니다. `ExpenseModal.tsx:45`(`Number(amount) <= 0`), `FixedItemModal.tsx:17`, `SavingsItemModal.tsx:19`, `IncomeEntryModal.tsx:23`가 모두 `Number(amount) <= 0` 검사를 쓰고, `AssetAccountModal.tsx:25`는 `Number(amount) < 0`(0은 허용, 음수는 차단)을 씁니다. `StockTradeModal.tsx:30`도 이제 `buyPrice`/`sellPrice`/`quantity` 모두 `Number(...) > 0`을 요구해, 이전에 지적했던 "매도가만 `!!sellPrice`로 느슨하게 검사되던" 문제도 해결되었습니다.

다만 HTML5 constraint validation에 의존하지 않는다는 근본 구조(저장소 전체에 `<form>` 태그 없음, `grep -rn "<form" src` 결과 0건)는 그대로이며, 검증은 여전히 각 모달의 JS 레벨 `valid`/`handleSave` 조건식에만 의존합니다.

## 10. 테스트 부재 / CI 부재 (요약, 상세는 다른 문서 참조)

- 자동화 테스트가 전혀 없고(`TESTING.md`에 상세 근거 있음), 검증은 `tsc -b` + `npm run lint` + `npm run build` + 수동 UI 확인뿐입니다.
- CI/CD 파이프라인이 없어(`.github/workflows` 없음) 위 검증도 로컬에서 사람이 직접 돌려야만 실행됩니다.
- `firestore.indexes.json`이 저장소에 없어, 쿼리에 새로운 복합 `where` 조건을 추가할 경우 인덱스 누락으로 인한 런타임 오류를 사전에 잡을 방법이 코드/설정 어디에도 없습니다(`INTEGRATIONS.md` 참고).
