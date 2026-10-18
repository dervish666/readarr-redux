# Browser smoke run

Playwright over the key pages. It fails a test on any console error, uncaught page error, failed request or 4xx/5xx response, even when the test's own checks pass. It is read-only apart from one author refresh.

```sh
npx playwright install chromium   # once
READARR_URL=http://localhost:8787 READARR_API_KEY=... yarn smoke
```

| Variable | Needed | Meaning |
|---|---|---|
| `READARR_URL` | yes | Full URL including any URL base, no trailing slash |
| `READARR_API_KEY` | yes | The instance's API key (Settings, General) |
| `READARR_USERNAME`, `READARR_PASSWORD` | with forms or basic login | Login for the UI |
| `READARR_AUTHOR_SLUG` | no | Author the detail checks open; defaults to the first author |
| `READARR_SCREENSHOT_DIR` | no | Baseline screenshots; defaults to `_output/e2e/screenshots` |

The library needs at least one author with books. Reports, traces and screenshots land in `_output/e2e/`.

## Staging on Tower

The smoke run is meant to point at a second container on Tower running the candidate image against a copy of the real database. The copy must not write anywhere real, so:

1. Copy prod's database with SQLite's online backup, never a move, while prod keeps running:

   ```sh
   mkdir -p /mnt/user/appdata/readarr-staging
   sqlite3 /mnt/cache/appdata/readarr/readarr.db ".backup '/mnt/user/appdata/readarr-staging/readarr.db'"
   cp /mnt/cache/appdata/readarr/config.xml /mnt/user/appdata/readarr-staging/
   sed -i 's#<InstanceName>.*</InstanceName>#<InstanceName>Readarr Staging</InstanceName>#' /mnt/user/appdata/readarr-staging/config.xml
   ```

2. Switch off everything that reaches outside the copy, before the first start:

   ```sh
   sqlite3 /mnt/user/appdata/readarr-staging/readarr.db <<'SQL'
   UPDATE DownloadClients SET Enable = 0;
   UPDATE Indexers SET EnableRss = 0, EnableAutomaticSearch = 0;
   UPDATE ImportLists SET EnableAutomaticAdd = 0, ShouldSearch = 0;
   UPDATE Notifications SET OnGrab = 0, OnUpgrade = 0, OnRename = 0, OnReleaseImport = 0,
     OnHealthIssue = 0, OnDownloadFailure = 0, OnImportFailure = 0, OnBookRetag = 0,
     OnAuthorDelete = 0, OnBookDelete = 0, OnBookFileDelete = 0, OnBookFileDeleteForUpgrade = 0,
     OnApplicationUpdate = 0, OnAuthorAdded = 0;
   INSERT OR REPLACE INTO Config (Key, Value) VALUES
     ('rsssyncinterval', '0'),
     ('enablecompleteddownloadhandling', 'False'),
     ('writeaudiotags', 'no'),
     ('writebooktags', 'no');
   SQL
   ```

   Interactive search stays on, because it only lists releases. The metadata source stays on, because it only writes into the copy.

3. Start it with the books read-only and no downloads mount:

   ```sh
   docker run -d --name readarr-staging --network docknet -p 8789:8787 \
     -e PUID=99 -e PGID=100 -e UMASK=002 -e TZ=Europe/London \
     -v /mnt/user/appdata/readarr-staging:/config \
     -v /mnt/user/books:/books:ro \
     <candidate image>
   ```

Then `READARR_URL=http://192.168.0.190:8789 READARR_API_KEY=<prod key, copied with config.xml> READARR_USERNAME=... READARR_PASSWORD=... yarn smoke`.
