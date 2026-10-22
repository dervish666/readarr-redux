# Contributing

Bug reports, fixes and pull requests are welcome. For questions and setup help, use [Discussions](https://github.com/dervish666/readarr-redux/discussions). Security problems go through private reporting, see [SECURITY.md](SECURITY.md).

## Building and testing

You need the .NET 10 SDK, Node 22.12 or later (CI uses Node 24) and Yarn 1. Debug builds need nothing else; a Release build also needs a Six Labors licence key (see the README).

```
yarn install --frozen-lockfile
yarn lint
yarn build
dotnet build src/Readarr.sln -p:Configuration=Debug -p:Platform=Posix
TEST_DIR=_tests/net10.0 ./test.sh Linux Unit Test   # or Mac / Windows
```

For frontend work, run `yarn start` for the Vite dev server (port 8757, or `READARR_VITE_PORT`) and a Debug build of the backend. The Debug backend serves the page and forwards the dev server's module requests to `READARR_VITE_DEV_SERVER` (default `http://localhost:8757`), so edits reload in place. A Release build always serves `_output/UI`. `yarn typecheck` writes the `.module.css.d.ts` files first; they are generated, not committed.

Always build the solution, not a single project. Warnings are errors, and StyleCop only loads for a solution build.

## Pull requests

- Unit tests must pass, and a fix should come with a test that fails without it.
- Start the commit subject with `New:` or `Fixed:` when users will notice the change.
- Say in the PR if it adds a database migration. Migrations must work on SQLite and Postgres.
- Add new UI strings to `src/NzbDrone.Core/Localization/Core/en.json` only. Weblate isn't connected to this fork, so the other languages stay as they were.

## Releases (maintainer)

1. Move the CHANGELOG's Unreleased section under a heading for the new version and merge that to `develop`.
2. Tag the merge commit `vX.Y.Z` (a major version below 10) and push the tag. Use `vX.Y.Z-rc.N` for a pre-release.
3. CI builds the tag as version `X.Y.Z.<run number>`, publishes `X.Y.Z`, `X.Y` and `latest` to GHCR and Docker Hub (a pre-release gets only its own tag), updates the Docker Hub description from `distribution/docker/README.md`, and opens a draft GitHub release with the Linux tarballs.
4. Write the release notes from the CHANGELOG and publish the draft.

Docker Hub publishing needs the `DOCKERHUB_USERNAME` and `DOCKERHUB_TOKEN` repository secrets (an access token with Read & Write scope). Without them CI publishes to GHCR only. The `DOCKERHUB_IMAGE` repository variable overrides the image name, `dervish/readarr-redux` by default.

## Licence

Readarr Redux is GPL-3.0. Your contribution is accepted under the same licence (inbound = outbound). There is no CLA.
