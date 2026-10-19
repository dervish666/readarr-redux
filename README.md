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

- **Metadata.** The source is a setting with a Test button and a health check. Search, ISBN and ASIN lookups, the Goodreads Series import list and refreshes all go through it. Only the Goodreads List import list still reads goodreads.com, with an API key built into upstream Readarr, so it stops working if Goodreads revokes that key. An outage serves the last good answer instead of failing, and rate limits or a slow source can no longer stall a refresh for hours.
- **Data loss.** Authors, books and editions are no longer deleted when the source answers 404, returns a truncated works list or merges a work into another one (merges are followed). A book the source can't find is deleted only when a refresh at least 12 hours after the first miss still can't find it, and never when it has files or was added or edited by hand. Upgrades no longer remove old files before the new ones are in place. Folder clean-up and the recycle bin never go through symlinks or junctions, and never delete a folder that still holds hidden files.
- **Imports.** Downloads stay matched to the book that was grabbed, packs import as packs, and multi-part audiobooks no longer lose, misnumber or silently skip parts. A download counts as imported only when every audio file in it has imported, so Remove Completed Downloads can't delete parts that didn't. Anything left over keeps the download in the queue as Import Failed for you to sort out by hand.
- **Security.** Salted PBKDF2 password hashes, login throttling, sessions revoked when credentials change, and fixes for a forwarded-header auth bypass, path traversal in file routes, zip-slip and SQL injection (CVE-2025-50983). With no login set up, only local requests get in. Covers must be real raster images and are served so a browser can't run them.
- **Platform.** .NET 10 and React 18. No call-home: Sentry, update checks and server-side notifications are removed.
- **Download clients.** qBittorrent 5.2 login and API keys, Transmission 4 labels, Deluge daemon reconnects, SABnzbd 4.1 sorter checks, and torrents left intact when Remove Completed Downloads is off.

### Goodreads Bookshelf and auth.servarr.com

The Goodreads Bookshelf import list and notification sign their Goodreads requests through `https://auth.servarr.com/v1/goodreads/sign`, a service the Servarr team still runs. Using either one sends your Goodreads OAuth token and token secret to that service on every call. Nothing else in Readarr Redux talks to Servarr. If you don't want that, don't add a Goodreads Bookshelf list or notification. The Goodreads Owned Books list and notification, and Twitter notifications, are gone because the APIs behind them no longer exist.

### Who can make Readarr fetch URLs

Indexers, download clients, notifications, import lists and the metadata source all take URLs, and Readarr will request whatever they point at, including addresses on your LAN. That is by design: anyone with the API key or a login is an administrator. Keep both private.

Cover URLs are different. The metadata source chooses them, so Readarr only fetches covers from public addresses, or from the metadata source's own host. A cover server on any other LAN address is refused, and covers over 20 MB are dropped.

### First run: the setup code

Until a login is set up, the web UI answers only the local network, and only after you enter a one-time setup code. Readarr writes the code to its console and log every time it starts (`docker logs readarr`, or `logs/readarr.txt` in the data folder). Without it, a reverse proxy on the same machine that sends no `X-Forwarded-For` header would make every visitor look local and hand them the API key. Once the code is in, Readarr asks you for a username and password, and after that the code isn't needed.

To run with no login on purpose, set `<AuthenticationNoneConfirmed>True</AuthenticationNoneConfirmed>` in `config.xml` (or `READARR__AUTH__NONECONFIRMED=true`) and restart. That drops the setup code and the setup prompt, and a same-machine proxy that strips the client address then lets anyone in, so System > Status keeps warning about it.

## Building from source

You need the .NET 10 SDK, Node 20.19 or later and Yarn 1.

```
yarn install --frozen-lockfile
yarn build
dotnet build src/Readarr.sln -p:Configuration=Debug -p:Platform=Posix
dotnet _output/net10.0/Readarr.dll -nobrowser -data=/tmp/readarr-dev
```

Then open http://localhost:8787. Restore needs no private feeds; the packages that only existed on Servarr's feeds are vendored in [src/Libraries/nuget](src/Libraries/nuget/README.md). [CONTRIBUTING.md](CONTRIBUTING.md) has the test commands.

ImageSharp stays on 3.1.12 for now. Once it moves to 4.x, a Release build needs `SIXLABORS_LICENSE_KEY` set to the full contents of a Six Labors licence file; CI reads it from the repository secret of that name.

The [upstream wiki](https://wiki.servarr.com/readarr) still describes most settings correctly.

## Credits and licence

Readarr is the work of the Readarr and Servarr team and its contributors, and most of this code is theirs. Several security fixes here are ports of [Sonarr](https://github.com/Sonarr/Sonarr) changes.

Readarr Redux is released under the GNU GPL v3, the same as Readarr. See [LICENSE.md](LICENSE.md) and [NOTICE.md](NOTICE.md).
