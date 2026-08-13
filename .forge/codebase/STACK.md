---
last_mapped_commit: d7cb05506bb3373788498af458bd8c8e4ef63412
mapped: 2026-08-12
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
- `.firebaserc`
  - `projects.default` → `moneylog-3c3d6`
- `firestore.rules` — Firestore 보안 규칙 (컬렉션별 접근 제어; 상세는 `INTEGRATIONS.md` 참고)
- `.firebase/hosting.ZGlzdA.cache` — Firebase CLI가 생성하는 배포 캐시 파일(빌드 산출물, 코드 아님)

CI/CD 파이프라인 없음(`.github` 디렉터리 없음). 배포는 수동으로 `firebase deploy` CLI 명령 실행.

## 기타 정적 자산 / 엔트리포인트

- `index.html` — Vite 엔트리 HTML. Google Fonts(`fonts.googleapis.com`)의 `Noto Sans KR`, `Source Code Pro` 웹폰트를 `<link rel="stylesheet">`로 로드. OG 메타태그(`og:image` 등)가 `https://moneylog-3c3d6.web.app`를 하드코딩.
- `src/main.tsx` — React 엔트리(`createRoot` + `StrictMode`).
- `public/` — favicon, apple-touch-icon, og-image 등 정적 이미지 자산.

## 저장소 메타

- Git remote(`origin`): `https://github.com/codnjsm/moneylog.git`
- 매핑 시점 HEAD 커밋: `d7cb05506bb3373788498af458bd8c8e4ef63412`
