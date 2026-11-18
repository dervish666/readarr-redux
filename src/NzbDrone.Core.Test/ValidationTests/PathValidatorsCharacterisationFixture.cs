using System;
using System.Collections.Generic;
using System.IO;
using FluentAssertions;
using FluentValidation;
using Moq;
using NUnit.Framework;
using NzbDrone.Common.Disk;
using NzbDrone.Common.EnvironmentInfo;
using NzbDrone.Core.Books;
using NzbDrone.Core.Configuration;
using NzbDrone.Core.RootFolders;
using NzbDrone.Core.Test.Framework;
using NzbDrone.Core.Validation;
using NzbDrone.Core.Validation.Paths;
using NzbDrone.Test.Common;

namespace NzbDrone.Core.Test.ValidationTests
{
    // Pins the observable behaviour (pass/fail, message, error code, property name, severity)
    // of the path validators so the FluentValidation upgrade can be checked against it.
    [TestFixture]
    public class PathValidatorsCharacterisationFixture : CoreTest
    {
        private static readonly string BooksPath = @"C:\Test\Books".AsOsAgnostic();
        private static readonly string BooksChildPath = @"C:\Test\Books\Author".AsOsAgnostic();
        private static readonly string BooksParentPath = @"C:\Test".AsOsAgnostic();
        private static readonly string OtherPath = @"C:\Other".AsOsAgnostic();

        private static List<string> Validate(NzbDronePropertyValidator validator, string path, int id = 1)
        {
            var testValidator = new TestValidator<Author>
            {
                v => v.RuleFor(s => s.Path).SetValidator(validator)
            };

            return testValidator.Validate(new Author { Id = id, Path = path }).Describe();
        }

        [Test]
        public void root_folder_validator()
        {
            Mocker.GetMock<IRootFolderService>()
                .Setup(s => s.All())
                .Returns(new List<RootFolder> { new RootFolder { Path = BooksPath } });

            var subject = Mocker.Resolve<RootFolderValidator>();

            Validate(subject, BooksPath).Should().Equal($"Path | RootFolderValidator | Error | Path '{BooksPath}' is already configured as a root folder");
            Validate(subject, OtherPath).Should().BeEmpty();
            Validate(subject, BooksChildPath).Should().BeEmpty();
            Validate(subject, null).Should().BeEmpty();
        }

        [Test]
        public void root_folder_ancestor_validator()
        {
            Mocker.GetMock<IRootFolderService>()
                .Setup(s => s.All())
                .Returns(new List<RootFolder> { new RootFolder { Path = BooksPath } });

            var subject = Mocker.Resolve<RootFolderAncestorValidator>();

            Validate(subject, BooksParentPath).Should().Equal($"Path | RootFolderAncestorValidator | Error | Path '{BooksParentPath}' is an ancestor of an existing root folder");
            Validate(subject, BooksPath).Should().BeEmpty();
            Validate(subject, OtherPath).Should().BeEmpty();
            Validate(subject, null).Should().BeEmpty();
        }

        [Test]
        public void path_exists_validator()
        {
            Mocker.GetMock<IDiskProvider>().Setup(s => s.FolderExists(BooksPath)).Returns(true);

            var subject = Mocker.Resolve<PathExistsValidator>();

            Validate(subject, BooksPath).Should().BeEmpty();
            Validate(subject, OtherPath).Should().Equal($"Path | PathExistsValidator | Error | Path '{OtherPath}' does not exist");
            Validate(subject, null).Should().Equal("Path | PathExistsValidator | Error | Path '{path}' does not exist");
        }

        [Test]
        public void folder_writable_validator()
        {
            Mocker.GetMock<IDiskProvider>().Setup(s => s.FolderWritable(BooksPath)).Returns(true);

            var subject = Mocker.Resolve<FolderWritableValidator>();

            Validate(subject, BooksPath).Should().BeEmpty();
            Validate(subject, OtherPath).Should().Equal($"Path | FolderWritableValidator | Error | Folder '{OtherPath}' is not writable by user '{Environment.UserName}'");
            Validate(subject, null).Should().Equal("Path | FolderWritableValidator | Error | Folder '{path}' is not writable by user '{user}'");
        }

        [Test]
        public void file_exists_validator()
        {
            Mocker.GetMock<IDiskProvider>().Setup(s => s.FileExists(BooksPath)).Returns(true);

            var subject = Mocker.Resolve<FileExistsValidator>();

            Validate(subject, BooksPath).Should().BeEmpty();
            Validate(subject, OtherPath).Should().Equal($"Path | FileExistsValidator | Error | File '{OtherPath}' does not exist");
            Validate(subject, null).Should().Equal("Path | FileExistsValidator | Error | File '{file}' does not exist");
        }

