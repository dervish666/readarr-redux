# Changelog

Changes in Readarr Redux since it forked from Readarr (upstream commit `0b79d3000`, 2025-06-27). Upstream's own history is in the git log.

Versions are `0.5.0.<CI run number>`. Only pushes to `develop` publish an image, so the numbers have gaps. Each entry is the image tag and the day it was built. The commit messages explain each fix in detail.

## Unreleased

- Fixed: qBittorrent 5.2 login with a username and password. qBittorrent API keys are supported, and a release qBittorrent already has is rejected instead of failing the grab.
- Fixed: Torrent clients moved files out of finished torrents even with Remove Completed Downloads off. Those imports now copy or hardlink, so the torrent keeps seeding.
- New: Transmission 4 labels, and a post-import label. Torrents added before an upgrade from Transmission 3 still match by category folder.
- Fixed: Deluge reconnects to its daemon when torrents come back without names, and detects the Label plugin reliably.
- Fixed: SABnzbd 4.1 sorters are checked when testing the client.
- Fixed: HTML-encoded release titles. Nzb.su indexers move to nzb.life (migration 043); the dead NZBCat and SimplyNZBs presets are gone.
- New: Settings > Media Management > Minimum Book Match (advanced), the match percentage needed to import automatically. Default 80, as before.
- Fixed: Plex sign-in in browsers that enforce Cross-Origin-Opener-Policy.
- Removed: Twitter notifications and the Goodreads Owned Books list and notification. Saved ones are dropped at startup with a warning.
- Fixed: Goodreads OAuth signing payloads, which carry the token secret, no longer reach the trace log.
- Fixed: Discord timestamps on systems with a non-Gregorian calendar, Goodreads list failures being swallowed, and Calibre conversion checks that could loop forever.
- Security: `System.Security.Cryptography.Pkcs` pinned to 10.0.13 for GHSA-846f-f764-76mx and GHSA-2fmv-rv2c-59x7.
- The vendored FluentMigrator no longer pulls in every database runner, so Microsoft SQL Server Compact, the Visual C++ 2008 runtime and `Microsoft.Data.SqlClient` are gone from the build and the image. Only SQLite and Postgres were ever used.
- New README, NOTICE.md, SECURITY.md and CONTRIBUTING.md for the fork.
- The header donate button and the Readarr donation tile are gone, since that money went to a retired project. The Sonarr, Radarr, Lidarr and Prowlarr tiles stay.
- System > Status says this is an unofficial fork and links to its source, issues and discussions, with the upstream wiki and repository marked as upstream. The metadata search help, update and API licence links point at the fork.

## 0.5.0.14 (2026-10-12)

- Runs on .NET 10, with the UI on React 18 and the SignalR 10 client.
- macOS: .NET 10 keeps app data in `~/Library/Application Support` instead of `~/.config`. On first start the old `~/.config/Readarr` folder is moved across, so installs no longer start with empty settings.
- Fixed: Retagging an audiobook whose metadata has no original release date crashing.
- Fixed: A failed tag write leaving an imported book file unmapped.
- Fixed: Importing a download with an unknown author crashing.

## 0.5.0.10 (2026-10-12)

- Fixed: Book covers stopping at the first book with no monitored edition.
- Fixed: Works the metadata source always fails on blocking the rest of an author's refresh, and being logged as errors on every refresh.
- Fixed: A metadata outage answering 500 getting past the limit on missing-book lookups.
- Fixed: Indexer connection resets logged as errors on every RSS sync.
- Fixed: Tidying empty folders failing, or skipping without a word, when a folder was already gone.

## 0.5.0.9 (2026-10-09)

- Fixed: Audiobook parts whose track tags clash being skipped without a word. Manual import now warns about them instead of rejecting them.
- Fixed: Filename part numbering hiding a missing part or overriding chapter numbers.
- Fixed: Manual import not flagging mixed editions.

## 0.5.0.8 (2026-10-09)

