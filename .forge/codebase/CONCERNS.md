---
last_mapped_commit: d7cb05506bb3373788498af458bd8c8e4ef63412
mapped: 2026-08-12
---

# CONCERNS

기술 부채, 알려진 버그, 보안 우려, 성능/데이터 무결성 문제를 실제 코드를 근거로 정리합니다. `ARCHITECTURE.md`/`INTEGRATIONS.md`/`TESTING.md`에 이미 사실로 기록된 항목은 여기서는 "왜 문제인지" 관점으로만 요약하고 해당 문서를 참조합니다.

## 1. 개발/운영 Firebase 환경이 분리되어 있지 않음

`src/firebase.ts`의 `firebaseConfig`(프로젝트 `moneylog-3c3d6`)가 코드에 하드코딩되어 있고, `.env` 계열 파일이 전혀 없습니다(`find`로 확인). `npm run dev`로 띄우는 로컬 개발 서버도 배포된 프로덕션과 **완전히 동일한 실제 운영 Firestore**에 연결됩니다.

- 로컬에서 실험적으로 작성한 코드나 임시 스크립트가 실제 사용자 데이터를 건드릴 수 있습니다.
- 별도 스테이징/테스트 프로젝트, `firestore.indexes.json`, 환경변수 기반 설정 전환 로직이 저장소에 없습니다.
- `CLAUDE.md`에 이미 "테스트 스크립트나 임시 코드로 실제 데이터를 건드리지 않도록 주의. 검증이 필요하면 Firestore 에뮬레이터를 쓸 것"이라는 경고가 명시되어 있고, 이는 실제 코드 상태(하나의 Firebase 프로젝트만 존재)와 일치합니다.
- 상세 근거: `INTEGRATIONS.md` "Firebase 프로젝트 설정" 절.

## 2. 알려진 lint 에러 2건 (`react-hooks/set-state-in-effect`)

`npm run lint` 실행 결과, 다음 2개의 error가 현재도 남아 있습니다 (재현 확인함):

- `src/components/tabs/CalendarTab.tsx:22` — `useEffect(() => { setSelectedDate(...) }, [yearMonth])` 내부에서 effect 본문에서 곧바로 `setState`를 호출.
- `src/hooks/useData.ts:51` — `useEffect(() => { setFixedMonthly(null); setSavingsMonthly(null); setAssetAccountsMonthly(null); ... }, [uid, yearMonth])`에서 동일한 패턴.

두 곳 모두 `react-hooks/exhaustive-deps` warning도 함께 발생합니다(`CalendarTab.tsx:23`은 `today` 누락, `useData.ts:63`은 `nextYearMonth` 누락). `CLAUDE.md`에 "실제 동작에는 문제 없고, 고치려면 핵심 구독 로직 구조를 바꿔야 해서 리스크 대비 이득이 낮다고 판단해 보류함"이라고 명시되어 있어 의도적으로 방치된 상태입니다. 임의로 고치면 안 되고, 고치려면 사전 확인이 필요합니다.

## 3. 입력값 검증이 `<input min={0}>` HTML 속성에만 의존 — 실제로는 검증 아님

저장소 전체에 `<form>` 태그가 **하나도 없습니다**(`grep -rn "<form" src` 결과 0건). 모든 모달의 저장/취소 버튼은 `<button onClick={...}>`이며, 이는 브라우저의 HTML5 constraint validation(`min`/`max`/`required`)이 전혀 트리거되지 않는다는 뜻입니다. 즉 숫자 입력창의 `min={0}` 속성은 스피너 동작에만 영향을 주고, 사용자가 직접 `-100` 같은 값을 타이핑하면 그대로 통과합니다. 실제 저장 가능 여부는 각 모달의 JS 레벨 `valid`/`disabled` 계산식에만 달려 있습니다.

이 패턴은 `.forge/retro/260812-200000-stock-profit-percent.md`에서 `StockTradeModal.tsx`를 대상으로 이미 한 번 지적되었고("이 프로젝트의 다른 입력 모달들도... 점검해볼 만함"이라는 후속 후보로 명시), 실제로 다른 모달들을 확인한 결과 같은 패턴이 재현됩니다:

- `src/components/modals/ExpenseModal.tsx:45` — `if (!label.trim() || !amount || !method) return` — `amount`가 `"-500"` 같은 음수 **문자열**이면 truthy이므로 그대로 저장됩니다. 부호(`Number(amount) > 0`) 검사가 없습니다.
- `src/components/modals/FixedItemModal.tsx:17` — `if (!label.trim() || !amount) return` — 동일하게 음수/0 검사 없음.
- `src/components/modals/SavingsItemModal.tsx:19` — 동일 패턴.
- `src/components/modals/IncomeEntryModal.tsx:23` — 동일 패턴.
- `src/components/modals/AssetAccountModal.tsx:25` — `amount`가 선택값이라 더 느슨함(값이 있어도 부호 검사 없음).
- 반면 `src/components/modals/FixedListModal.tsx:28,37`과 `SavingsListModal.tsx:34,44`(일괄 수정 모달)는 `Number(r.amount) > 0` 조건을 실제로 사용합니다 — 즉 같은 도메인(고정지출/적금)인데 "단일 항목 모달"과 "목록 일괄수정 모달" 사이에 검증 기준이 다릅니다.
- `src/components/modals/StockTradeModal.tsx:30`은 `buyPrice`/`quantity`에는 `Number(...) > 0`을 적용하지만(적대적 리뷰 후속 수정, `.forge/done/260812-154755-stock-profit-percent-fix/`에서 추가됨), `sellPrice`는 여전히 `!!sellPrice`(truthy) 검사뿐입니다 — 매도가에 음수를 입력해도 저장이 막히지 않습니다.

