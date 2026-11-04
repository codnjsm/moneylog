---
last_mapped_commit: 9f44a98b1a28c5ded66cf41de8ee1280b6467f64
mapped: 2026-11-04
---

# STACK

## 언어 / 런타임

- **언어**: TypeScript (`~6.0.2`). 소스는 `.ts`/`.tsx`만 존재.
- **패키지 매니저**: npm (`package-lock.json` 존재, lockfile version 3).
- **모듈 시스템**: ESM (`package.json`의 `"type": "module"`).
- 로컬 개발 환경에서 확인된 런타임 버전: Node `v22.5.1`, npm `10.8.2`. `package.json`에 `engines` 필드는 없음. `.nvmrc` 없음.

## 프레임워크 / 라이브러리

`package.json` 기준.

### dependencies

- `react` `^19.2.6`, `react-dom` `^19.2.6`
- `firebase` `^12.13.0` (lockfile에 고정된 실제 설치 버전: `12.13.0`) — Auth, Firestore 클라이언트 SDK로 사용 (하단 INTEGRATIONS.md 참고)

### devDependencies

- `typescript` `~6.0.2`
- `vite` `^5.4.21`, `@vitejs/plugin-react` `^4.7.0` — 빌드/개발 서버
- `eslint` `^10.3.0`, `@eslint/js` `^10.0.1`, `typescript-eslint` `^8.59.2`, `eslint-plugin-react-hooks` `^7.1.1`, `eslint-plugin-react-refresh` `^0.5.2`, `globals` `^17.6.0` — 린팅
- `@types/node` `^24.12.3`, `@types/react` `^19.2.14`, `@types/react-dom` `^19.2.3` — 타입 정의

상태관리 라이브러리(Redux, Zustand 등), 라우팅 라이브러리, CSS 프레임워크, 테스트 프레임워크는 의존성에 없음. UI 상태는 React의 `useState`/`useEffect`만으로 구성(`src/hooks/*.ts`).

## 빌드 / 실행 스크립트

`package.json`의 `scripts`:

```json
"dev": "vite",
"build": "tsc -b && vite build",
"lint": "eslint .",
"preview": "vite preview"
```

- `npm run build`는 TypeScript 프로젝트 참조 빌드(`tsc -b`)를 먼저 수행한 뒤 Vite 빌드를 실행.
- 별도의 test 스크립트 없음(테스트 프레임워크 미사용, CLAUDE.md에도 "테스트 코드가 없는 프로젝트"로 명시).

## 빌드 설정 (`vite.config.ts`)

```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
})
```

플러그인은 `@vitejs/plugin-react` 하나만 등록. 별도 alias, proxy, env 설정 없음.

## TypeScript 설정

프로젝트 참조(project references) 구조로 3개 파일 구성.

- `tsconfig.json` — `files: []`, `tsconfig.app.json`과 `tsconfig.node.json`을 참조만 함.
- `tsconfig.app.json` (앱 소스 `src` 대상)
  - `target: es2023`, `lib: ["ES2023", "DOM"]`, `module: esnext`, `moduleResolution: bundler`
  - `jsx: react-jsx`, `types: ["vite/client"]`
  - `noEmit: true`, `verbatimModuleSyntax: true`, `allowImportingTsExtensions: true`, `moduleDetection: force`, `erasableSyntaxOnly: true`
  - 린팅성 옵션: `noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch` 모두 `true`
  - `include: ["src"]`
- `tsconfig.node.json` (`vite.config.ts` 대상)
  - `target: es2023`, `lib: ["ES2023"]`, `types: ["node"]`, 나머지 옵션은 `tsconfig.app.json`과 동일한 패턴
  - `include: ["vite.config.ts"]`

## Lint 설정 (`eslint.config.js`)

Flat config (`eslint/config`의 `defineConfig`) 사용.

- `globalIgnores(['dist'])`
- 대상 파일: `**/*.{ts,tsx}`
- extends: `js.configs.recommended`, `tseslint.configs.recommended`, `reactHooks.configs.flat.recommended`, `reactRefresh.configs.vite`
- `languageOptions.globals: globals.browser`

