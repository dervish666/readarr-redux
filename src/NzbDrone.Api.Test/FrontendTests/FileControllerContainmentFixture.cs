using System.IO;
using FluentAssertions;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Moq;
using NUnit.Framework;
using NzbDrone.Common.Disk;
using NzbDrone.Common.EnvironmentInfo;
using NzbDrone.Test.Common;
using Readarr.Api.V1.Logs;
using Readarr.Api.V1.MediaCovers;

namespace NzbDrone.Api.Test.FrontendTests
{
    // The routes constrain these file names, but the actions must not rely on that: a
    // backslash is a separator on Windows and reaches the action decoded from %5C.
    [TestFixture]
    public class FileControllerContainmentFixture : TestBase
    {
        private string _appDataFolder;

        [SetUp]
        public void Setup()
        {
            _appDataFolder = Path.Combine(TempFolder, "appdata");

            Mocker.GetMock<IAppFolderInfo>().SetupGet(s => s.AppDataFolder).Returns(_appDataFolder);

            Mocker.GetMock<IDiskProvider>()
                .Setup(s => s.FileExists(It.IsAny<string>()))
                .Returns(true);

            Mocker.GetMock<IDiskProvider>()
                .Setup(s => s.GetFileSize(It.IsAny<string>()))
                .Returns(100);
        }

        [Test]
        public void should_serve_author_cover_inside_cover_folder()
        {
            var controller = Mocker.Resolve<MediaCoverController>();
            controller.ControllerContext = new ControllerContext { HttpContext = new DefaultHttpContext() };

            var result = controller.GetAuthorMediaCover(1, "poster.jpg");

            result.Should().BeOfType<PhysicalFileResult>()
                .Which.FileName.Should().Be(Path.Combine(_appDataFolder, "MediaCover", "1", "poster.jpg"));

            controller.Response.Headers["X-Content-Type-Options"].ToString().Should().Be("nosniff");
            controller.Response.Headers["Content-Security-Policy"].ToString().Should().Contain("sandbox");
        }

        [TestCase("../../readarr.db.jpg")]
        [TestCase("..\\..\\readarr.db.jpg")]
        [TestCase("sub/poster.jpg")]
        public void should_not_serve_author_cover_with_a_path_in_the_name(string filename)
        {
            Mocker.Resolve<MediaCoverController>().GetAuthorMediaCover(1, filename).Should().BeOfType<NotFoundResult>();
        }

        [TestCase("../../../readarr.db.jpg")]
        [TestCase("..\\..\\..\\readarr.db.jpg")]
        public void should_not_serve_book_cover_with_a_path_in_the_name(string filename)
        {
            Mocker.Resolve<MediaCoverController>().GetBookMediaCover(1, filename).Should().BeOfType<NotFoundResult>();
        }

        [Test]
        public void should_serve_log_file_inside_log_folder()
        {
            var result = Mocker.Resolve<LogFileController>().GetLogFileResponse("readarr.txt");

            result.Should().BeOfType<PhysicalFileResult>()
                .Which.FileName.Should().Be(Path.Combine(_appDataFolder, "logs", "readarr.txt"));
        }

        [TestCase("../config.xml.txt")]
        [TestCase("..\\config.xml.txt")]
        [TestCase("readarr.txt/../../config.xml")]
        public void should_not_serve_log_file_with_a_path_in_the_name(string filename)
        {
            Mocker.Resolve<LogFileController>().GetLogFileResponse(filename).Should().BeOfType<NotFoundResult>();
        }
    }
}
