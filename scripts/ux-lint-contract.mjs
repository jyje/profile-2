// UX-001 is deliberately independent of the implementation's CSS tokens.
// Changing these reviewed coordinates is a design decision, not a baseline refresh.
export const breadcrumbRule = {
  id: 'UX-001', gutter: 16, tolerance: 0.75,
  home: {x: 10.234375, y: 6.109375, width: 17.59375, height: 17.59375},
  widths: [390, 864, 920, 1222, 1728], themes: ['light', 'dark'], locales: ['ko', 'en'],
  routes: [
    'wiki/', 'wiki/d/argo-cd/', 'wiki/_tag-archives/', 'wiki/_tag-archives/kubernetes/',
    'blog/', 'blog/kcsa-kubernetes-and-cloud-native-security-associate/',
    'blog/capa-certified-argo-project-associate/', 'blog/widearth-digital-twins-platforms-at-maxst/',
    'blog/archive/', 'blog/authors/', 'blog/_tag-archives/kubernetes/',
    'about/', 'about/portfolio/', 'about/resume/', 'about/selected-cv/', 'about/cv/',
    'tags/', 'tags/kubernetes/', 'search/?q=kubernetes', 'labs/',
  ],
};

export function breadcrumbViolations(g) {
  const rule = breadcrumbRule;
  const errors = [];
  const check = (name, actual, expected) => {
    if (!Number.isFinite(actual) || Math.abs(actual - expected) > rule.tolerance) {
      errors.push(`${name}: ${actual} != ${expected} (+/-${rule.tolerance}px)`);
    }
  };
  if (g.count !== 1) errors.push(`breadcrumb count: ${g.count} != 1`);
  if (g.frames !== 1) errors.push(`shared frame count: ${g.frames} != 1`);
  check('pane-relative nav x', g.nav?.x - g.paneLeft, rule.gutter);
  check('navbar-relative nav y', g.nav?.y - g.navbarBottom, rule.gutter);
  check('home x', g.home?.x - g.nav?.x, rule.home.x);
  check('home y', g.home?.y - g.nav?.y, rule.home.y);
  check('home width', g.home?.width, rule.home.width);
  check('home height', g.home?.height, rule.home.height);
  if (g.overflow) errors.push('horizontal overflow');
  if (g.inHero) errors.push('breadcrumb nested in hero');
  return errors;
}
