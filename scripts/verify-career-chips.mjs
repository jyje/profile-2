import assert from 'node:assert/strict';

// Check rendered dimensions, not CSS declarations: a wrapped group heading must
// not stretch its neighboring chips, in screen or print layouts.
export async function verifyCareerChips(page, {requireWrappedHeading = false} = {}) {
  const result = await page.evaluate(() => {
    const groups = [...document.querySelectorAll('[data-career-document="cv"] dl > div')];
    return groups.map(group => {
      const heading = group.querySelector('dt');
      const headingStyle = heading && getComputedStyle(heading);
      return {
        name: heading?.textContent,
        wrapped: heading && heading.getBoundingClientRect().height > parseFloat(headingStyle.lineHeight) * 1.5,
        chips: [...group.querySelectorAll('dd > span')].map(chip => {
          const style = getComputedStyle(chip);
          const naturalHeight = ['lineHeight', 'paddingTop', 'paddingBottom', 'borderTopWidth', 'borderBottomWidth']
            .reduce((height, property) => height + parseFloat(style[property]), 0);
          return {text: chip.textContent, height: chip.getBoundingClientRect().height, naturalHeight};
        }),
      };
    }).filter(group => group.chips.length);
  });
  assert.ok(result.length > 0, 'CV skill chip fixtures must exist');
  if (requireWrappedHeading) assert.ok(result.some(group => group.wrapped), 'Print fixture must include a multiline skill heading');
  for (const group of result) for (const chip of group.chips) {
    assert.ok(Number.isFinite(chip.naturalHeight), `Invalid line height for ${chip.text}`);
    assert.ok(Math.abs(chip.height - chip.naturalHeight) <= 1,
      `${group.name} / ${chip.text}: stretched chip (${chip.height}px, expected ${chip.naturalHeight}px)`);
  }
  return result;
}
