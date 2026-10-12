# Vendored NuGet packages

`src/NuGet.config` uses this folder as a package source. It holds the packages that were only ever published to Servarr's Azure Artifacts feeds, at exactly the versions pinned in `src/Directory.Packages.props`. Everything else restores from nuget.org.

Apart from `readarrredux.fluentmigrator.runner` (below), the files are byte-identical to the copies on the Servarr feeds as of 2026-10-07 (SHA-512 checked against both the local NuGet cache and a fresh download).

| Package | Version | Source feed | Licence |
|---|---|---|---|
| `Servarr.FluentMigrator`, `.Abstractions`, `.Runner.Core`, `.Runner.SQLite`, `.Runner.Postgres`, `.Extensions.Postgres` | 3.3.2.9 | `https://pkgs.dev.azure.com/Servarr/Servarr/_packaging/FluentMigrator/nuget/v3/index.json` | Apache-2.0 (fork of github.com/fluentmigrator/fluentmigrator) |
| `ReadarrRedux.FluentMigrator.Runner` | 3.3.2.9 | Built here, see below | Apache-2.0 |
| `System.Data.SQLite.Core.Servarr` | 1.0.115.5-18 | `https://pkgs.dev.azure.com/Servarr/Servarr/_packaging/SQLite/nuget/v3/index.json` | Public domain (system.data.sqlite.org, sqlite.org/copyright.html) |
| `Mono.Posix.NETStandard` | 5.20.1.34-servarr22 | `https://pkgs.dev.azure.com/Servarr/Servarr/_packaging/Mono.Posix.NETStandard/nuget/v3/index.json` | MIT (github.com/mono/mono, `LICENSE`) |
| `coverlet.collector`, `coverlet.core` | 3.0.4-preview.27.ge7cb7c3b40 | `https://pkgs.dev.azure.com/Servarr/coverlet/_packaging/coverlet-nightly/nuget/v3/index.json` | MIT (fork of github.com/coverlet-coverage/coverlet) |

## ReadarrRedux.FluentMigrator.Runner

`Servarr.FluentMigrator.Runner` holds `FluentMigrator.Runner.dll`, which Readarr needs (`AddFluentMigratorCore`, `MigrationRunner`, the version loader), but its package depends on every database runner FluentMigrator 3.3 supports. One of them, `Servarr.FluentMigrator.Runner.SqlServerCe`, carries Microsoft SQL Server Compact 4.0 (`System.Data.SqlServerCe.dll`, `sqlce*40.dll`) and the Visual C++ 2008 runtime (`msvcr90.dll`). Those are Microsoft redistributables whose licence doesn't allow republishing them or shipping them on Linux, and the SQL Server runner pulled in `Microsoft.Data.SqlClient`.

`ReadarrRedux.FluentMigrator.Runner` is the same `FluentMigrator.Runner.dll` (netstandard2.0 build, byte-identical, SHA-256 `3d7045be4980ebf916e550712659ed1dd0dbcc50c1d710d4e926c671f6816a72`) with a nuspec that depends only on `Servarr.FluentMigrator`, `.Runner.Core`, `.Runner.SQLite` and `.Runner.Postgres`. The DLL still references the other runner assemblies, but only from FluentMigrator's obsolete code (`MigrationProcessorFactoryProvider`, `MigrationGeneratorFactory` and the `RunnerContext` path that registers every database). Readarr never calls any of it, and .NET only loads an assembly when code that uses it runs. Readarr only migrates SQLite and Postgres (`MigrationController`).

The Servarr runner packages for Db2, Firebird, Hana, MySql, Oracle, Redshift, SqlAnywhere, SqlServer and SqlServerCe, and the Oracle, SqlAnywhere and SqlServer extensions, were removed from this folder on 2026-10-12. They remain in git history.

To rebuild it, unzip `lib/netstandard2.0/FluentMigrator.Runner.{dll,xml}` from `Servarr.FluentMigrator.Runner` 3.3.2.9, put them next to the nuspec from the existing package, and `dotnet pack` a throwaway project that sets `NuspecFile` and `IncludeBuildOutput=false`.

Moving to the official FluentMigrator packages from nuget.org (`FluentMigrator.Runner.Core` 6.x or later, as Sonarr did) removes this folder's FluentMigrator packages altogether.

## Other notes

The `dotnet-bsd-crossbuild` feed is gone too. `./build.sh --enable-extra-platforms` (FreeBSD and linux-x86) restored those runtime packs from there (nuget.org has neither) and no longer works.

To add or bump a package here, drop the `.nupkg` in this folder and add its id to the `vendored` entry under `packageSourceMapping` in `src/NuGet.config`.
