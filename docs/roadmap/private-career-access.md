# Approval-gated career document access

Date: 2026-10-17 (Asia/Seoul).
Status: public About preparation implemented and verified locally on 2026-10-18;
authenticated portal, approval, infrastructure deployment, and remote publication
remain future work. See [the local implementation result](../implementation/about-public-access.md).

Detailed source analysis and implementation tracking:
[profile-2 issue #37](https://github.com/jyje/profile-2/issues/37), recorded on
2026-10-18 (Asia/Seoul). The issue proposes the About/Portfolio/Resume hierarchy,
documents current static-data and CI coupling, and defines migration gates.
No implementation, protection, or deployment is claimed by opening the issue.

## Agreed direction

- Keep introduction, portfolio, blog, and wiki public in Docusaurus.
- Require Google or GitHub sign-in, an access request, and the owner's approval before serving private career documents.
- Host the request-management frontend and backend on the owner's Raspberry Pi.
- Plan Resume, Selected CV, and Full CV as protected documents, consistent with the preceding discussion. Confirm this complete scope before removing public routes.
- Keep interview records, evidence, and application-specific documents private in career-application. Reader approval does not grant access to those working records.

This document contains architecture and delivery criteria only, not private career material. Recording the roadmap does not authorize deployments, account creation, public issues, history rewriting, commits, or pushes.

## Proposed boundary

```text
Public Docusaurus site
  -> Open career access portal
     -> Google / GitHub sign-in
     -> Request access -> Owner review -> Scoped, expiring grant
     -> Backend authorization -> Protected document response

Private career-application exports
  -> Explicit document selection -> Private document store on Raspberry Pi
```

The Raspberry Pi serves the portal frontend and API under one HTTPS origin, avoiding cross-site session dependencies. Docusaurus links to this portal using normal navigation. Do not use Module Federation or an iframe to establish the security boundary. Hostname, framework, authentication library, ingress, and database remain implementation decisions.

Authentication identifies the requester; approval separately authorizes a particular document set. Follow default-deny authorization and check permissions on every document request, as described by [OWASP](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html).

## Reader and administrator experience

1. A public career-document link explains the approval requirement before opening the portal.
2. A visitor signs in with either provider and submits a short purpose and optional organization. Avoid collecting unnecessary personal information.
3. The visitor sees pending, approved, declined, expired, or revoked status in Korean or English.
4. The owner reviews requests, selects document variants and locale scope, and explicitly selects an expiry before approval. No indefinite grant by default.
5. Approved users view only the granted documents. Download permission is a separate explicit choice; start with viewing only unless the owner enables downloads.
6. The owner can revoke grants immediately for subsequent requests. Expiry or revocation cannot retract content already viewed, copied, printed, or downloaded.

Request state and grant state are distinct: pending/approved/declined requests, active/expired/revoked grants. Approval creates an expiring grant; a historical approval alone never permits access. Repeated requests are deduplicated, with a defined re-request policy after expiry or denial.

The admin interface includes a request queue, document-version catalog, grant scope/expiry editor, revocation, and a minimal audit view. Enforce owner identity in the backend through a configured provider subject/account ID, not a display name or client-side email check. Prefer VPN-restricted admin access and MFA on the owner's identity-provider accounts. Reader sign-in must never imply administrator access.

## Security and privacy requirements

- Use a maintained authentication library, not custom OAuth protocol handlers. Google uses [OpenID Connect](https://developers.google.com/identity/openid-connect/openid-connect); GitHub uses its documented [authorization-code web flow](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps). Validate state, callback destinations, and provider identity; use PKCE and OIDC nonce where applicable.
- Identify accounts by provider plus stable subject/account ID. Do not automatically merge Google and GitHub accounts by matching email addresses. Handle hidden or missing GitHub email without assuming a verified address.
- Request only identity scopes needed by the portal, never repository access. Retain provider credentials only if necessary; keep secrets server-side and out of logs, URLs, browser storage, and public builds.
- Use server-managed revocable sessions with Secure, HttpOnly cookies, a deliberate SameSite policy, session rotation, logout invalidation, and CSRF protection on state-changing endpoints.
- Authenticate and authorize document metadata, previews, file responses, HEAD/range requests, and downloads. Private files must not be exposed by the static web server, predictable asset paths, or a public object-store URL.
- Check document ID/version, grant, expiry, session, and requested action server-side. Default-deny on lookup or dependency failures. Use private/no-store caching and prevent CDN, service-worker, analytics, or prefetch copies of protected responses. Robots/noindex is supplementary, not authorization.
- Never put private document bodies, career datasets, source maps containing private data, or protected PDFs into Pages bundles, search, graph data, sitemaps, or public CI artifacts.
- Rate-limit login attempts and access requests. Bound and sanitize request text. Do not log OAuth tokens, document bodies, or full request reasons in notifications.
- Before launch, define collection purposes, retention/deletion periods, grant/audit retention, backup deletion behavior, and a contact route. Publish clear privacy information. No claim of legal compliance follows from this roadmap.
- Notifications are reminders only: no approve-by-GET or unauthenticated notification links. Suggested first channel is email with minimal metadata and an authenticated admin link; provider and channel remain undecided.

## Delivery phases and gates

### Phase 0: Inventory and decisions

- [ ] Inventory all public Resume/CV routes, PDFs, career YAML, generated data, translations, bundles, CI artifacts, and repository history.
- [ ] Define an explicit public portfolio dataset separate from private career data. Do not remove public portfolio facts indiscriminately.
- [ ] Confirm protected document scope, default access duration, download policy, domain, notification channel, and private service repository.
- [ ] Define threat model and review existing cluster ingress/authentication infrastructure read-only before choosing dependencies.

Gate: approved disclosure matrix and a migration inventory. Do not claim existing public copies become private retroactively.

### Phase 1: Private document pipeline

- [ ] Keep career-application authoritative for private exports; select and version only documents intended for approved readers.
- [ ] Store those exports outside the public web root with checksums and protected metadata.
- [ ] Prepare encrypted off-device backups, restore verification, and secret handling. Keep working evidence out of the reader catalog.

Gate: a selected export can be restored and is inaccessible without the backend.

### Phase 2: Login, requests, and grants

- [ ] Implement Google and GitHub sign-in, sessions, identity mapping, logout, and owner-role checks.
- [ ] Implement request lifecycle, scoped expiring grants, approval/denial, revocation, and minimal audit events.
- [ ] Add reader status screens and the admin queue with explicit expiry/document selection.

Gate: anonymous, pending, denied, expired, revoked, and wrong-document requests all fail authorization. Both providers work without automatic identity merging.

### Phase 3: Serving and deployment

- [ ] Serve protected views/downloads with per-request authorization and cache protections.
- [ ] Deploy portal frontend/backend and persistent state on Raspberry Pi with HTTPS, readiness checks, restart/reboot recovery, and disk-space monitoring.
- [ ] Fail closed during database, disk, or network failures; show a useful unavailable/retry message without disclosing private data.
- [ ] Configure minimal notifications, privacy information, retention, backups, and owner recovery.

Gate: restore, reboot, outage, expiry, revocation, and direct-file access tests pass; no public fallback copy exists.

### Phase 4: Public-site cutover

- [ ] Replace public document links with localized portal entry points; maintain the public portfolio and concise introduction.
- [ ] Remove private payloads and exports from public source/build flows before claiming protection. Old document routes may redirect to a request explanation, never to a public copy.
- [ ] Test both locales, GitHub Pages project base paths, slash variants, keyboard/mobile use, and portal-unavailable behavior.
- [ ] Scan clean public build outputs and archives for private content. Run publication regression tests and review historic exposure separately.

Gate: the owner completes an end-to-end approval/revocation exercise and approves the visibility migration. Do not restore public CVs as an outage rollback.

## Verification and closeout

Test authorization across document IDs, locales, versions, request methods, expiry, revoked sessions, and concurrent approval/revocation. Include OAuth callback tampering, account confusion, CSRF, admin escalation, cache leakage, and notification abuse.

Record test evidence, actual deployed versions, restore results, and owner acceptance in the implementation plan. Any PDF/layout change requires bilingual page-by-page export review under the existing career rules. Complete the plan checklist and a focused cleanup commit only with the applicable commit authorization; deployment and push require their own authorization.

## Current result

The public About refactor replaces document rendering with localized manual
LinkedIn inquiry instructions and safe legacy pages. Private career sources,
generation, tags, and public PDF CI dependencies have been disconnected from the
public source tree after verified preservation. Original files and archives remain
in ignored local storage for the future private migration. Portfolio uses three existing public
articles. This does not implement Google/GitHub login, request storage, owner
approval, protected document delivery, or any backend. The owner authorized local
implementation and closeout commits only. No push or deployment was performed;
the live site and historical exposure are unchanged.
