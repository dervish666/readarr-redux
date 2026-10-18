# Notice

## Modified version of Readarr

Readarr Redux is a modified version of Readarr (https://github.com/Readarr/Readarr). Readarr is copyright 2010-2025 its contributors: Team Readarr and the Servarr team, and the Lidarr, Sonarr and NzbDrone authors whose code it grew from. It is released under the GNU General Public License, version 3.

This version was modified by Sam Castillo and contributors, starting on 2026-10-07. The fork begins after upstream commit `0b79d3000` ("Retirement announcement", 2025-06-27). Every change since then is in the git history, and [CHANGELOG.md](CHANGELOG.md) summarises them by version, with dates. Readarr Redux is released under the same licence; see [LICENSE.md](LICENSE.md).

Several fixes are ports of changes from Sonarr (https://github.com/Sonarr/Sonarr, GPL-3.0). Their commit messages name the Sonarr commit they came from.

From 2026-10-18 the frontend is being moved onto Sonarr's v5 frontend (copyright Team Sonarr, GPL-3.0), starting with its data-fetching hooks, option stores and SignalR listener. Files ported from Sonarr are named, with the Sonarr commit they came from, in the commit that brought them in.

Readarr Redux is not affiliated with, endorsed by or supported by the Readarr or Servarr teams. The app keeps the Readarr name, logo and internal identifiers so existing installs can move over; those belong to their owners.

## Third-party packages

Packages restored from nuget.org and npm keep their own licences. The packages that only ever existed on Servarr's package feeds are kept in `src/Libraries/nuget/`, and [its README](src/Libraries/nuget/README.md) lists each one with its source and licence.

One of them is modified. `ReadarrRedux.FluentMigrator.Runner` 3.3.2.9 repackages `FluentMigrator.Runner.dll` from Servarr's `Servarr.FluentMigrator.Runner` 3.3.2.9 (Apache-2.0, a fork of https://github.com/fluentmigrator/fluentmigrator). The DLL is unchanged. On 2026-10-12 the package metadata was changed to drop the dependencies on database runners Readarr doesn't use, which also stopped Microsoft SQL Server Compact and the Visual C++ 2008 runtime from being shipped.

## No warranty

This program is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public License for more details.
