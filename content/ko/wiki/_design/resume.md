---
sidebar_position: 1
---

# 🛠️ 직무별 이력서와 경력기술서

## 문서의 역할

[1페이지 이력서](/about/resume)는 핵심 경력과 기술을 빠르게 검토하는 요약본입니다. [경력기술서](/about/selected-cv)는 직무에 관련된 프로젝트와 경력을 분량 제한 없이 보여줍니다. [전체 CV](/about/cv)는 경력, 프로젝트, 학력, 기술, 자격증, 활동, 논문과 언어 정보를 모두 보여줍니다. [포트폴리오](./portfolio.md)는 프로젝트 근거와 구현 내용을 연결합니다.

## 원본 데이터와 템플릿 {#data-contract}

- 경력 사실: `data/career/`의 `.yaml` 파일. 회사·프로젝트는 개별 파일, 짧은 항목은 종류별 파일로 관리합니다.
- 직무별 선택: `data/career/index.yaml`의 기본 직무와 `profiles/*.yaml`의 제목·요약·ID 선택 목록
- 직무 키: `platform` (기본), `agents`, `inference`
- 경력기술서 템플릿: `src/components/SelectedCV/`
- 1페이지 템플릿: `src/components/ResumeSummary/`
- 상세 CV 템플릿: `src/components/Resume/`
- 문서별 CSS module과 공통 `src/css/career-print.css`

새 경력이나 수치는 확인된 원본에만 추가합니다. 화면에 맞추려고 텍스트를 자동으로 자르거나 글꼴을 자동 축소하지 않습니다. 알 수 없는 ID, 중복 ID·앵커, 빠진 원본 파일, 한·영 ID 불일치가 있으면 빌드가 실패합니다. 자격증의 취득·만료 날짜는 원본 그대로 표시하며 현재 유효함을 추정하지 않습니다.

## 길이별 표현과 조립

기간·URL·기여도는 공통 필드로, 제목·역할·한줄 요약·상세 서술은 `ko`와 `en` 아래에 둡니다. `responsibilities`와 `outcomes`의 각 항목에는 고유 ID, 짧은 `summary`, 선택적인 `detail`이 있습니다. 짧은 성과와 긴 성과를 별개 목록으로 복제하지 않습니다.

이력서는 `프로젝트 ID → 성과 ID → text: summary`로 문장을 선택합니다. 경력기술서는 `프로젝트 ID → text: detail`로 해당 프로젝트 전체 내용을 표시합니다. 상세 표현이 없으면 작성된 요약을 사용합니다. 실제 경력 사실은 직무별 파일에 복제하지 않습니다.

## 인쇄

세 문서의 **인쇄 / PDF 저장** 버튼은 브라우저 인쇄를 엽니다. A4, 배율 100%, 배경 그래픽 켜짐을 권장합니다. 수동 인쇄의 브라우저 머리글·바닥글은 끕니다. 자동 내보내기는 같은 페이지를 사용하며 경력기술서와 전체 CV에 페이지 번호를 넣습니다.

## 검증 {#validation-resume-lint}

```sh
npm run typecheck
npm run test:content
npm run dev
# 별도 터미널
npm run export:pdf
```

최초 1회 `npx playwright install chromium`이 필요합니다. 결과는 Git에서 제외된 `output/pdf/`에 생성됩니다. `PDF_BASE_URL`로 전체 언어를 제공하는 정적 서버와 프로젝트 하위 경로를 지정할 수 있습니다.

내보내기는 세 직무의 두 언어 이력서 1페이지, 전체 CV 2페이지 이상, 모든 페이지의 A4 크기를 검사합니다. CI는 실제 GitHub Pages 하위 경로에서 링크·태그·CV 앵커·모바일 오버플로도 확인합니다. 페이지 수만으로 가독성을 보장하지 않으므로 PDF의 모든 페이지를 이미지로 렌더링하여 잘림, 겹침, 빈 페이지와 한글 글꼴을 검토합니다.

## 직무 전환

직무 관점은 AI Platform Engineer, AI Agent Engineer, LLM Inference Platform Engineer 중에서 선택합니다. 제목·요약·프로젝트·기술의 선택과 순서가 바뀌며, 실제 직책과 재직 기간은 원본 그대로입니다. 경력기술서는 선택한 프로젝트의 원본 상세 목록을 모두 표시합니다.

`?role=platform`, `?role=agents`, `?role=inference`로 선택을 공유합니다. 문서 메뉴와 언어 메뉴에서도 선택을 유지합니다. 전체 CV는 항상 전체 기록을 보여주고 직무 선택기는 숨깁니다. 쿼리가 없거나 잘못되면 기본 직무를 표시합니다. 정적 HTML·검색·llms.txt에는 기본 직무가 제공됩니다.

현재 공개 원본으로만 구성합니다. GPU 연구 자원 활용 성과를 LLM 추론 처리량 성과로 바꾸지 않습니다. 추론 플랫폼의 처리량·지연시간·비용 개선 수치와 프로젝트의 추가 배경·역할은 근거 확인 후 원본에 보강할 항목입니다.

## 콘텐츠 연결

경력의 태그는 [공통 태그](/tags)를 통해 블로그·위키와 연결됩니다. 태그의 경력 링크는 요약본에서 생략되지 않는 상세 CV 앵커를 가리킵니다. 본문 사이의 관계는 [문서 그래프](../index.md#document-graph)에서 탐색합니다.
