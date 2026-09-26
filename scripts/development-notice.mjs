export function developmentNotice(locale) {
  return locale === 'en'
    ? '> [!warning] Development-only document\n> This document matches `.docignore`. It is visible in local development and excluded from the public GitHub Pages build.\n\n'
    : '> [!warning] 개발 전용 문서\n> 이 문서는 `.docignore`에 해당하여 공개 GitHub Pages 배포에서 제외됩니다. 로컬 개발 환경에서만 표시됩니다.\n\n';
}

export function splitDevelopmentNotice(body) {
  const match = body.match(/^\s*> \[!warning\] (?:개발 전용 문서|Development-only document)\r?\n(?:>[^\n]*(?:\n|$))+\s*/);
  return {hasNotice: Boolean(match), body: match ? body.slice(match[0].length) : body};
}

export function withDevelopmentNotice(markdown, locale) {
  const match = markdown.match(/^(---[ \t]*\r?\n[\s\S]*?\r?\n---[ \t]*(?:\r?\n|$))/);
  const front = match?.[1] ?? '';
  const {body} = splitDevelopmentNotice(markdown.slice(front.length));
  return `${front}\n${developmentNotice(locale)}${body}`;
}