영향: 음수 지출/소득/적금 금액이 그대로 Firestore에 저장될 수 있고, 이는 대시보드/월별 합계 계산(`reduce((s, e) => s + e.amount, 0)` 형태로 전 탭에 퍼져 있음)을 조용히 틀리게 만들 수 있습니다. 눈에 보이는 크래시 없이 숫자만 미묘하게 어긋나는 종류의 버그라 발견이 어렵습니다.

## 4. 수익 계산 로직(`profitOf`)이 3곳에 중복 구현됨

동일한 공식 `(sellPrice - buyPrice) * quantity`가 서로 다른 세 파일에 독립적으로 작성되어 있습니다:

- `src/components/tabs/StockTab.tsx:14-15` — `profitOf`, `profitPercentOf` 함수.
- `src/components/modals/StockTradeModal.tsx:25-26` — 인라인으로 동일 공식 재계산(모달의 "예상 수익" 미리보기용).
- `src/hooks/useData.ts:119, 132` — `addStockTrade`/`updateStockTrade` 내부에서 연동 소득 항목(`expenses` 문서)의 `amount`를 채우기 위해 다시 계산.

세 곳 모두 수수료나 세금 같은 항목을 반영하면 셋 다 고쳐야 하고, 하나만 고치면 화면에 보이는 수익률과 실제로 저장되는 소득 금액이 어긋날 수 있습니다. 이 중복은 `.forge/done/260812-153220-stock-profit-percent/review.md`의 항목 F("계산·포맷·색상 로직이 StockTab.tsx / StockTradeModal.tsx에 그대로 중복됨")에서 이미 지적됐고, 담당 후속 작업(`stock-profit-percent-fix`)에서 "지금 규모에서 급하지 않다"는 판단으로 명시적으로 스코프 밖으로 미뤄둔 상태입니다(`useData.ts`의 세 번째 중복은 그 리뷰 스코프에 포함되지 않았음).

같은 종류의 소규모 중복이 포맷팅 헬퍼에도 있습니다: `const fmt = (n) => n.toLocaleString('ko-KR') + '원'`(또는 `'원'` 없이)이 `DashboardTab.tsx`, `FixedTab.tsx`, `AssetsTab.tsx`, `StockTab.tsx`, `ExpenseTab.tsx`, `CalendarTab.tsx`(`fmtNum`/`fmtWon`)에 파일마다 각자 정의되어 있고, 공용 유틸 모듈(`src/utils.ts` 같은 파일)은 존재하지 않습니다. `signColor`(부호별 색상) 헬퍼도 `StockTab.tsx`와 `StockTradeModal.tsx`에 동일하게 중복 정의되어 있습니다.

## 5. 주식 거래 ↔ 연동 소득 항목 쓰기가 원자적이지 않음 (트랜잭션/batch 미사용)

`src/hooks/useData.ts`의 `addStockTrade`(118-130행), `updateStockTrade`(131-143행), `deleteStockTrade`(144-147행)는 모두 `expenses` 컬렉션과 `stock_trades` 컬렉션에 대해 **두 개의 독립된 Firestore 쓰기를 순차적으로 실행**합니다(`addExpense` 다음에 `firebaseAddStockTrade`, `updateExpense` 다음에 `firebaseUpdateStockTrade`, `deleteExpense` 다음에 `firebaseDeleteStockTrade`). `runTransaction`이나 `writeBatch`를 사용하지 않습니다.

- `addStockTrade`: 첫 번째 쓰기(수익을 나타내는 소득 `expenses` 문서 생성)가 성공한 뒤 두 번째 쓰기(`stock_trades` 문서 생성)가 실패하면, 어떤 주식 거래와도 연결되지 않은 "주식 수익 - X"라는 소득 항목이 고아 상태로 남습니다. UI에서 이 항목을 지우는 유일한 경로(`deleteStockTrade`)는 `stock_trades` 문서가 존재해야 열리므로, 사용자가 직접 지울 방법이 없습니다.
- `deleteStockTrade`: 반대로 `deleteExpense`가 성공하고 `firebaseDeleteStockTrade`가 실패하면, 연동 소득은 사라졌는데 거래 기록만 남는 불일치가 생깁니다.
- `updateStockTrade`도 동일한 구조(연동 소득 업데이트 후 거래 업데이트)로 부분 실패 시 두 문서의 내용이 서로 어긋날 수 있습니다.

## 6. 대부분의 저장/삭제 동작에 에러 처리가 없음

