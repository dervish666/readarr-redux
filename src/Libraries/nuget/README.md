# Vendored NuGet packages

`src/NuGet.config` uses this folder as a package source. It holds the packages that were only ever published to Servarr's Azure Artifacts feeds, at exactly the versions pinned in `src/Directory.Packages.props`. Everything else restores from nuget.org.

The files are byte-identical to the copies on the Servarr feeds as of 2026-10-07 (SHA-512 checked against both the local NuGet cache and a fresh download).

| Package | Version | Source feed | Licence |
|---|---|---|---|
| `Servarr.FluentMigrator`, `.Abstractions`, `.Runner`, `.Runner.Core`, `.Runner.SQLite`, `.Runner.Postgres` and the other `.Runner.*` / `.Extensions.*` packages that `.Runner` depends on | 3.3.2.9 | `https://pkgs.dev.azure.com/Servarr/Servarr/_packaging/FluentMigrator/nuget/v3/index.json` | Apache-2.0 (fork of github.com/fluentmigrator/fluentmigrator) |
| `System.Data.SQLite.Core.Servarr` | 1.0.115.5-18 | `https://pkgs.dev.azure.com/Servarr/Servarr/_packaging/SQLite/nuget/v3/index.json` | Public domain (system.data.sqlite.org, sqlite.org/copyright.html) |
| `Mono.Posix.NETStandard` | 5.20.1.34-servarr22 | `https://pkgs.dev.azure.com/Servarr/Servarr/_packaging/Mono.Posix.NETStandard/nuget/v3/index.json` | MIT (github.com/mono/mono, `LICENSE`) |
| `coverlet.collector`, `coverlet.core` | 3.0.4-preview.27.ge7cb7c3b40 | `https://pkgs.dev.azure.com/Servarr/coverlet/_packaging/coverlet-nightly/nuget/v3/index.json` | MIT (fork of github.com/coverlet-coverage/coverlet) |

One exception to the licence column: `servarr.fluentmigrator.runner.sqlserverce` also carries Microsoft SQL Server Compact 4.0 and the Visual C++ 2008 runtime (`runtimes/win-*`, `System.Data.SqlServerCe.dll`). Those are Microsoft redistributables, not Apache-2.0. Upstream FluentMigrator ships the same files in `FluentMigrator.Runner.SqlServerCe` on nuget.org. Readarr never loads them, but `Servarr.FluentMigrator.Runner` depends on the package, so restore needs it. Moving to the official FluentMigrator packages (audit plan item 5.6) removes this folder.

The `dotnet-bsd-crossbuild` feed is gone too. `./build.sh --enable-extra-platforms` (FreeBSD and linux-x86) restored those runtime packs from there (nuget.org has neither) and no longer works.

To add or bump a package here, drop the `.nupkg` in this folder and add its id to the `vendored` entry under `packageSourceMapping` in `src/NuGet.config`.
