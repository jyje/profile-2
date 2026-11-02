# Static development container

Production remains the public GitHub Pages build from `main`. The `dev` branch
publishes an ARM64 static image after source, runtime and screenshot verification.
It uses development content visibility, not a long-running Node/HMR server.
The container currently serves at `/`; the separate Pages build verifies the
`/profile-2/` project base path. Do not reuse the development binary for promotion.

## Prepare and build

Use a clean, full-history checkout with Node 26 and OpenSSL. The TLS regression
suite creates and removes ephemeral certificates; it never reads operational keys.

```sh
npm ci
npm run test:container
node scripts/container-context.mjs > /tmp/profile2-context.json
```

The JSON identifies an owned temporary directory. Build that directory, not the
working repository. The context includes only allowlisted Git-tracked sources,
adds Git-derived dates using the existing versioned formatter, and excludes Git
metadata, private career data, ignored drafts and credentials. Originals are not
modified. New uncommitted files have no fabricated date. Shallow history fails.
Tracked changes require `--allow-dirty` for a local-only context; its revision
metadata is marked dirty and the Dockerfile rejects it unless the caller also
explicitly sets `ALLOW_DIRTY_BUILD=true`. Such images must never be published.

```sh
context=$(node -p 'JSON.parse(require("fs").readFileSync("/tmp/profile2-context.json")).destination')
docker build --platform linux/arm64 --tag profile2-validation:dev \
  --build-arg SITE_URL=https://example.invalid \
  --build-arg SITE_CONTENT_MODE=development \
  --build-arg SOURCE_REVISION="$(git rev-parse HEAD)" "$context"
docker run -d --name profile2-validation --read-only \
  --tmpfs /tmp:rw,noexec,nosuid,size=32m --cap-drop ALL \
  --security-opt no-new-privileges -p 127.0.0.1:3038:8080 profile2-validation:dev
npm run verify:container
docker rm -f profile2-validation
```

The final image runs Nginx as UID/GID 101 on port 8080 and contains static output
only. Build tools, Node, Git and source files stay outside the runtime image.
`/healthz` checks that the index exists, and `/_revision.json` records the source
revision and dirty flag. Static requests use `no-store` in this development image.
Missing routes remain HTTP 404, with the site's error document.

## Publication and promotion

Set repository variables `DEV_SITE_URL` (an HTTPS origin) and optionally
`DEV_LABS_REMOTE_ENTRY`. An empty remote leaves the existing unavailable/retry
experience; it does not add authentication or provision a Labs backend. The value
`local` is suitable only for local fixture verification, not a deployed image.

`publish-development-image.yaml` accepts trusted `dev` pushes or an explicit
dispatch on `dev`. It does not run publication for pull requests or forks.
Repository access is read-only except package write in this trusted job. Registry
login happens after validation. It pushes a commit-SHA tag, verifies private
package visibility and records its immutable digest in a narrow artifact. Tags
can be moved; deploy the digest from the artifact, not `latest` or the SHA tag.
No cluster credential is passed to this workflow.

Keep GitOps manifests, ingress/access policy and pull credentials in the cluster
workspace. Use one desired-state writer: reviewed digest updates or the existing
image updater with deliberately scoped ownership, never both. A container build
does not establish an internal/VPN boundary. Verify that boundary before exposing
development notes. No private Resume/CV portal is supplied by this image.

PR checks target both `dev` and `main`. Regular dependency PRs continue to target
the default branch; back-integrate production/security fixes into `dev`. Promote
through a reviewed `dev` to `main` PR with public-mode gates, and keep Pages
manual dispatch restricted to `main`. Before claiming deployment complete, verify
the running digest/revision, Pod health, both locales, notes visibility, browser
behavior and rollback through the actual GitOps deployment.
