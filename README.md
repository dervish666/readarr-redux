# Readarr Redux

An unofficial continuation of [Readarr](https://github.com/Readarr/Readarr), the ebook and audiobook manager for Usenet and BitTorrent users. The Servarr team retired upstream Readarr in June 2025, after its metadata became unusable and nobody had the time to rebuild it. This fork runs against a metadata source you choose and fixes the bugs that made Readarr lose books.

Readarr Redux is not affiliated with or supported by the Servarr team. Please don't ask for help with it in the Readarr or Servarr Discord, or file its bugs on their trackers.

## Status

- One person ([@dervish666](https://github.com/dervish666)) maintains it for his own library. Issues and pull requests are welcome; replies are best effort.
- The supported install is the Docker image for Linux amd64 and arm64. You can build from source on macOS or Windows, but CI only builds and tests Linux.
- Claude Code wrote most of the changes since the fork, and every fork commit carries a `Claude-Session` trailer.
- The app still calls itself Readarr, and its data folders, database names and assembly names are unchanged, so an existing install can move over (see below).

## You need a metadata source

Upstream's metadata server, `api.bookinfo.club`, is gone, and Readarr Redux has no default.

1. Run [rreading-glasses](https://github.com/blampe/rreading-glasses) yourself, or use a public instance you trust. The public Goodreads-backed instance at `https://api.bookinfo.pro` answered when this was written, but it is shared and may be rate limited.
2. In Settings > Metadata Source, enter the base URL, press Test and save.
3. Until a source is set, adding authors, search and refresh fail, and System > Status shows a health warning.

Don't move an existing library between a Goodreads-backed and a Hardcover-backed source. They use different IDs, so no author or book would match any more.

If the source has an outage, searches fall back to the last good answer it gave, and refreshes leave your authors and books alone instead of deleting them.

## Install with Docker

```
docker run -d --name readarr \
  -p 8787:8787 \
  -e PUID=1000 -e PGID=1000 -e UMASK=022 \
  -v /path/to/config:/config \
  -v /path/to/books:/books \
  -v /path/to/downloads:/downloads \
  ghcr.io/dervish666/readarr:latest
```

The image is a drop-in for the linuxserver.io one: `config.xml` and `readarr.db` sit at the root of `/config`, the app listens on 8787, and `PUID`, `PGID` and `UMASK` work the same way. Tags are `latest`, `develop` and `0.5.0.<build>`. The in-app updater is off; update by pulling a newer image.

## Moving from upstream Readarr

1. Stop upstream Readarr and back up its `/config` folder (`readarr.db`, `config.xml`).
2. Start Readarr Redux on the same `/config`. The database is migrated from schema 040 to 041, which adds salted password hashes.
3. Your first login after that rehashes your password with PBKDF2. Upstream Readarr can't check the new hash, so going back means restoring the backup.
4. Set the metadata source (above), then refresh your authors.

Indexers, download clients, root folders, profiles and Calibre settings carry over unchanged.

## What changed from upstream

The full list is in [CHANGELOG.md](CHANGELOG.md).

- **Metadata.** The source is a setting with a Test button and a health check. Search, ISBN and ASIN lookups, the Goodreads Series import list and refreshes all go through it; only the Goodreads List import list still reads goodreads.com. An outage serves the last good answer instead of failing, and rate limits or a slow source can no longer stall a refresh for hours.
- **Data loss.** Authors, books and editions are no longer deleted when the source answers 404, returns a truncated works list or merges a work into another one (merges are followed). Upgrades no longer remove old files before the new ones are in place.
- **Imports.** Downloads stay matched to the book that was grabbed, packs import as packs, and multi-part audiobooks no longer lose, misnumber or silently skip parts.
- **Security.** Salted PBKDF2 password hashes, login throttling, sessions revoked when credentials change, and fixes for a forwarded-header auth bypass, path traversal in file routes, zip-slip and SQL injection (CVE-2025-50983).
- **Platform.** .NET 10 and React 18. No call-home: Sentry, update checks and server-side notifications are removed.

## Building from source

You need the .NET 10 SDK, Node 20 and Yarn 1.

```
yarn install --frozen-lockfile
yarn build
dotnet build src/Readarr.sln -p:Configuration=Debug -p:Platform=Posix
dotnet _output/net10.0/Readarr.dll -nobrowser -data=/tmp/readarr-dev
```

Then open http://localhost:8787. Restore needs no private feeds; the packages that only existed on Servarr's feeds are vendored in [src/Libraries/nuget](src/Libraries/nuget/README.md). [CONTRIBUTING.md](CONTRIBUTING.md) has the test commands.

The [upstream wiki](https://wiki.servarr.com/readarr) still describes most settings correctly.

## Credits and licence

Readarr is the work of the Readarr and Servarr team and its contributors, and most of this code is theirs. Several security fixes here are ports of [Sonarr](https://github.com/Sonarr/Sonarr) changes.

Readarr Redux is released under the GNU GPL v3, the same as Readarr. See [LICENSE.md](LICENSE.md) and [NOTICE.md](NOTICE.md).
