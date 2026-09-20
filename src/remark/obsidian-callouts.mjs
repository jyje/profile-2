// Obsidian callouts (`> [!note] Title`) -> Docusaurus admonitions.
// Emits `containerDirective` nodes, which Docusaurus' built-in admonitions plugin then renders.
const TYPE_MAP = {
  note: 'note',
  seealso: 'note',
  example: 'note',
  quote: 'note',
  cite: 'note',
  abstract: 'info',
  summary: 'info',
  tldr: 'info',
  info: 'info',
  todo: 'info',
  question: 'info',
  help: 'info',
  faq: 'info',
  tip: 'tip',
  hint: 'tip',
  important: 'tip',
  success: 'tip',
  check: 'tip',
  done: 'tip',
  warning: 'warning',
  caution: 'warning',
  attention: 'warning',
  danger: 'danger',
  error: 'danger',
  failure: 'danger',
  fail: 'danger',
  missing: 'danger',
  bug: 'danger',
};

const CALLOUT = /^\[!([\w-]+)\][+-]?[ \t]*([^\n]*)(?:\n|$)/;

function transform(node) {
  if (!node.children) return;
  node.children = node.children.map((child) => {
    transform(child);
    return child.type === 'blockquote' ? toAdmonition(child) : child;
  });
}

function toAdmonition(quote) {
  const first = quote.children[0];
  const text = first?.type === 'paragraph' ? first.children[0] : undefined;
  if (text?.type !== 'text') return quote;
  const m = text.value.match(CALLOUT);
  if (!m) return quote;

  const type = TYPE_MAP[m[1].toLowerCase()] ?? 'note';
  const title = m[2].trim();
  text.value = text.value.slice(m[0].length);
  if (!text.value) first.children.shift();

  const children = first.children.length ? quote.children : quote.children.slice(1);
  if (title) {
    children.unshift({
      type: 'paragraph',
      data: {directiveLabel: true},
      children: [{type: 'text', value: title}],
    });
  }
  return {type: 'containerDirective', name: type, attributes: {}, children};
}

export default function obsidianCallouts() {
  return (tree) => transform(tree);
}
