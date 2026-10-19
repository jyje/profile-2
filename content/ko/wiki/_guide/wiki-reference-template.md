---
title: "🧭 위키 문서 템플릿"
sidebar_position: 2
tags: [guide]
---

위키 Reference 문서는 템플릿 `wiki-reference`로 씁니다. 위키는 세상의 모든 설명을 담는 곳이 아니라, 내가 이 용어를 어떻게 받아들이고 어떻게 쓰는지를 정리하는 곳입니다. 공식 자료는 링크로 큐레이션합니다.

## 시작하기

1. 스캐폴드를 실행합니다. 한국어 뼈대와 제목만 있는 영어 파일이 함께 만들어집니다.

   ```bash
   npm run new:wiki -- raspberry-pi "🍓 라즈베리파이" --en-title "🍓 Raspberry Pi" --tags infra,mini-pc
   ```

2. 소개 자료 하나만 남기고, 필요 없는 섹션은 지웁니다. 빈 섹션은 오류입니다.
3. `npm run lint:content`를 실행합니다. 빌드와 개발 서버도 같은 검사를 합니다.

템플릿은 `content/` 밖의 루트 `templates/`에 있어서 어떤 모드에서도 렌더링되지 않습니다.

## 문체

한국어 본문은 높임말(합니다체)로 씁니다. 1인칭은 "저"입니다. 예: "저에게 라즈베리파이는 ~입니다."

기존 레거시 문서에는 "~다"체가 남아 있습니다. 템플릿으로 옮기면서 다시 쓰는 문서부터 높임말로 바꾸고, 일괄 변환은 하지 않습니다. 공식 문구 인용(`[!Quote]`)은 원문 그대로 둡니다.

## H2 구성

| H2 | 필수 | 내용 |
|---|---|---|
| `Definition` | 필수 | 공식 한 줄 정의를 `[!Quote]`로 인용하고 출처를 적습니다. 이어서 한 줄 해석과 표기를 씁니다. |
| `Understanding` | 권장 | 내가 이 용어를 어떻게 받아들이는지, 이웃 용어와의 경계. 2~5줄. |
| `Usage` | 권장 | 내가 이것으로 하는 일. 프로젝트, 글, 구성 링크. |
| `Details` | 선택 | 모델, 사양, 아키텍처, 어원처럼 나머지를 따라가는 데 필요한 것만. 공식 문서가 있으면 복사하지 않고 링크합니다. |
| `References` | 필수 | 공식 사이트, 문서, GitHub, 관련 위키와 글. |

순서는 위 표와 같습니다. 한국어와 영어 문서의 H2는 같은 영어 이름을 씁니다.

`Understanding`과 `Usage` 중 하나는 반드시 있어야 하지만, front matter가 `status: draft`인 동안에는 경고만 나옵니다. 직접 쓴 내용이 채워지면 `status`를 내립니다. 그 뒤에는 오류가 됩니다.

## 소개 자료

첫 H2 앞에 소개 자료가 하나 있어야 합니다.

- Anatomy 그림: `anatomy-figure` 블록. 사용법은 [Obsidian 작성 가이드](./obsidian-authoring.md)를 봅니다. 그림의 소스는 `figures/<name>/build.mjs`이고, `npm run build:anatomy -- <name>`이 다크/라이트 페이지와 소셜 카드용 `thumbnail.png`를 `static/anatomy/`에 만듭니다. 문서 front matter에 `image: /anatomy/<name>/thumbnail.png`를 적습니다.
- 썸네일 또는 다이어그램 이미지: `![설명](./assets/파일.png)`
- `mermaid` 코드 블록 (사이트에서 Mermaid를 켠 뒤에 사용합니다)

## 린트와 도구

`npm run lint:content`가 `content/{ko,en}/{wiki,blog}`의 모든 문서를 검사합니다.

- 모든 문서: 헤딩 끝 공백(오류), 본문 H1, 헤딩 단계 건너뛰기, 중복 H2(경고), Anatomy 그림의 정적 자산 존재 여부(오류).
- `template:`을 선언한 문서: H2 이름·순서·중복·필수 여부, 빈 섹션, 소개 자료, 필수 front matter, 한국어와 영어의 H2 일치.
- Anatomy 그림이 있는 Reference 문서에 `image:`가 없으면 경고, `/`로 시작하는 `image:` 파일이 `static/`에 없으면 오류입니다.
- 영어 문서가 제목만 있으면(본문은 한국어에서 가져옴) 본문 구조 검사는 건너뜁니다.
- `template:`이 없는 Reference 문서는 레거시로 분류되며 `--verbose`로 목록을 봅니다. `--strict`는 경고도 오류로 취급합니다.
- `npm run lint:content -- --fix`는 안전한 것만 고칩니다. 헤딩 끝 공백, 그리고 불릿이 한 줄뿐인 레거시 `## Name`을 `## Definition` 끝의 `- 표기:` 줄로 옮깁니다. `--dry-run`으로 먼저 확인합니다. 판단이 필요한 경우(불릿이 여러 개이거나 하위 헤딩이 있는 경우)는 건드리지 않습니다.
- `npm run report:content`는 Reference 문서마다 템플릿, 상태, 소개 자료, 썸네일, 섹션 유무를 표로 보여줍니다. `Understanding`과 `Usage`가 비어 있는 문서를 찾을 때 씁니다.

## 버전 관리

문서는 `template: wiki-reference@1`처럼 버전을 고정합니다. 발행된 버전은 바꾸지 않고, 규칙을 바꾸려면 `v2`를 새로 만듭니다. 문서를 새 버전으로 옮길 때만 `@2`로 올립니다. 버전별 변경 내역은 `templates/README.md`에 기록합니다.
