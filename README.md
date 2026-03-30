# BEM Navigator

> VSCode extension for instant Go-to-Definition on BEM class names in Vue / Pug / HTML → Stylus

BEM 클래스명 위에서 `F12` 한 번으로 Stylus 스타일 정의 위치로 바로 이동합니다.  
같은 파일 내 `<style lang="stylus">` 블록과 외부 `.styl` 파일을 모두 탐색하며,  
현재 파일과 경로가 가까운 스타일 파일을 우선적으로 보여줍니다.

---

## Features

- **Go to Definition** — `.vue`, `.pug`, `.html`에서 BEM 클래스명을 클릭하면 해당 Stylus 셀렉터로 즉시 이동
- **인라인 스타일 탐색** — `<style lang="stylus">` 블록 내부도 탐색
- **프로젝트 전체 인덱싱** — 워크스페이스 내 모든 `.styl` 파일을 백그라운드에서 자동 캐싱
- **거리 기반 우선순위** — 현재 파일과 물리적으로 가까운 스타일 파일을 먼저 제안
- **BEM `&` 결합자 지원** — 중첩된 `&--modifier`, `&__element` 구조를 정확히 파싱
- **실시간 캐시 갱신** — `.styl` 파일 변경/생성/삭제 시 캐시 자동 업데이트

---

## Demo

```
// MyComponent.vue
<template>
  <div class="card">
    <span class="card__title">Hello</span>  ← F12
  </div>
</template>
```

```stylus
// components/card.styl
.card                   ← 이동!
  &__title              ← 또는 이동!
    font-size 16px
```

---

## Installation

### Prerequisites

- VSCode `1.75.0` 이상

### VSIX로 설치

```bash
code --install-extension bem-navigator-x.x.x.vsix
```

또는 VSCode Extensions 탭(`Ctrl+Shift+X`) → `···` → `Install from VSIX...`

### 소스에서 빌드

```bash
git clone https://github.com/your-org/bem-navigator.git
cd bem-navigator
npm install
npm run compile
npx vsce package
code --install-extension bem-navigator-*.vsix
```

---

## Usage

`.vue` / `.pug` / `.html` 파일에서 BEM 클래스명에 커서를 올린 후:

| 동작             | 단축키                          |
| ---------------- | ------------------------------- |
| Go to Definition | `F12`                           |
| Peek Definition  | `Alt+F12`                       |
| 마우스로 이동    | `Ctrl+Click` (Mac: `Cmd+Click`) |

---

## How It Works

```
activate()
  ├── 워크스페이스 내 *.styl 파일 백그라운드 인덱싱 (StyleCacheManager)
  └── Definition Provider 등록 (vue, pug, html)
        │
        ├─ [1] getBemRange()로 커서 위치의 BEM 클래스 범위 추출
        ├─ [2] 현재 문서 내 <style lang="stylus"> 블록 파싱 (parseStylus)
        │       └─ 캐시 hit 시 재파싱 없이 재사용 (document.version 기반)
        └─ [3] StyleCacheManager.findInFolder()로 외부 .styl 파일 탐색
                └─ calculateDistance()로 경로 거리 점수화 → 가장 가까운 파일 우선 반환
```

### 셀렉터 파싱 규칙 (`parseStylus`)

- `.class`, `#id`, `&` 로 시작하는 라인만 선택자로 인식
- `:` 가 포함된 라인은 속성값으로 간주하여 제외 (`&` 시작 제외)
- 인덴트 기반 스택으로 `fullSelector` 조합 (`.parent &__child` → `.parent__child`)

### 캐시 우선순위

1. 현재 문서 내 `<style>` 블록
2. 동일 프로젝트 루트(`package.json` 기준) 내 `.styl` 파일
3. 경로 거리(depth diff)가 낮은 파일 우선

---

## Project Structure

```
bem-navigator/
├── src/
│   ├── extension.ts          # Entry point, Definition Provider
│   ├── types/
│   │   └── StyleSymbol.ts    # { fullSelector, line, character }
│   └── utils/
│       ├── parseStylus.ts    # Stylus 파싱 → StyleSymbol[]
│       ├── styleCacheManager.ts  # 파일 캐싱 및 탐색
│       └── getBemRange.ts    # 커서 위치에서 BEM 클래스 범위 추출
├── package.json
└── tsconfig.json
```

---

## Supported Languages

| 탐색 소스 | 스타일 대상                                |
| --------- | ------------------------------------------ |
| `.vue`    | `<style lang="stylus">` 블록, 외부 `.styl` |
| `.pug`    | 외부 `.styl`                               |
| `.html`   | 외부 `.styl`                               |

> SCSS / LESS 등 다른 전처리기는 현재 미지원입니다.

---

## Known Limitations

- Stylus 이외의 CSS 전처리기 미지원
- 태그 선택자(`div`, `span` 등)는 탐색 대상에서 제외됨
- 콜론(`:`)이 포함된 Stylus 속성 라인은 선택자로 인식되지 않음 (`&:hover` 예외)
- 멀티루트 워크스페이스에서는 `package.json` 기준으로 프로젝트가 분리됨

---

## Contributing

1. 이슈/버그는 GitHub Issues에 등록해주세요.
2. PR 시 `parseStylus` 관련 변경은 엣지케이스 예시를 함께 첨부해주세요.
3. 코드 스타일: ESLint + Prettier 설정 따름

--

# Patch Note

All notable changes to the "bem-navigator" extension will be documented in this file.

Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file.

## [0.0.3 패치노트]

### 🚀 Features

- **마우스 오버 미리보기 (Hover Provider) 추가:** BEM 클래스명 위에 마우스를 올리면 해당 스타일 코드와 파일 경로를 툴팁으로 미리 확인할 수 있습니다.
- **상태 표시줄 (Status Bar) 추가:** 확장 프로그램 활성화 시 대규모 파일 인덱싱 진행 상태(`BEM: 인덱싱 중...` -> `BEM: 인덱싱 완료`)를 우측 하단에서 시각적으로 확인할 수 있습니다.

### ⚡ Performance (성능 최적화)

- **백그라운드 인덱싱 안정성 및 속도 최적화:** 프로젝트 초기 로딩 시 다량의 파일을 한 번에 읽어올 때 발생하는 OS 파일 시스템 과부하(`EMFILE` 에러)를 방지하기 위해, 파일 50개 단위의 청크(Chunk) 병렬 처리 방식을 도입했습니다.

### ✨ UX Improvements (사용자 경험 개선)

- **정의 찾기 실패 알림:** 매칭되는 스타일 정의를 찾지 못했을 때 조용히 실패하는 대신, 우측 하단에 알림(Toast) 창으로 명확한 피드백 메시지를 제공합니다.

## [0.0.4 테스트 패치노트]

- **자동완성 기능 추가:** 코드 작성 시에 자동완성되는 미리보기를 볼 수 있습니다.

## [0.0.6 테스트 패치노트]

- **네비게이션 다중 탐색:** 같은 클래스의 여러 이름이 있더라도 동시에 여러 파일을 볼 수 있습니다.
- 불필요한 자동완성 기능이 제거되었습니다.

## [0.1.0 패치노트]

- **script 내부에서 파싱 차단:** <script>구문 내부에서 hover, 탐색 이벤트가 발생하지 않도록 변경했습니다.
- 패키지 이미지가 추가되었습니다.

---

## License

MIT