`src/App.tsx`에서 모달의 `onSave`/`onDelete` 콜백을 정의하는 곳 중, **`AssetAccountModal`의 `onSave`(248-262행)만** `try/catch`로 감싸져 있고 실패 시 `alert(...)`로 사용자에게 알립니다. 나머지는 모두 `await data.xxx(...)`를 그대로 호출할 뿐 에러 처리가 없습니다:

- `ExpenseModal`(191-198행), `IncomeEntryModal`(209행), `StockTradeModal`(218-223행), `FixedListModal`(231행), `SavingsListModal`(238행), `PaymentLabelsModal`(269행), `CategoryModal`(276행), `AssetTypeModal`(283행), `StockCategoryModal`(290행)의 `onSave`/`onDelete`/`onDeleteGroup` 콜백.

Firestore 쓰기가 실패하면(오프라인, 권한 규칙 거부, 네트워크 오류 등) `await`가 던진 예외가 어디서도 잡히지 않아 unhandled promise rejection이 되고, `closeModal()`이 실행되지 않아 모달은 열려 있는 채로 남지만 사용자에게는 아무 에러 메시지도 표시되지 않습니다. `src/components/modals/AccountModal.tsx`의 `handleExport`(130-147행)는 `try/finally`만 있고 `catch`가 없어 내보내기 실패 시에도 에러가 조용히 전파됩니다.

## 7. Firestore 보안 규칙: `households/{code}`의 `update`가 필드 제한 없이 허용됨

`firestore.rules`:

```
match /households/{code} {
  allow get: if signedIn();
  allow list: if false;
  allow create: if signedIn() && request.resource.data.createdBy == request.auth.uid && request.resource.data.members == [request.auth.uid];
  allow update: if signedIn();
  allow delete: if false;
}
```

`allow update: if signedIn()`은 **로그인한 사용자라면 누구든, 해당 household의 멤버인지 여부와 무관하게, 문서의 어떤 필드든 원하는 값으로 덮어쓸 수 있음**을 의미합니다. 앱 UI는 `firebase.ts`의 `joinHousehold`/`leaveHousehold`에서 `arrayUnion`/`arrayRemove`로 `members` 필드만 건드리지만, 규칙 자체는 이를 강제하지 않습니다. 초대 코드를 알아낸(또는 6자리 base36 코드를 추측/무차별 시도한) 임의의 로그인 사용자가 Firestore SDK를 직접 호출해 `createdBy`를 바꾸거나 `members` 배열을 비우는 등 해당 공유 가계부를 탈취/파괴할 수 있습니다. 규칙 파일의 주석은 "any signed-in user may look one up by exact code or **update membership**"이라고 의도를 밝히고 있지만, 실제 규칙은 "membership만"으로 제한하지 않고 임의 필드 쓰기를 허용합니다.

관련하여 `allow delete: if false`가 항상 적용되므로, 마지막 멤버가 나가도(`leaveHousehold`) `households/{code}` 문서 자체는 영구히 남습니다(고아 문서가 계속 누적됨). `createHousehold`(`src/firebase.ts:244-248`)는 코드 중복 여부를 확인하지 않고 `setDoc`으로 곧바로 덮어쓰며, 코드 생성에 deprecated API인 `String.prototype.substr()`을 사용합니다.

## 8. 적대적 리뷰에서 발견되었지만 의도적으로 미해결 상태인 항목

`.forge/done/260812-154755-stock-profit-percent-fix/plan.md`에 따르면 다음 두 항목은 "지금 규모에서 급하지 않다"는 판단으로 명시적으로 손대지 않은 채 남아 있습니다:

- **수익률 문자열 길이 상한 없음**: `StockTab.tsx`/`StockTradeModal.tsx`의 `fmtPercent`는 `buyPrice`가 매우 작은 값(예: 1원)이고 `sellPrice`가 큰 값이면 `(+9999900.0%)`처럼 매우 긴 문자열을 그대로 렌더링합니다. 카드 레이아웃이 넘칠 수 있습니다.
- **`.expense-amount` CSS 클래스가 `StockTab`/`ExpenseTab`/`CalendarTab` 등에서 공유됨**: 한쪽(주식)에서 인라인 `style.color`로 덮어쓰는 방식에 의존하고 있어, 이 클래스의 기본 스타일을 바꾸면 다른 탭에도 영향이 갈 수 있는 결합 구조입니다.

## 9. 테스트 부재 / CI 부재 (요약, 상세는 다른 문서 참조)

- 자동화 테스트가 전혀 없고(`TESTING.md`에 상세 근거 있음), 검증은 `tsc -b` + `npm run lint` + `npm run build` + 수동 UI 확인뿐입니다.
- CI/CD 파이프라인이 없어(`.github/workflows` 없음) 위 검증도 로컬에서 사람이 직접 돌려야만 실행됩니다.
- `firestore.indexes.json`이 저장소에 없어, 쿼리에 새로운 복합 `where` 조건을 추가할 경우 인덱스 누락으로 인한 런타임 오류를 사전에 잡을 방법이 코드/설정 어디에도 없습니다(`INTEGRATIONS.md` 참고).
