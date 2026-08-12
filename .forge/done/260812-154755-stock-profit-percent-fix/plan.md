<!-- forge-slug: stock-profit-percent-fix -->
<!-- task: 2 -->
<!-- generated-by: fg-adversarial-review -->
<!-- tdd: off -->
# 주식거래 수익률 색상/검증 버그 수정 (적대적 리뷰 후속)

## 목표 / 하지 않는 것

- 목표: 적대적 리뷰에서 확인된 실재 버그 3개를 고친다 — (A) 금액과 수익률 색상 통일, (B) buyPrice/quantity 0 이하 입력 저장 차단, (C) 무손익(0%) 중립색 처리.
- 하지 않는 것: 수익률 문자열 길이 상한(D), `.expense-amount` 공유 클래스 분리(E), 계산 로직 공용 유틸 추출(F) — 리뷰에서 급하지 않다고 판단한 항목.

## 근거 자료 (Source of truth)

- 관련 문서: `.forge/branch/feature/forge-demo/review.md` (적대적 리뷰 findings A/B/C, 사용자가 A는 "금액도 빨강/파랑으로 통일" 방향으로 결정)
- 완료 정의:
  - 이익/손실에 따라 금액과 수익률 색상이 항상 같은 로직(빨강=상승, 파랑=하락)으로 일치한다.
  - 매수 단가 또는 수량이 0 이하이면 저장 버튼이 비활성화된다.
  - 매도가=매수가(무손익)일 때 수익률이 중립색(`var(--text-dim)`)으로, 부호 없이 표시된다.

## 작업 단위 (Work slices)

- [ ] S1. `StockTab.tsx`: 금액 색상도 percentColor와 같은 로직(빨강=상승/파랑=하락, 0은 중립)으로 통일 — income/expense 클래스 제거 — 완료 기준: 같은 거래의 금액과 수익률이 항상 같은 색
- [ ] S2. `StockTradeModal.tsx`도 동일하게 통일 — 완료 기준: 모달의 예상 수익 금액·수익률 색이 항상 일치 (depends: S1)
- [ ] S3. `StockTradeModal.tsx`의 `valid` 계산에 `Number(buyPrice) > 0 && Number(quantity) > 0` 조건 추가 — 완료 기준: 매수단가나 수량에 0 이하 값을 넣으면 저장 버튼이 비활성화됨
- [ ] S4. 손익이 정확히 0일 때 수익률을 중립색·부호 없이 표시 — 완료 기준: 매도가=매수가 입력 시 "0.0%"가 회색으로 표시됨 (depends: S1, S2)
- [ ] S5. 검증 — `tsc -b`, `npm run lint`, `npm run build` 통과 + 브라우저에서 이익/손실/무손익/저장버튼 비활성화 4가지 확인
