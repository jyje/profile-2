# syntax=docker/dockerfile:1
# Build only from scripts/container-context.mjs output, which preserves authored
# dates without transmitting .git, ignored files or credentials to the builder.
FROM node:26.10.0-alpine@sha256:0b36e8c136b94cd4fcf02188228e76c31ad5872eef3fec8cbd2eee500cfd9e80 AS build
WORKDIR /site
RUN apk add --no-cache openssl
COPY . .
ARG SITE_URL
ARG SITE_BASE_URL=/
ARG SITE_CONTENT_MODE=development
ARG LABS_REMOTE_ENTRY=
ARG ALLOW_DIRTY_BUILD=false
ENV SITE_URL=$SITE_URL SITE_BASE_URL=$SITE_BASE_URL SITE_CONTENT_MODE=$SITE_CONTENT_MODE LABS_REMOTE_ENTRY=$LABS_REMOTE_ENTRY
RUN test -n "$SITE_URL" && test "$SITE_BASE_URL" = / && test -f container-revision.json \
    && node -e 'if (require("./container-revision.json").dirty && process.argv[1] !== "true") process.exit(1)' "$ALLOW_DIRTY_BUILD" \
    && npm ci \
    && npm run test:security \
    && npm run lint:design \
    && npm run content:check \
    && npm run build

FROM nginx:1.29-alpine@sha256:5616878291a2eed594aee8db4dade5878cf7edcb475e59193904b198d9b830de
ARG SOURCE_REVISION
LABEL org.opencontainers.image.source="https://github.com/jyje/profile-2" \
      org.opencontainers.image.revision=$SOURCE_REVISION
COPY container/nginx.conf /etc/nginx/nginx.conf
COPY --from=build /site/build/ /usr/share/nginx/html/
COPY --from=build /site/container-revision.json /usr/share/nginx/html/_revision.json
USER 101:101
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -q --spider http://127.0.0.1:8080/healthz || exit 1
ENTRYPOINT ["nginx"]
CMD ["-g", "daemon off;"]
