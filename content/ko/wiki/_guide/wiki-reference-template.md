---
title: "🧭 위키 문서 템플릿"
sidebar_position: 2
tags: [guide]
profile_template: {kind: wiki, version: 1}
profile_format: 1
---

위키 Reference 문서는 `reference` 레이아웃으로 씁니다. 위키는 세상의 모든 설명을 담는 곳이 아니라, 내가 이 용어를 어떻게 받아들이고 어떻게 쓰는지를 정리하는 곳입니다. 공식 자료는 링크로 큐레이션합니다.

## 시작하기

1. 스캐폴드를 만듭니다. 한국어와 영어를 각각 실행하고, 영어 제목에는 한글을 쓰지 않습니다.

   ```bash
   npm run content:new -- --kind wiki --locale ko --layout reference --path d/raspberry-pi.md --title "🍓 라즈베리파이"
   npm run content:new -- --kind wiki --locale en --layout reference --path d/raspberry-pi.md --title "🍓 Raspberry Pi"
   ```

2. 소개 자료 하나만 남기고, 필요 없는 섹션은 지웁니다. 빈 섹션은 오류입니다.
3. `npm run content:check`(포맷, 스탬프)와 `npm run lint:content`(구조)를 실행합니다. 빌드와 개발 서버도 구조 검사를 합니다.

스캐폴드는 `content/_templates/v1/{ko,en}/wiki-reference.md`에 있습니다. 이 폴더는 로케일 소스 루트 밖이고 `.docignore`에도 있어서 어떤 모드에서도 렌더링되지 않습니다.

## 문체

한국어 본문은 높임말(합니다체)로 씁니다. 1인칭은 "저"입니다. 예: "저에게 라즈베리파이는 ~입니다."

기존 레거시 문서에는 "~다"체가 남아 있습니다. 템플릿으로 옮기면서 다시 쓰는 문서부터 높임말로 바꾸고, 일괄 변환은 하지 않습니다. 공식 문구 인용(`[!Quote]`)은 원문 그대로 둡니다.

## H2 구성

| H2              | 필수 | 내용                                                                                                          |
| --------------- | ---- | ------------------------------------------------------------------------------------------------------------- |
| `Definition`    | 필수 | 공식 한 줄 정의를 `[!Quote]`로 인용하고 출처를 적습니다. 이어서 한 줄 해석과 표기를 씁니다.                   |
| `Understanding` | 권장 | 내가 이 용어를 어떻게 받아들이는지, 이웃 용어와의 경계. 2~5줄.                                                |
| `Usage`         | 권장 | 내가 이것으로 하는 일. 프로젝트, 글, 구성 링크.                                                               |
| `Details`       | 선택 | 모델, 사양, 아키텍처, 어원처럼 나머지를 따라가는 데 필요한 것만. 공식 문서가 있으면 복사하지 않고 링크합니다. |
| `References`    | 필수 | 공식 사이트, 문서, GitHub, 관련 위키와 글.                                                                    |

순서는 위 표와 같습니다. 한국어와 영어 문서의 H2는 같은 영어 이름을 씁니다.

`Understanding`과 `Usage` 중 하나는 반드시 있어야 하지만, front matter가 `status: draft`인 동안에는 경고만 나옵니다. 직접 쓴 내용이 채워지면 `status`를 내립니다. 그 뒤에는 오류가 됩니다.

## 소개 자료

첫 H2 앞에 소개 자료가 하나 있어야 합니다.

- Anatomy 그림: `anatomy` 매크로(본문은 그림 폴더 경로 한 줄). 사용법은 [Obsidian 작성 가이드](./obsidian-authoring.md)를 봅니다. 그림의 소스는 `figures/<name>/build.mjs`이고, `npm run build:anatomy -- <name>`이 다크/라이트 페이지와 소셜 카드용 `thumbnail.png`를 `static/img/figures/<name>/`에 만듭니다. 문서 front matter에 `image: /img/figures/<name>/thumbnail.png`를 적습니다.
- 썸네일 또는 다이어그램 이미지: `![설명](./assets/파일.png)`
- `mermaid` 코드 블록 (사이트에서 Mermaid를 켠 뒤에 사용합니다)

