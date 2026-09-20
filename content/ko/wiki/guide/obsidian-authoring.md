---
title: Obsidian 작성 가이드
sidebar_position: 1
tags: [guide, obsidian]
---

## Vault 열기

Obsidian에서 이 저장소의 `content/` 폴더를 vault로 엽니다. `content/.obsidian/app.json`이 저장소에 포함되어 있어서 아래 설정이 자동으로 적용됩니다.

- 링크는 `[[위키링크]]`가 아니라 **상대 경로 마크다운 링크**를 씁니다. Docusaurus가 그대로 해석하기 때문입니다.
- 파일 이름을 바꾸거나 옮기면 링크가 자동으로 갱신됩니다.
- 첨부 이미지는 노트가 있는 폴더의 `assets/`에 저장됩니다.

## 폴더 구조

```text
content/
├─ ko/            ← 한국어 (기본 언어)
│   ├─ blog/
│   └─ wiki/
└─ en/            ← 영어. ko와 같은 경로, 같은 파일명으로 짝을 맞춥니다
    ├─ blog/
    └─ wiki/
```

영어본이 없는 문서는 영어 사이트에서 한국어 원문이 대신 보입니다. 다만 영어 문서에서 영어본이 없는 문서로 링크를 걸면 빌드가 실패하므로, 링크하는 문서는 반드시 같은 경로로 짝을 만들어 둡니다. 이 실패가 끊어진 링크를 잡아 줍니다.

## 링크와 이미지

```md
[다른 노트](../design/resume.md)
![설명](./assets/diagram.png)
```

## 콜아웃

Obsidian 콜아웃 문법을 그대로 쓰면 사이트에서 Docusaurus 알림 상자로 바뀝니다.

> [!note] 노트
> 일반 안내입니다.

> [!warning] 주의
> 경고 상자입니다.

> [!danger]
> 제목이 없으면 유형 이름이 제목이 됩니다.

## 글 쓰기 규칙

- 확장자는 `.md`를 씁니다. React 컴포넌트가 필요할 때만 `.mdx`를 씁니다.
- 블로그 파일명은 `YYYY-MM-DD-slug.md`이고, frontmatter의 `slug`가 주소가 됩니다.
- 태그는 `content/*/blog/tags.yml`에 등록된 것을 씁니다.
