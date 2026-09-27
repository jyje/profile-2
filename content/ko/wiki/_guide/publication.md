---
title: "📄 개발 문서와 공개 배포"
sidebar_position: 2
tags: [guide]
---

## 작성 위치

개발용 작성 가이드는 `content/{ko,en}/wiki/_guide/`, 사이트 설계 기록은 `_design/`에 작성합니다. 밑줄 폴더이므로 Obsidian과 파일 탐색기에서도 볼 수 있습니다. 개발 서버에서는 각각 `/wiki/guide/`, `/wiki/design/`으로 접근합니다.

## 공개 배포 제외 규칙

저장소 루트의 `.docignore`가 공개 배포 제외 대상을 정의합니다.

```text
# 한국어와 영어에 동일하게 적용합니다.
content/*/wiki/_guide/
content/*/wiki/_design/
content/*/blog/_internal/
```

경로는 저장소 루트 기준입니다. `*`, `**` glob과 `#` 주석을 사용할 수 있고, 끝의 `/`는 해당 폴더 전체를 뜻합니다. `!` 예외 규칙은 지원하지 않습니다. 폴더 규칙은 문서와 함께 저장된 이미지 등 자산도 제외합니다.

`npm run dev`는 `SITE_CONTENT_MODE=development`로 양쪽 언어를 빌드하며 localhost와 LAN에서 개발 문서를 보여줍니다. `npm run build`와 CI·GitHub Pages는 `public` 모드입니다. 브라우저의 접속 주소로 내용을 숨기는 방식이 아니라, 공개 빌드의 페이지·메뉴·검색·그래프·태그·사이트맵에서 제외합니다.

빌드 입력은 `.content-build/`에 생성됩니다. 직접 수정하지 마세요. 공개 문서가 개발 문서를 링크하면 빌드에서 오류가 나므로, 개발 전용 안내는 이 구역 안에 작성합니다. 로컬 전용 구역 사이의 사이트 링크는 `/wiki/design/resume`처럼 기존 경로를 사용할 수 있습니다.

개발 서버에서는 제외 규칙에 해당하는 문서의 최상단에 공개 배포 제외 안내가 자동 표시됩니다. 영문 대체 문서에서도 이 안내가 번역 안내보다 먼저 나옵니다. 원본 Markdown에 안내문을 직접 복사하지 마세요. 위키 제목의 이모지 규칙은 공개 제외 문서에도 동일하게 적용합니다.

## 최근 수정 날짜

위키와 블로그 본문 하단에는 Docusaurus 기본 기능으로 원본 파일의 마지막 Git 커밋 날짜를 표시합니다. 영문 대체 문서는 한국어 원문의 날짜를 사용합니다. 빌드 날짜나 파일 복사 시각은 사용하지 않으며, 커밋되지 않은 변경은 날짜를 갱신하지 않습니다. Git 이력이 없는 새 문서는 첫 커밋 전까지 자동 날짜가 없습니다.

필요하면 원본 front matter에서 날짜를 지정할 수 있습니다. 이 값은 Git 날짜보다 우선합니다.

```yaml
last_update:
  date: '2026-09-27T09:00:00+09:00'
```

표시 형식은 Docusaurus 기본값인 UTC 기준의 현지화된 날짜입니다. CI는 `fetch-depth: 0`으로 전체 이력을 받아야 합니다. 생성된 `.content-build/`와 영문 미러의 날짜는 직접 수정하지 마세요.

## 검증 명령

```sh
npm run test:content
SITE_URL=https://jyje.github.io SITE_BASE_URL=/profile-2/ npm run build
npm run test:publication
```

공개 저장소의 Markdown 원본은 여전히 공개되어 있습니다. 이 설정은 사이트 게시 범위를 구분할 뿐, 인증이나 비밀정보 보호 수단이 아닙니다.
