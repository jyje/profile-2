# Vue Labs integration

The independent repository is `https://github.com/jyje/labs`. This host uses
`@module-federation/enhanced/runtime` 2.9.1, not a Docusaurus webpack federation
plugin. The remote uses official `@module-federation/vite` 1.22.1.

## Local development

1. In the sibling `labs` checkout, run `npm ci` with Node 26.
2. Run `LABS_PUBLIC_ORIGIN=http://<LAN-IP>:5174 npm run dev` there.
3. In profile-2, run `npm run dev`. The all-locale server defaults
   `LABS_REMOTE_ENTRY` to `local`; the browser uses its own hostname on port 5174.
4. Visit `/labs` and `/en/labs` on port 3000. The existing language preference
   can redirect a directly entered URL; use the navbar language menu to switch.

For a single-locale Docusaurus server, set `LABS_REMOTE_ENTRY=local` explicitly.
Changing only remote code may require refreshing the host page.

## Deployment

Normal builds have no remote URL by default and show a configured fallback.
Set `LABS_REMOTE_ENTRY` to a trusted HTTPS entry file in deployment configuration.
Do not accept it from query strings, cookies, user content, or local storage.
Remote code runs with host-page privileges. Shadow DOM is CSS isolation only.
No private API keys or provider tokens belong in this setting or mount props.

The host mounts only in a browser effect, so SSG does not fetch the remote.
Contract version 1 exposes `mount(element, {locale, theme})` and returns
`update(options)` and `unmount()`. Every route cleanup calls `unmount()`.
Loading times out after 12 seconds. Missing configuration, remote failures, and
incompatible contracts leave the site navigation usable. Retrying a failed
entry uses a new URL to avoid the browser's failed-ESM cache. A failed nested
chunk may still require refreshing the page after deployment is repaired.

## Sample boundary

The localized MDX pages use `wrapperClassName: site-labs-page` and disable the
table of contents. Only this wrapper opts out of Docusaurus reading-width and
outer gutters. The remote fills its mount element and receives the inherited
`--labs-min-height` CSS property for the area below the navbar. Other document
pages keep their existing layout. The loading and error surfaces fill the same
area as the loaded application.

The Vue app is a mock, not real authentication or authorization. The pending,
approved, temporary, and admin roles are explicit UI fixtures. No model request
is sent, and the sample accepts no API keys. Production limits must be enforced
by a backend, independently of frontend controls.

Both repositories override the DTS plugin's `adm-zip` to 0.6.1 to address the
advisories reported by npm audit. Remote type generation is disabled for this
manual, versioned mount contract. Keep the override until the upstream range is
patched; do not downgrade federation packages to satisfy npm audit.