## 린트와 도구

두 검사가 역할을 나눕니다.

- `npm run content:check`: 포맷(prettier), 스탬프, 제목, 블록 스키마. 문서마다 `profile_template`과 `profile_format`이 필요합니다.
- `npm run lint:content`: 이 레이아웃의 구조와 소개 자료. `design-system/layouts/reference-v1.json`이 규칙을 정의합니다.

`lint:content`가 보는 것은 다음과 같습니다.

- 모든 문서: 헤딩 단계 건너뛰기, 중복 H2(경고), Anatomy 그림의 정적 자산 존재 여부(오류).
- `profile_layout`을 선언한 문서: H2 이름·순서·중복·필수 여부, 빈 섹션, 소개 자료, 필수 front matter, 한국어와 영어의 H2 일치.
- Anatomy 그림이 있는 Reference 문서에 `image:`가 없으면 경고, `/`로 시작하는 `image:` 파일이 `static/`에 없으면 오류입니다.
- 영어 문서가 제목만 있으면(본문은 한국어에서 가져옴) 본문 구조 검사는 건너뜁니다.
- `profile_layout`이 없는 Reference 문서는 레거시로 분류되며 `--verbose`로 목록을 봅니다. `--strict`는 경고도 오류로 취급합니다.
- `npm run lint:content -- --fix`는 불릿이 한 줄뿐인 레거시 `## Name`을 `## Definition` 끝의 `- 표기:` 줄로 옮깁니다. 판단이 필요한 경우(불릿이 여러 개이거나 하위 헤딩이 있는 경우)는 건드리지 않습니다. `--dry-run`으로 먼저 확인합니다.
- `npm run report:content`는 Reference 문서마다 레이아웃, 상태, 소개 자료, 썸네일, 섹션 유무를 표로 보여줍니다. `Understanding`과 `Usage`가 비어 있는 문서를 찾을 때 씁니다.

## 태그

태그는 언어와 상관없이 하나의 이름입니다.

- 슬러그: 영어 kebab-case. 예: `raspberry-pi`, `on-premise`. 문서 front matter에는 슬러그를 씁니다.
- 라벨: `data/tags.yml`의 `label`은 한 줄이고 두 언어에 똑같이 보입니다. 슬러그의 철자를 그대로 따르되 단어를 `_`로 잇습니다. 예: `Raspberry_Pi`, `On_Premise`, `Argo_CD`. 약어는 대문자로 씁니다.
- 설명: `description`만 한국어와 영어를 따로 씁니다.
- 한국어 문서와 영어 문서는 같은 태그를 씁니다.
- 슬러그를 바꾸면 옛 슬러그를 `aliases`에 적어 둡니다. 옛 주소가 새 주소로 리다이렉트됩니다.

`npm run lint:content`가 슬러그·라벨 형식, 라벨과 슬러그의 일치, 라벨 중복, 별칭 충돌, 문서의 미등록 태그, 한국어와 영어의 태그 불일치를 오류로 잡습니다. 태그 이름을 바꾸면 주소가 바뀌기 때문에 자동 수정은 없습니다. 직접 고칩니다. `content/{ko,en}/{wiki,blog}/tags.yml`은 `data/tags.yml`에서 생성되는 파일이므로 손으로 고치지 않습니다.

## 버전 관리

문서는 `profile_layout: {kind: reference, version: 1}`로 버전을 고정합니다. 발행된 버전은 바꾸지 않고, 규칙을 바꾸려면 새 버전을 만듭니다.

1. `design-system/layouts/reference-v2.json`과 `content/_templates/v2/{ko,en}/wiki-reference.md`를 추가합니다.
2. `design-system/content-contract.json`의 `layouts.reference`에 `"2"`를 등록하고 `latest`를 올립니다.
3. 문서를 새 버전으로 옮길 때만 `version: 2`로 올립니다. 오래된 버전을 쓰는 문서에는 경고가 나옵니다.
