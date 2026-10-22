# Readarr Redux

An unofficial continuation of [Readarr](https://github.com/Readarr/Readarr), the ebook and audiobook manager for Usenet and BitTorrent users, which the Servarr team retired in June 2025. Readarr Redux runs against a metadata source you choose and fixes the bugs that made Readarr lose books.

It is not affiliated with or supported by the Servarr team. Please don't ask for help with it in the Readarr or Servarr Discord.

Source, issues and the full README: https://github.com/dervish666/readarr-redux

## Run it

```
docker run -d --name readarr-redux \
  -p 8787:8787 \
  -e PUID=1000 -e PGID=1000 -e UMASK=022 \
  -v /path/to/config:/config \
  -v /path/to/books:/books \
  -v /path/to/downloads:/downloads \
  dervish/readarr-redux:latest
```

- A drop-in for the linuxserver.io Readarr image: `config.xml` and `readarr.db` sit at the root of `/config`, the app listens on 8787, and `PUID`, `PGID` and `UMASK` work the same way. Back up `/config` before pointing it at an existing install.
- Readarr Redux has no built-in metadata source. Set one in Settings > Metadata Source, for example your own [rreading-glasses](https://github.com/blampe/rreading-glasses).
- Until a login is set up, the web UI asks for a one-time setup code, which is printed in `docker logs readarr-redux` at every start.

## Tags

- `latest`: the newest release.
- `1.2.3` and `1.2`: a release and its line.
- `develop`: every merge to the development branch. Expect rough edges.
- `0.5.0.<build>`: one specific build.

Images are built for `linux/amd64` and `linux/arm64`. The same images are on `ghcr.io/dervish666/readarr`.

## Licence

GPL-3.0, the same as Readarr.