        [Test]
        public void startup_folder_validator()
        {
            Mocker.GetMock<IAppFolderInfo>().SetupGet(s => s.StartUpFolder).Returns(BooksPath);

            var subject = Mocker.Resolve<StartupFolderValidator>();

            Validate(subject, BooksPath).Should().Equal($"Path | StartupFolderValidator | Error | Path '{BooksPath}' cannot be set to the start up folder");
            Validate(subject, BooksChildPath).Should().Equal($"Path | StartupFolderValidator | Error | Path '{BooksChildPath}' cannot be child of the start up folder");
            Validate(subject, OtherPath).Should().BeEmpty();
            Validate(subject, null).Should().BeEmpty();
        }

        [Test]
        public void recycle_bin_validator()
        {
            Mocker.GetMock<IConfigService>().SetupGet(s => s.RecycleBin).Returns(BooksPath);

            var subject = Mocker.Resolve<RecycleBinValidator>();

            Validate(subject, BooksPath).Should().Equal($"Path | RecycleBinValidator | Error | Path '{BooksPath}' is set to configured recycle bin folder");
            Validate(subject, BooksChildPath).Should().Equal($"Path | RecycleBinValidator | Error | Path '{BooksChildPath}' is child of configured recycle bin folder");
            Validate(subject, OtherPath).Should().BeEmpty();
            Validate(subject, null).Should().BeEmpty();
        }

        [Test]
        public void recycle_bin_validator_without_recycle_bin()
        {
            Mocker.GetMock<IConfigService>().SetupGet(s => s.RecycleBin).Returns(string.Empty);

            Validate(Mocker.Resolve<RecycleBinValidator>(), BooksPath).Should().BeEmpty();
        }

        [Test]
        public void author_path_validator_uses_instance_id()
        {
            Mocker.GetMock<IAuthorService>()
                .Setup(s => s.AllAuthorPaths())
                .Returns(new Dictionary<int, string> { { 5, BooksPath } });

            var subject = Mocker.Resolve<AuthorPathValidator>();

            Validate(subject, BooksPath, 1).Should().Equal($"Path | AuthorPathValidator | Error | Path '{BooksPath}' is already configured for another author");
            Validate(subject, BooksPath, 5).Should().BeEmpty();
            Validate(subject, OtherPath, 1).Should().BeEmpty();
            Validate(subject, null, 1).Should().BeEmpty();
        }

        [Test]
        public void author_ancestor_validator()
        {
            Mocker.GetMock<IAuthorService>()
                .Setup(s => s.AllAuthorPaths())
                .Returns(new Dictionary<int, string> { { 5, BooksChildPath } });

            var subject = Mocker.Resolve<AuthorAncestorValidator>();

            Validate(subject, BooksPath).Should().Equal($"Path | AuthorAncestorValidator | Error | Path '{BooksPath}' is an ancestor of an existing author");
            Validate(subject, BooksChildPath).Should().BeEmpty();
            Validate(subject, OtherPath).Should().BeEmpty();
            Validate(subject, null).Should().BeEmpty();
        }

        [Test]
        public void author_exists_validator()
        {
            Mocker.GetMock<IAuthorService>().Setup(s => s.FindById("existing")).Returns(new Author());

            var subject = Mocker.Resolve<AuthorExistsValidator>();

            Validate(subject, "existing").Should().Equal("Path | AuthorExistsValidator | Error | This author has already been added");
            Validate(subject, "new").Should().BeEmpty();
            Validate(subject, null).Should().BeEmpty();
        }

        [Test]
        public void mapped_network_drive_validator_off_windows()
        {
            PosixOnly();

            var subject = Mocker.Resolve<MappedNetworkDriveValidator>();

            Validate(subject, BooksPath).Should().BeEmpty();
            Validate(subject, null).Should().Equal("Path | MappedNetworkDriveValidator | Error | Mapped Network Drive and Windows Service");
        }

        [Test]
        public void mapped_network_drive_validator_on_windows_service()
        {
            WindowsOnly();

            Mocker.GetMock<IRuntimeInfo>().SetupGet(s => s.IsWindowsService).Returns(true);
            Mocker.GetMock<IDiskProvider>()
                .Setup(s => s.GetMount(It.IsAny<string>()))
                .Returns(Mock.Of<IMount>(m => m.DriveType == DriveType.Network));

            Validate(Mocker.Resolve<MappedNetworkDriveValidator>(), @"Z:\Books").Should().Equal("Path | MappedNetworkDriveValidator | Error | Mapped Network Drive and Windows Service");
        }

