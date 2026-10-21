// Block macros: a fenced block whose body is plain text, not a YAML list.
//
//   ```anatomy
//   /img/figures/raspberry-pi
//   ```
//
// `'''anatomy` ... `'''` is accepted as the same block. normalizeMacroFences() rewrites it to a backtick fence,
// keeping the line count so line numbers stay valid, and leaves anything inside a real code fence alone.

// A root-relative static directory: segments of letters, digits, ".", "_" and "-", no "..", no query or hash.
const SEGMENT = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;

function parseAnatomy(text) {
  const lines = String(text).split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (lines.length !== 1) {
    throw new Error('anatomy takes exactly one line: the figure directory, for example /img/figures/raspberry-pi');
  }
  const segments = lines[0].replace(/\/+$/, '').split('/');
  if (segments[0] !== '' || segments.length < 2 || !segments.slice(1).every((segment) => SEGMENT.test(segment) && segment !== '..' && segment !== '.')) {
    throw new Error(`anatomy path must be a root-relative static directory like /img/figures/raspberry-pi, got "${lines[0]}"`);
  }
  return {path: segments.join('/')};
}

const macros = {
  anatomy: {parse: parseAnatomy},
};

function normalizeMacroFences(text) {
  const lines = String(text).split('\n');
  let fence;
  for (let index = 0; index < lines.length; index++) {
    const line = lines[index];
    const ticks = line.match(/^\s*(`{3,}|~{3,})/);
    if (fence) {
      if (ticks && ticks[1][0] === fence.char && ticks[1].length >= fence.length && !line.replace(/^\s*[`~]+/, '').trim()) fence = undefined;
      continue;
    }
    if (ticks) { fence = {char: ticks[1][0], length: ticks[1].length}; continue; }
    const open = line.match(/^(\s*)'''([a-z][a-z-]*)\s*(\r?)$/);
    if (!open || !Object.hasOwn(macros, open[2])) continue;
    let end = -1;
    for (let cursor = index + 1; cursor < lines.length; cursor++) {
      if (/^\s*'''\s*\r?$/.test(lines[cursor])) { end = cursor; break; }
      if (/^\s*(`{3,}|~{3,})/.test(lines[cursor])) break;
    }
    if (end < 0) continue;
    lines[index] = `${open[1]}\`\`\`${open[2]}${open[3]}`;
    lines[end] = lines[end].replace(/'''/, '```');
    index = end;
  }
  return lines.join('\n');
}

module.exports = {macros, normalizeMacroFences};
