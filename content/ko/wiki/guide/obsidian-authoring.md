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

영문 짝 문서가 없는 위키 문서는 빌드 준비 단계에서 한국어 원문과 필요한 자산을 영어 사이트의 같은 경로로 복사합니다. 생성된 문서의 맨 위에는 영문본이 없으며 브라우저 번역을 권한다는 영어 콜아웃이 붙고, `content/ko/` 원문은 수정되지 않습니다.

Wiki의 [문서 그래프](../graph.mdx)에서 위키 문서와 태그의 연결을 탐색할 수 있습니다. 그래프는 Docusaurus의 `document-graph` 플러그인이 빌드 시 문서 링크와 태그를 읽어 생성합니다. 노드를 잡고 흔들면 연결된 노드도 움직입니다. 배경을 드래그하거나 휠을 사용해 이동·확대할 수 있으며, 노드를 선택하면 연결된 문서와 원문으로 이동할 수 있습니다.

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

## 재사용 템플릿

블로그 글, 위키 문서, 페이지에서 반복되는 구조화 데이터는 YAML 코드 펜스로 작성할 수 있습니다. 템플릿 이름은 코드 펜스의 언어 자리에 씁니다. 현재 템플릿은 소개뿐 아니라 모든 블로그·위키 Markdown/MDX에 사용할 수 있고, 필수 필드와 지원하지 않는 필드는 빌드에서 검사합니다.

### 2열 목록

`list-type-2x2`는 이름과 설명으로 이루어진 항목을 두 열로 보여줍니다.

```list-type-2x2
- name: Kubernetes
  description: 컨테이너화된 워크로드를 선언적으로 배포하고 운영합니다.
- name: Argo Workflows
  description: Kubernetes에서 컨테이너 기반 작업 흐름을 실행합니다.
```

### 이미지가 있는 연혁 목록

`list-type-image-header`는 이름, 이미지, 설명, 시작·종료 연도를 사용합니다. 이미지는 선택 사항이고 종료 연도를 생략하면 현재 재직/활동으로 표시됩니다.

```list-type-image-header
- name: 현대오토에버
  image: /img/logos/hae.png
  description: 플랫폼을 설계하고 운영합니다.
  start: 2025
```

일반 문장, 표, 평범한 목록에는 템플릿을 쓰지 않고 Markdown을 유지합니다. 템플릿 하나는 전용 컴포넌트 하나로 구현하고, 다른 템플릿과 렌더링 책임을 섞지 않습니다.

## 글 쓰기 규칙

- 확장자는 `.md`를 씁니다. React 컴포넌트가 필요할 때만 `.mdx`를 씁니다.
- 블로그 파일명은 `YYYY-MM-DD-slug.md`이고, frontmatter의 `slug`가 주소가 됩니다.
- 블로그와 위키에서 공통 태그를 씁니다. 새 태그는 `data/tags.yml`에 kebab-case 주소와 한국어·영어 표시 이름을 등록한 뒤 `npm run sync`를 실행합니다.