        [Test]
        public void system_folder_validator_message()
        {
            PosixOnly();

            var bin = OsInfo.IsOsx ? "/System" : "/bin";
            var child = Path.Combine(bin, "test");

            Validate(new SystemFolderValidator(), bin).Should().Equal($"Path | SystemFolderValidator | Error | Path '{bin}' is set to system folder {bin}");
            Validate(new SystemFolderValidator(), child).Should().Equal($"Path | SystemFolderValidator | Error | Path '{child}' is child of system folder {bin}");
            Validate(new SystemFolderValidator(), BooksPath).Should().BeEmpty();
        }

        [Test]
        public void system_folder_validator_message_override_keeps_placeholder()
        {
            PosixOnly();

            var bin = OsInfo.IsOsx ? "/System" : "/bin";
            var validator = new TestValidator<Author>
            {
                v => v.RuleFor(s => s.Path).SetValidator(new SystemFolderValidator()).WithMessage("Must not be a descendant of '{systemFolder}'")
            };

            validator.Validate(new Author { Path = Path.Combine(bin, "x") }).Describe()
                .Should().Equal($"Path | SystemFolderValidator | Error | Must not be a descendant of '{bin}'");
        }

        [Test]
        public void path_validator()
        {
            var validator = new TestValidator<Author>
            {
                v => v.RuleFor(s => s.Path).IsValidPath()
            };

            validator.Validate(new Author { Path = BooksPath }).Describe().Should().BeEmpty();
            validator.Validate(new Author { Path = "relative" }).Describe().Should().Equal("Path | PathValidator | Error | Invalid Path: 'relative'");
            validator.Validate(new Author { Path = null }).Describe().Should().Equal("Path | PathValidator | Error | Invalid Path: '{path}'");
        }

        [Test]
        public void folder_validator()
        {
            Validate(new FolderValidator(), BooksPath).Should().BeEmpty();
            Validate(new FolderValidator(), "relative").Should().Equal("Path | FolderValidator | Error | Invalid Path: 'relative'");
            Validate(new FolderValidator(), null).Should().Equal("Path | FolderValidator | Error | Invalid Path: '{path}'");
        }

        [Test]
        public void cascade_stop_reports_first_failure_only()
        {
            Mocker.GetMock<IRootFolderService>()
                .Setup(s => s.All())
                .Returns(new List<RootFolder> { new RootFolder { Path = BooksPath } });
            Mocker.GetMock<IConfigService>().SetupGet(s => s.RecycleBin).Returns(BooksPath);

            var validator = new TestValidator<Author>
            {
                v => v.RuleFor(s => s.Path).Cascade(CascadeMode.Stop)
                      .IsValidPath()
                      .SetValidator(Mocker.Resolve<RootFolderValidator>())
                      .SetValidator(Mocker.Resolve<RecycleBinValidator>())
            };

            validator.Validate(new Author { Path = BooksPath }).Describe()
                .Should().Equal($"Path | RootFolderValidator | Error | Path '{BooksPath}' is already configured as a root folder");
        }

        [Test]
        public void default_cascade_reports_every_failure()
        {
            Mocker.GetMock<IRootFolderService>()
                .Setup(s => s.All())
                .Returns(new List<RootFolder> { new RootFolder { Path = BooksPath } });
            Mocker.GetMock<IConfigService>().SetupGet(s => s.RecycleBin).Returns(BooksPath);

            var validator = new TestValidator<Author>
            {
                v => v.RuleFor(s => s.Path)
                      .SetValidator(Mocker.Resolve<RootFolderValidator>())
                      .SetValidator(Mocker.Resolve<RecycleBinValidator>())
            };

            validator.Validate(new Author { Path = BooksPath }).Describe()
                .Should().Equal(
                    $"Path | RootFolderValidator | Error | Path '{BooksPath}' is already configured as a root folder",
                    $"Path | RecycleBinValidator | Error | Path '{BooksPath}' is set to configured recycle bin folder");
        }

        [Test]
        public void failure_exposes_attempted_value_and_placeholders()
        {
            Mocker.GetMock<IRootFolderService>()
                .Setup(s => s.All())
                .Returns(new List<RootFolder> { new RootFolder { Path = BooksPath } });

            var validator = new TestValidator<Author>
            {
                v => v.RuleFor(s => s.Path).SetValidator(Mocker.Resolve<RootFolderValidator>())
            };

            var failure = validator.Validate(new Author { Path = BooksPath }).Errors.Should().ContainSingle().Subject;

            failure.AttemptedValue.Should().Be(BooksPath);
            failure.CustomState.Should().BeNull();
            failure.FormattedMessagePlaceholderValues["PropertyName"].Should().Be("Path");
            failure.FormattedMessagePlaceholderValues["PropertyValue"].Should().Be(BooksPath);
            failure.FormattedMessagePlaceholderValues["path"].Should().Be(BooksPath);
        }
    }
}
