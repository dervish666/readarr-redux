using System.Collections.Generic;
using System.IO;
using FluentAssertions;
using NUnit.Framework;
using NzbDrone.Common.Disk;
using NzbDrone.Common.EnvironmentInfo;
using NzbDrone.Core.Books;
using NzbDrone.Core.Configuration;
using NzbDrone.Core.Download.Clients.rTorrent;
using NzbDrone.Core.Download.Clients.RTorrent;
using NzbDrone.Core.Notifications.CustomScript;
using NzbDrone.Core.Profiles.Metadata;
using NzbDrone.Core.Profiles.Qualities;
using NzbDrone.Core.RootFolders;
using NzbDrone.Core.Test.Framework;
using NzbDrone.Test.Common;

namespace NzbDrone.Core.Test.ValidationTests
{
    // The same injected validator instances (RootFolderValidator, PathExistsValidator, ...)
    // serve rules on several root types. These tests pin the Core-side consumers.
    [TestFixture]
    public class SharedValidatorRootTypesCharacterisationFixture : CoreTest
    {
        private static readonly string BooksPath = @"C:\Test\Books".AsOsAgnostic();
        private static readonly string OtherPath = @"C:\Other".AsOsAgnostic();

        [SetUp]
        public void Setup()
        {
            Mocker.GetMock<IRootFolderService>()
                .Setup(s => s.All())
                .Returns(new List<RootFolder> { new RootFolder { Path = BooksPath } });
            Mocker.GetMock<IAuthorService>()
                .Setup(s => s.AllAuthorPaths())
                .Returns(new Dictionary<int, string>());
            Mocker.GetMock<IQualityProfileService>().Setup(s => s.Exists(1)).Returns(true);
            Mocker.GetMock<IMetadataProfileService>().Setup(s => s.Exists(1)).Returns(true);
        }

        [Test]
        public void add_author_validator_on_author()
        {
            var subject = Mocker.Resolve<AddAuthorValidator>();

            subject.Validate(new Author { Path = OtherPath, QualityProfileId = 1, MetadataProfileId = 1 }).Describe().Should().BeEmpty();

            subject.Validate(new Author { Path = BooksPath, QualityProfileId = 2, MetadataProfileId = 3 }).Describe().Should().Equal(
                $"Path | RootFolderValidator | Error | Path '{BooksPath}' is already configured as a root folder",
                "QualityProfileId | QualityProfileExistsValidator | Error | Quality Profile does not exist",
                "MetadataProfileId | MetadataProfileExistsValidator | Error | Metadata profile does not exist");

            subject.Validate(new Author { Path = "relative", QualityProfileId = 1, MetadataProfileId = 1 }).Describe().Should().Equal(
                "Path | PathValidator | Error | Invalid Path: 'relative'");
        }

        [Test]
        public void add_author_validator_stops_after_first_path_failure()
        {
            Mocker.GetMock<IConfigService>().SetupGet(s => s.RecycleBin).Returns(BooksPath);

            Mocker.Resolve<AddAuthorValidator>()
                .Validate(new Author { Path = BooksPath, QualityProfileId = 1, MetadataProfileId = 1 })
                .Describe()
                .Should().Equal($"Path | RootFolderValidator | Error | Path '{BooksPath}' is already configured as a root folder");
        }

        [Test]
        public void rtorrent_directory_validator_on_rtorrent_settings()
        {
            Mocker.GetMock<IDiskProvider>().Setup(s => s.FolderExists(OtherPath)).Returns(true);

            var subject = Mocker.Resolve<RTorrentDirectoryValidator>();

            subject.Validate(new RTorrentSettings { Host = "localhost", MusicDirectory = BooksPath }).Describe().Should().Equal(
                $"MusicDirectory | RootFolderValidator | Error | Path '{BooksPath}' is already configured as a root folder");

            subject.Validate(new RTorrentSettings { Host = "localhost", MusicDirectory = OtherPath }).Describe().Should().BeEmpty();

            var missing = @"C:\Missing".AsOsAgnostic();
            subject.Validate(new RTorrentSettings { Host = "localhost", MusicDirectory = missing }).Describe().Should().Equal(
                $"MusicDirectory | PathExistsValidator | Error | Path '{missing}' does not exist");

            // Both When() conditions must hold: remote hosts and empty directories are skipped.
            subject.Validate(new RTorrentSettings { Host = "remote", MusicDirectory = BooksPath }).Describe().Should().BeEmpty();
            subject.Validate(new RTorrentSettings { Host = "127.0.0.1", MusicDirectory = string.Empty }).Describe().Should().BeEmpty();
        }

        [Test]
        public void custom_script_settings_validator()
        {
            PosixOnly();

            var bin = OsInfo.IsOsx ? "/System" : "/bin";
            var script = Path.Combine(bin, "script.sh");

            new CustomScriptSettings { Path = script, Arguments = "x" }.Validate().Errors.Describe().Should().Equal(
                $"Path |  | Error | Must not be a descendant of '{bin}'",
                "Arguments |  | Error | Arguments are no longer supported for custom scripts");

            new CustomScriptSettings { Path = BooksPath }.Validate().IsValid.Should().BeTrue();
        }
    }
}
