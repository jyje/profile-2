function runLocalePreference({defaultLocale, localeBaseUrls, cookiePath}, {
  window,
  document,
  navigator,
  fetch,
} = globalThis) {
  const cookieName = 'jyje_locale';
  const localeNames = Object.keys(localeBaseUrls);
  const currentLocation = window.location;
  const userAgent = navigator.userAgent || '';

  // Static HTML always stays at its requested URL for clients without JS.
  if (navigator.webdriver || /bot|crawl|spider|slurp|preview|facebookexternalhit|embedly|telegram|whatsapp|discord|curl|wget|python-requests|postman|insomnia|headless|lighthouse/i.test(userAgent)) {
    return;
  }

  function localeForLanguage(language) {
    const normalized = String(language).toLowerCase();
    return localeNames.find((locale) =>
      normalized === locale.toLowerCase() || normalized.startsWith(`${locale.toLowerCase()}-`),
    );
  }

  function rememberSelection(event) {
    const link = event.target?.closest?.('a[lang]');
    if (!link?.closest('.navbar')) return;
    const selected = localeForLanguage(link.getAttribute('lang'));
    if (!selected) return;
    const secure = currentLocation.protocol === 'https:' ? '; Secure' : '';
    document.cookie = `${cookieName}=${selected}; Max-Age=31536000; Path=${cookiePath}; SameSite=Lax${secure}`;
  }

  document.addEventListener('click', rememberSelection, true);
  document.addEventListener('auxclick', rememberSelection, true);

  const savedCookie = document.cookie.split(';').map((part) => part.trim())
    .find((part) => part.startsWith(`${cookieName}=`));
  const savedLocale = savedCookie?.slice(cookieName.length + 1);
  const languages = [...(navigator.languages || []), navigator.language].filter(Boolean);
  const preferredLocale = localeNames.includes(savedLocale)
    ? savedLocale
    : languages.map(localeForLanguage).find(Boolean) || defaultLocale;

  // Following an in-site link is an explicit route choice, including a link
  // from an English fallback page to its Korean source document.
  if (document.referrer) {
    try {
      if (new URL(document.referrer).origin === currentLocation.origin) return;
    } catch (error) {
      // An invalid referrer does not prevent normal locale detection.
    }
  }

  const currentLocale = localeNames
    .sort((left, right) => localeBaseUrls[right].length - localeBaseUrls[left].length)
    .find((locale) => currentLocation.pathname.startsWith(localeBaseUrls[locale]));
  if (!currentLocale || currentLocale === preferredLocale) return;

  const suffix = currentLocation.pathname.slice(localeBaseUrls[currentLocale].length);
  const targetPath = localeBaseUrls[preferredLocale] + suffix;

  // A counterpart may not exist for every blog tag or imported document.
  fetch(targetPath, {method: 'HEAD', credentials: 'same-origin'})
    .then((response) => {
      if (response.ok) {
        currentLocation.replace(targetPath + currentLocation.search + currentLocation.hash);
      }
    })
    .catch(() => {});
}

module.exports = function localePreferencePlugin(context) {
  const {defaultLocale, locales, localeConfigs} = context.i18n;
  const name = 'jyje-locale-preference';
  if (locales.length < 2 || !localeConfigs[defaultLocale]) return {name};

  const localeBaseUrls = Object.fromEntries(
    locales.map((locale) => [locale, localeConfigs[locale].baseUrl]),
  );
  const settings = {
    defaultLocale,
    localeBaseUrls,
    cookiePath: localeBaseUrls[defaultLocale],
  };
  const script = `(${runLocalePreference.toString()})(${JSON.stringify(settings).replaceAll('<', '\\u003c')});`;

  return {
    name,
    injectHtmlTags() {
      return {headTags: [{tagName: 'script', innerHTML: script}]};
    },
  };
};

module.exports.runLocalePreference = runLocalePreference;