- Fixed: Merged books moving to another author or losing their monitoring.
- Fixed: Author refresh adding narrators and publishers as new authors.
- Fixed: Author refresh failing with "Can't insert model with existing ID != 0".
- Fixed: Folder rescan failing on a file with no quality.
- Fixed: Upgrades recycling the old book when a new part vanished mid-import.
- Fixed: Commands that give a quality as its id or name failing with a JsonException.
- Fixed: Re-processing a manual import row dropping the chosen edition.

## 0.5.0.7 (2026-10-09)

- Fixed: Books deleted when Goodreads merged them into a new work. Refresh now follows the merge.
- Fixed: Goodreads Series import-list books for existing authors never being added.
- Fixed: Book lookups rewriting cover URLs on cached metadata.

## 0.5.0.6 (2026-10-09)

- New: Settings > Metadata Source page with a Test button. Fresh installs no longer default to the dead `api.bookinfo.club`.
- New: Metadata source health check.
- Fixed: Search, ISBN and ASIN lookups and the Goodreads Series import list bypassing the configured metadata source.
- Fixed: A metadata outage failing every refresh even when a cached answer exists. During an outage search falls back to the last good answer, and refresh keeps the existing data.
- Fixed: Failed searches and ID lookups showing as "no results" or "not found" instead of an outage.
- Fixed: Rate-limited (429) or stalled metadata responses blocking a command thread, or holding an author refresh for hours.
- Fixed: Malformed or empty metadata answers becoming the cached copy, and daily housekeeping deleting the cached copies the fallback relies on.
- Fixed: Metadata IDs above 2,147,483,647 failing to deserialize.
- Fixed: Metadata links, Calibre identifiers and ebook identifiers always labelled as Goodreads, whatever the source.
- Fixed: The source check accepting sources the metadata client can't use, following redirects, reading responses of any size, and failing on URLs with credentials or non-ASCII hosts.
- Fixed: Release dates landing a day early on servers east of UTC.
- Fixed: One bad import-list item or changed-authors call aborting a whole run.

## 0.5.0.5 (2026-10-08)

Security:

- Fixed: SQL injection through the paging sortKey (CVE-2025-50983).
- Fixed: Archive entries written outside the extraction folder (zip-slip).
- Fixed: Forwarded headers bypassing "Disabled for Local Addresses".
- Fixed: Static file and cover requests resolving outside their folders.
- New: Salted PBKDF2 password hashing (220,000 iterations). Older hashes are rehashed on the next login, and host config no longer returns the hash.
- New: Repeated failed logins are throttled.
- New: Existing sessions are signed out when credentials change or the API key is reset.
- Fixed: Password hashes in SQL trace logs and failed-query diagnostics, and Plex client identifiers in logs.
- Fixed: Cover resizing reaching ImageSharp's vulnerable TIFF codec.

Imports and upgrades:

- Fixed: Downloads importing into a different book than the one grabbed, or into any book once the grabbed one was deleted.
- Fixed: Packs being imported as the single book they were grabbed for.
- Fixed: Upgrades deleting or recycling the old files before the new ones were in place and saved, or when a new part was rejected, unidentified or missing.
- Fixed: An upgrade removing a file another book had just imported, and concurrent imports deleting each other's backups.
- Fixed: Searching for a series' first book grabbing later books or omnibus releases from that series.

Other:

- Fixed: Author refreshes hammering a struggling metadata source.
- Fixed: Book refresh crashing when the metadata no longer has the book.
- Fixed: Author merges losing the duplicate author's history.
- Fixed: Failed database updates reporting success.

## 0.5.0.2 (2026-10-07)

The first fork build.

- Fixed: Authors deleted when the metadata source answers 404.
- Fixed: Books deleted because a truncated author works list left them out, or because their lookup returned them under a new id.
- Fixed: Editions with files deleted when the metadata source drops them.
- Fixed: Multi-part upgrades deleting the parts they just imported.
- Fixed: One book's editions breaking release parsing for a whole search.
- Fixed: Stop calling home to Servarr. Sentry, update checks, server-side notifications and the system time check are gone; updates come as new Docker images.
- New: GitHub Actions build and a Docker image at `ghcr.io/dervish666/readarr`.
- Packages that only existed on Servarr's feeds are vendored, so the build no longer needs those feeds. MailKit 4.16.0 and ImageSharp 3.1.12.
