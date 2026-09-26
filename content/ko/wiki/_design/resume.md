---
sidebar_position: 1
---

# 이력서와 상세 CV

## 문서의 역할

[1페이지 이력서](/about/resume)는 핵심 경력과 기술을 빠르게 검토하는 요약본입니다. [상세 CV](/about/cv)는 경력, 프로젝트, 학력, 기술, 자격증, 활동, 논문과 언어 정보를 모두 보여줍니다. [포트폴리오](./portfolio.md)는 프로젝트 근거와 구현 내용을 연결합니다.

## 원본 데이터와 템플릿 {#data-contract}

- 경력 사실: `data/resume.ko.yml`, `data/resume.en.yml`
- 요약본 선택: `data/career-layout.yml`의 항목·세부 목록 인덱스와 언어별 소개
- 1페이지 템플릿: `src/components/ResumeSummary/`
- 상세 CV 템플릿: `src/components/Resume/`
- 문서별 CSS module과 공통 `src/css/career-print.css`

새 경력이나 수치는 확인된 원본에만 추가합니다. 화면에 맞추려고 텍스트를 자동으로 자르거나 글꼴을 자동 축소하지 않습니다. 선택 인덱스가 유효하지 않으면 테스트가 실패합니다. 자격증의 취득·만료 날짜는 원본 그대로 표시하며 현재 유효함을 추정하지 않습니다.

## 인쇄

두 페이지의 **인쇄 / PDF 저장** 버튼은 브라우저 인쇄를 엽니다. A4, 배율 100%, 배경 그래픽 켜짐을 권장합니다. 수동 인쇄의 브라우저 머리글·바닥글은 끕니다. 자동 내보내기는 같은 페이지를 사용하며 CV에만 페이지 번호를 넣습니다.

## 검증 {#validation-resume-lint}

```sh
npm run typecheck
npm run test:content
npm run dev
# 별도 터미널
npm run export:pdf
```

최초 1회 `npx playwright install chromium`이 필요합니다. 결과는 Git에서 제외된 `output/pdf/`에 생성됩니다. `PDF_BASE_URL`로 전체 언어를 제공하는 정적 서버와 프로젝트 하위 경로를 지정할 수 있습니다.

내보내기는 두 언어 이력서의 1페이지, CV의 2페이지 이상, 모든 페이지의 A4 크기를 검사합니다. CI는 실제 GitHub Pages 하위 경로에서 링크·태그·CV 앵커·모바일 오버플로도 확인합니다. 페이지 수만으로 가독성을 보장하지 않으므로 PDF의 모든 페이지를 이미지로 렌더링하여 잘림, 겹침, 빈 페이지와 한글 글꼴을 검토합니다.

## 콘텐츠 연결

경력의 태그는 [공통 태그](/tags)를 통해 블로그·위키와 연결됩니다. 태그의 경력 링크는 요약본에서 생략되지 않는 상세 CV 앵커를 가리킵니다. 본문 사이의 관계는 [문서 그래프](../graph.mdx)에서 탐색합니다.
