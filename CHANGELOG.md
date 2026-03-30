# Change Log

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