# syntax=docker/dockerfile:1

# Readarr image. Drop-in for the linuxserver.io container: config.xml and readarr.db live at the root of /config,
# the app listens on 8787, and PUID / PGID / UMASK behave the same way.
#
#   docker build --build-arg READARRVERSION=0.5.0.1 -t readarr .
#   docker run -d -p 8787:8787 -e PUID=99 -e PGID=100 -v /path/to/appdata:/config readarr
#
# The build stages run on the build host's architecture and cross-publish for the target one, so an arm64 image
# never runs Node or the .NET SDK under emulation.

FROM --platform=$BUILDPLATFORM node:20-bookworm-slim AS frontend
WORKDIR /src
COPY package.json yarn.lock .yarnrc tsconfig.json ./
RUN yarn install --frozen-lockfile --network-timeout 120000
COPY frontend ./frontend
RUN yarn build --env production

FROM --platform=$BUILDPLATFORM mcr.microsoft.com/dotnet/sdk:6.0.428-1-bookworm-slim AS backend
ARG TARGETARCH
# Read by src/Directory.Build.props. Keep Major below 10 and Revision at or below 10000, or the app runs in development mode.
ARG READARRVERSION=0.5.0.0
ARG BUILD_SOURCEBRANCHNAME=local
WORKDIR /src
COPY . .
COPY --from=frontend /src/_output/UI /ui
# Updates come from new images, so the in-app updater (Readarr.Update) is not shipped
RUN case "$TARGETARCH" in \
        amd64) rid=linux-x64 ;; \
        arm64) rid=linux-arm64 ;; \
        *) echo "Unsupported architecture: $TARGETARCH" >&2; exit 1 ;; \
    esac \
    && ./build.sh --backend -r "$rid" -f net6.0 \
    && cp -r /ui _output/UI \
    && ./build.sh --packages -r "$rid" -f net6.0 \
    && mv "_artifacts/$rid/net6.0/Readarr" /readarr \
    && rm -rf /readarr/Readarr.Update

FROM debian:bookworm-slim
ARG READARRVERSION=0.5.0.0
ARG SOURCE_URL=""

# The self-contained app needs the .NET native dependencies, plus the system SQLite: the vendored
# System.Data.SQLite package ships no Linux library.
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        ca-certificates libc6 libgcc-s1 libgssapi-krb5-2 libicu72 libsqlite3-0 libssl3 libstdc++6 tzdata zlib1g \
    && rm -rf /var/lib/apt/lists/*

COPY --from=backend /readarr /app/bin
COPY distribution/docker/entrypoint.sh /usr/local/bin/readarr-entrypoint

# DeploymentInfoProvider reads /app/bin/../package_info. UpdateMethod=Docker keeps the in-app updater off.
RUN printf 'PackageVersion=%s\nPackageAuthor=%s\nUpdateMethod=Docker\nBranch=develop\n' \
        "$READARRVERSION" "${SOURCE_URL:+[$SOURCE_URL]($SOURCE_URL)}" > /app/package_info \
    && chmod 0755 /usr/local/bin/readarr-entrypoint

LABEL org.opencontainers.image.title="Readarr" \
      org.opencontainers.image.version="$READARRVERSION" \
      org.opencontainers.image.source="$SOURCE_URL" \
      org.opencontainers.image.licenses="GPL-3.0"

ENV PUID=1000 \
    PGID=1000 \
    UMASK=022 \
    HOME=/config

EXPOSE 8787
VOLUME /config
ENTRYPOINT ["/usr/local/bin/readarr-entrypoint"]
