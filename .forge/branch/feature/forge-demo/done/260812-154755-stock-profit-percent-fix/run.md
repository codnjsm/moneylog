<!-- forge-slug: stock-profit-percent-fix -->
# 실행 기록 — 주식거래 수익률 색상/검증 버그 수정

계획대로 정확히 구현됨. divergence 없음.

- S1. `StockTab.tsx` 금액 색상 통일 — ✅ 계획대로 (income/expense 클래스 제거, signColor로 통일, 상단 총 수익 표시도 함께 통일)
- S2. `StockTradeModal.tsx` 동일 통일 — ✅ 계획대로
- S3. `valid`에 `Number(buyPrice) > 0 && Number(quantity) > 0` 추가 — ✅ 계획대로
- S4. 손익 0일 때 중립색·부호 없음 — ✅ 계획대로 (`fmtPercent`/`signColor`가 0을 별도 분기)
- S5. 검증 — ✅ `tsc -b`, `npm run lint`(기존 4개만), `npm run build` 통과. 브라우저에서 이익/손실/무손익/저장버튼 비활성화 4가지 모두 사용자 확인.
