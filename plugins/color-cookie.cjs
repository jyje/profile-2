// Restore the user's cookie before Docusaurus chooses the initial color mode.
// Docusaurus persists its own choice in namespaced localStorage, so the cookie
// is copied there first and kept in sync with subsequent theme changes.
module.exports = function colorCookiePlugin(context) {
  const storageKey = 'theme' + context.siteStorage.namespace;
  const script = [
    '(function () {',
    '  var cookieName = "jyje_color_mode";',
    '  var storageKey = ' + JSON.stringify(storageKey) + ';',
    '  var pair = document.cookie.split("; ").find(function (part) { return part.startsWith(cookieName + "="); });',
    '  var saved = pair ? pair.slice(cookieName.length + 1) : null;',
    '  var query = new URLSearchParams(window.location.search).get("docusaurus-theme");',
    '  if (query === "light" || query === "dark") saved = null;',
    '  if (saved === "light" || saved === "dark") {',
    '    document.documentElement.setAttribute("data-theme", saved);',
    '    document.documentElement.setAttribute("data-theme-choice", saved);',
    '    try { window.localStorage.setItem(storageKey, saved); } catch (error) {}',
    '  } else { saved = null; }',
    '  var observer = new MutationObserver(function () {',
    '    var choice = document.documentElement.getAttribute("data-theme-choice");',
    '    if (choice !== "light" && choice !== "dark") return;',
    '    var secure = window.location.protocol === "https:" ? "; Secure" : "";',
    '    document.cookie = cookieName + "=" + choice + "; Max-Age=31536000; Path=/; SameSite=Lax" + secure;',
    '  });',
    '  observer.observe(document.documentElement, {attributes: true, attributeFilter: ["data-theme-choice"]});',
    '})();',
  ].join('\n');

  return {
    name: 'jyje-color-cookie',
    injectHtmlTags() {
      return {headTags: [{tagName: 'script', innerHTML: script}]};
    },
  };
};
