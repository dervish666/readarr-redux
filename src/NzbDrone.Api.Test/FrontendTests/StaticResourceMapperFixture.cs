using System.Collections.Generic;
using System.IO;
using FluentAssertions;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Moq;
using NLog;
using NUnit.Framework;
using NzbDrone.Common.Disk;
using NzbDrone.Common.EnvironmentInfo;
using NzbDrone.Core.Backup;
using NzbDrone.Core.Configuration;
using NzbDrone.Test.Common;
using Readarr.Http.Frontend;
using Readarr.Http.Frontend.Mappers;

namespace NzbDrone.Api.Test.FrontendTests
{
    [TestFixture]
    public class StaticResourceMapperFixture : TestBase
    {
        private string _startUpFolder;
        private string _appDataFolder;

        [SetUp]
        public void Setup()
        {
            _startUpFolder = Path.Combine(TempFolder, "bin");
            _appDataFolder = Path.Combine(TempFolder, "appdata");

            Mocker.GetMock<IAppFolderInfo>().SetupGet(s => s.StartUpFolder).Returns(_startUpFolder);
            Mocker.GetMock<IAppFolderInfo>().SetupGet(s => s.AppDataFolder).Returns(_appDataFolder);
            Mocker.GetMock<IConfigFileProvider>().SetupGet(s => s.UiFolder).Returns("UI");
            Mocker.GetMock<IBackupService>().Setup(s => s.GetBackupFolder()).Returns(Path.Combine(_appDataFolder, "Backups"));
        }

        [Test]
        public void should_map_content_inside_ui_folder()
        {
            Mocker.Resolve<StaticResourceMapper>().Map("/Content/styles.css")
                .Should().Be(Path.Combine(_startUpFolder, "UI", "Content", "styles.css"));
        }

        [TestCase("/Content/../../secret.css")]
        [TestCase("/Content/../../../outside/secret.js")]
        public void should_not_map_content_outside_ui_folder(string resourceUrl)
        {
            var mapper = Mocker.Resolve<StaticResourceMapper>();

            mapper.CanHandle(resourceUrl).Should().BeTrue();
            mapper.Map(resourceUrl).Should().BeNull();
        }

        [Test]
        public void should_not_map_manifest_outside_ui_folder()
        {
            Mocker.Resolve<ManifestMapper>().Map("/Content/Images/Icons/manifest/../../../../../config").Should().BeNull();
        }

        [Test]
        public void should_not_map_browserconfig_outside_ui_folder()
        {
            Mocker.Resolve<BrowserConfig>().Map("/Content/Images/Icons/browserconfig/../../../../../config").Should().BeNull();
        }

        [Test]
        public void should_map_media_cover_inside_media_cover_folder()
        {
            Mocker.Resolve<MediaCoverMapper>().Map("/MediaCover/1/poster.jpg")
                .Should().Be(Path.Combine(_appDataFolder, "MediaCover", "1", "poster.jpg"));
        }

        [Test]
        public void should_not_map_media_cover_outside_media_cover_folder()
        {
            Mocker.Resolve<MediaCoverMapper>().Map("/MediaCover/../readarr.db").Should().BeNull();
        }

        [Test]
        public void should_not_map_backup_outside_backup_folder()
        {
            var mapper = Mocker.Resolve<BackupFileMapper>();
            var resourceUrl = "/backup/../readarr_backup_v0.5.0.1_2026.01.01_00.00.00.zip";

            mapper.CanHandle(resourceUrl).Should().BeTrue();
            mapper.Map(resourceUrl).Should().BeNull();
        }

        [Test]
        public void should_not_serve_file_outside_folder_even_if_it_exists()
        {
            Mocker.GetMock<IDiskProvider>()
                .Setup(s => s.FileExists(It.IsAny<string>(), It.IsAny<System.StringComparison>()))
                .Returns(true);

            Mocker.Resolve<StaticResourceMapper>().GetResponse("/Content/../../secret.css").Should().BeNull();

            ExceptionVerification.ExpectedWarns(1);
        }

        [TestCase("/MediaCover/1/poster.html")]
        [TestCase("/MediaCover/Books/1/cover.svg")]
        [TestCase("/MediaCover/Books/1/cover.htm?lastWrite=1")]
        public void should_not_serve_cached_cover_that_is_not_an_image(string resourceUrl)
        {
            Mocker.GetMock<IDiskProvider>()
                .Setup(s => s.FileExists(It.IsAny<string>(), It.IsAny<System.StringComparison>()))
                .Returns(true);

            Mocker.Resolve<MediaCoverMapper>().GetResponse(resourceUrl).Should().BeNull();
        }

        [Test]
        public void controller_should_send_nosniff_and_sandbox_csp_with_images()
        {
            var mapper = new Mock<IMapHttpRequestsToDisk>();
            mapper.Setup(s => s.CanHandle(It.IsAny<string>())).Returns(true);
            mapper.Setup(s => s.GetResponse(It.IsAny<string>())).Returns(new FileContentResult(new byte[] { 0xFF, 0xD8, 0xFF }, "image/jpeg"));

            var controller = new StaticResourceController(new List<IMapHttpRequestsToDisk> { mapper.Object }, LogManager.GetLogger("test"))
            {
                ControllerContext = new ControllerContext { HttpContext = new DefaultHttpContext() }
            };

            controller.Index("MediaCover/1/poster.jpg");

            var headers = controller.Response.Headers;
            headers["X-Content-Type-Options"].ToString().Should().Be("nosniff");
            headers["Content-Security-Policy"].ToString().Should().Contain("default-src 'none'").And.Contain("sandbox");
        }

        [TestCase("Content/../../secret.css")]
        [TestCase("Content/..%2f..%2fsecret.css")]
        [TestCase("Content/..%5C..%5Csecret.css")]
        [TestCase("Content/..\\..\\secret.css")]
        public void controller_should_reject_dot_dot_segments(string path)
        {
            var mapper = new Mock<IMapHttpRequestsToDisk>();
            mapper.Setup(s => s.CanHandle(It.IsAny<string>())).Returns(true);
            mapper.Setup(s => s.GetResponse(It.IsAny<string>())).Returns(new OkResult());

            var controller = new StaticResourceController(new List<IMapHttpRequestsToDisk> { mapper.Object }, LogManager.GetLogger("test"));

            controller.Index(path).Should().BeOfType<NotFoundResult>();
            mapper.Verify(v => v.GetResponse(It.IsAny<string>()), Times.Never());
        }
    }
}