## Firebase 관련 설정 파일

- `firebase.json`
  - `firestore.rules` → `firestore.rules` 파일 지정
  - `hosting.public` → `dist`
  - `hosting.ignore` → `["firebase.json", "**/.*", "**/node_modules/**"]`
  - `hosting.rewrites` → `[{ "source": "**", "destination": "/index.html" }]` (SPA 라우팅용 catch-all)
  - `hosting.headers` → 전체 `**`는 `Cache-Control: no-cache`, `/assets/**`(해시 파일명 번들)는 `public, max-age=31536000, immutable`
- `.firebaserc`
  - `projects.default` → `moneylog-3c3d6`
- `firestore.rules` — Firestore 보안 규칙 (컬렉션별 접근 제어; 상세는 `INTEGRATIONS.md` 참고)
- `.firebase/hosting.ZGlzdA.cache` — Firebase CLI가 생성하는 배포 캐시 파일(빌드 산출물, 코드 아님)

CI/CD 파이프라인 없음(`.github` 디렉터리 없음). 배포는 수동으로 `firebase deploy` CLI 명령 실행.

## 기타 정적 자산 / 엔트리포인트

- `index.html` — Vite 엔트리 HTML. Google Fonts(`fonts.googleapis.com`)의 `Noto Sans KR`, `Source Code Pro` 웹폰트를 `<link rel="stylesheet">`로 로드. PWA/모바일 메타(`<link rel="manifest" href="/manifest.json">`, `apple-touch-icon`, `theme-color`, `apple-mobile-web-app-*`, `viewport-fit=cover`)와 OG 메타태그(`og:image`=`https://moneylog-3c3d6.web.app/og-image.jpg` 등, 도메인 하드코딩)를 가짐. 인라인 `<script>`가 테마를 초기화: `localStorage`의 `moneylog-theme`(`light`/`dark`)가 없으면 첫 진입 때 `prefers-color-scheme`로 한 번만 정한 뒤 그 값을 `localStorage`에 저장해 고정(이후 기기 테마 변경은 따라가지 않음). 결정된 테마를 `<html data-theme>`와 `meta[name=theme-color]`(라이트 `#F2F2F7`, 다크 `#000000`)에 반영.
- `public/manifest.json` — PWA 웹 앱 매니페스트(`display: standalone`, `start_url: /`, `background_color`/`theme_color` `#F2F2F7`, 아이콘은 `/favicon.png` 하나). 서비스 워커는 없음(`src`/`index.html`에 `serviceWorker` 참조 없음) — 홈 화면 설치용 메타만 제공하고 오프라인 캐시는 Firestore 로컬 캐시가 담당(INTEGRATIONS.md 참고).
- `src/index.css` — 전역 스타일. 테마는 CSS 변수 + `[data-theme]`로 전환하며 `color-scheme`을 테마별로 고정(`:root { color-scheme: light }`, `[data-theme="dark"] { color-scheme: dark }`)해 네이티브 스크롤바·날짜 선택기가 OS가 아닌 앱 테마를 따름.
- `src/main.tsx` — React 엔트리(`createRoot` + `StrictMode`).
- `public/` — `favicon.ico`, `favicon.png`(512×512), `apple-touch-icon.png`, `og-image.jpg`, `manifest.json`. (이전의 `favicon.svg`, `icons.svg`, `og-image.png`와 `src/assets/`의 `hero.png`, `vite.svg`는 삭제됨.)
- `src/lib/image.ts` — 브라우저 Canvas/`URL.createObjectURL` 기반 이미지 로드·프로필 사진 크롭(정사각 JPEG 데이터 URI) 유틸. 외부 이미지 라이브러리 없음.

## 저장소 메타

- Git remote(`origin`): `https://github.com/codnjsm/moneylog.git`
- 매핑 시점 HEAD 커밋: `9f44a98b1a28c5ded66cf41de8ee1280b6467f64`
