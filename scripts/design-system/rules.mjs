import postcss from 'postcss';
import ts from 'typescript';

const spacing = new Map([['0.25rem','1'],['0.5rem','2'],['0.75rem','3'],['1rem','4'],['1.25rem','5'],['1.5rem','6'],['2rem','8'],['2.5rem','10'],['3rem','12'],['4rem','16']]);
const spacingProperty = /^(?:(?:margin|padding)(?:-(?:top|right|bottom|left|inline|block)(?:-(?:start|end))?)?|(?:row-|column-)?gap)$/;

export function cssDesign(text, file, {fix = false} = {}) {
  const tree = postcss.parse(text, {from: file}); const errors = [];
  const motionFallbacks = new Set();
  tree.walkAtRules('media', media => {
    if (!/prefers-reduced-motion\s*:\s*reduce/.test(media.params)) return;
    media.walkDecls('animation', decl => {
      if (decl.value.trim() === 'none' && decl.parent.type === 'rule') motionFallbacks.add(decl.parent.selector);
    });
  });
  tree.walkRules(rule => {
    if (rule.selector.split(',').some(selector => /^(?:\*|html|body|button|h[1-6]|ul)$/.test(selector.trim()))) errors.push('DS-006: unscoped global reset/element styling is not a component design system');
  });
  tree.walkDecls(decl => {
    if (decl.prop.startsWith('--')) return; // Owned, named palette/graph tokens.
    if (/^animation(?:-name)?$/.test(decl.prop) && !/^(?:none|initial|inherit)$/.test(decl.value) && !motionFallbacks.has(decl.parent.selector)) errors.push('DS-006: animated components need a matching reduced-motion animation:none rule');
    if (/(?:#[\da-f]{3,8}\b|\brgba?\(|\bhsla?\()/i.test(decl.value.replace(/url\([^)]*\)/g, ''))) {
      if (fix && decl.value === '0 3px 12px rgb(10 30 38 / 7%)') decl.value = 'var(--site-shadow-soft)';
      else errors.push(`DS-001: ${decl.prop} uses a raw color; declare a named site/component token`);
    }
    if (spacingProperty.test(decl.prop)) {
      const normalized = decl.value.replace(/(?<![\w.-])(?:\d*\.)?\d+rem\b/g, value => {
        const key = `${Number(value.slice(0, -3))}rem`;
        return spacing.has(key) ? `var(--site-space-${spacing.get(key)})` : value;
      });
      // Do not rewrite expressions/custom-property names or quoted data.
      if (normalized !== decl.value && !/(?:calc|clamp|min|max|var|url)\(/.test(decl.value)) {
        if (fix) decl.value = normalized;
        else errors.push(`DS-002: ${decl.prop} uses a shared spacing literal; run design:fix`);
      }
    }
  });
  return {text: fix ? tree.toString() : text, errors};
}

export function jsxDesign(text, file, {fix = false} = {}) {
  const tree = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const errors = []; const edits = [];
  function visit(node) {
    if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
      const tag = node.tagName.getText(tree);
      const attrs = new Map(node.attributes.properties.filter(ts.isJsxAttribute).map(a => [a.name.getText(tree), a]));
      const literal = name => {const a = attrs.get(name)?.initializer; return a && ts.isStringLiteral(a) ? a.text : undefined;};
      const add = value => edits.push({start: node.attributes.end, end: node.attributes.end, value: ` ${value}`});
      if (tag === 'button' && !attrs.has('type')) {
        if (fix && !/<form\b/.test(text)) add('type="button"');
        else errors.push('DS-004: native buttons require an explicit type');
      }
      if (literal('target') === '_blank' && !/\b(?:noopener|noreferrer)\b/.test(literal('rel') ?? '')) {
        if (fix && !attrs.has('rel')) add('rel="noreferrer"');
        else errors.push('DS-004: target=_blank requires noopener/noreferrer; dynamic values need review');
      }
      if (tag === 'img' && !attrs.has('alt') && !node.attributes.properties.some(ts.isJsxSpreadAttribute)) errors.push('DS-004: img requires an alt attribute, including alt="" for decoration');
      if (tag === 'button' && ts.isJsxOpeningElement(node)) {
        const meaningful = node.parent.children.filter(c => !ts.isJsxText(c) || c.text.trim());
        const iconOnly = meaningful.length > 0 && meaningful.every(c =>
          (ts.isJsxSelfClosingElement(c) && /^(?:Icon|svg)/.test(c.tagName.getText(tree))) ||
          (ts.isJsxElement(c) && c.openingElement.tagName.getText(tree) === 'svg'));
        if (iconOnly && !attrs.has('aria-label') && !attrs.has('aria-labelledby')) errors.push('DS-004: icon-only button requires an accessible label');
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(tree);
  for (const edit of edits.sort((a,b) => b.start - a.start)) text = text.slice(0, edit.start) + edit.value + text.slice(edit.end);
  return {text, errors};
}
