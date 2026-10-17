using System;
using System.Collections.Generic;
using System.IO;
using System.IO.Abstractions;
using System.Linq;
using FizzWare.NBuilder;
using FluentAssertions;
using Moq;
using NUnit.Framework;
using NzbDrone.Common.Disk;
using NzbDrone.Common.EnvironmentInfo;
using NzbDrone.Common.Http;
using NzbDrone.Core.Books;
using NzbDrone.Core.Books.Events;
using NzbDrone.Core.MediaCover;
using NzbDrone.Core.Messaging.Events;
using NzbDrone.Core.Test.Framework;
using NzbDrone.Test.Common;

namespace NzbDrone.Core.Test.MediaCoverTests
{
    [TestFixture]
    public class MediaCoverServiceFixture : CoreTest<MediaCoverService>
    {
        private Author _author;
        private Book _book;
        private Edition _edition;
        private HttpResponse _httpResponse;

        [SetUp]
        public void Setup()
        {
            Mocker.SetConstant<IAppFolderInfo>(new AppFolderInfo(Mocker.Resolve<IStartupContext>()));

            _author = Builder<Author>.CreateNew()
                .With(v => v.Id = 2)
                .With(v => v.Metadata.Value.Images = new List<MediaCover.MediaCover> { new MediaCover.MediaCover(MediaCoverTypes.Poster, "") })
                .Build();

            _edition = Builder<Edition>.CreateNew()
                .With(v => v.Id = 8)
                .With(v => v.Images = new List<MediaCover.MediaCover> { new MediaCover.MediaCover(MediaCoverTypes.Cover, "") })
                .With(v => v.Monitored = true)
                .Build();

            _book = Builder<Book>.CreateNew()
                .With(v => v.Id = 4)
                .With(v => v.Editions = new List<Edition> { _edition })
                .Build();

            _httpResponse = new HttpResponse(null, new HttpHeader(), "");
            Mocker.GetMock<IHttpClient>().Setup(c => c.Get(It.IsAny<HttpRequest>())).Returns(_httpResponse);

            GivenDownloadedCoverBytes(new byte[] { 0xFF, 0xD8, 0xFF, 0xE0, 0, 0x10, 0x4A, 0x46, 0x49, 0x46, 0, 1 });
        }

        private void GivenDownloadedCoverBytes(byte[] bytes)
        {
            var path = GetTempFilePath();
            File.WriteAllBytes(path, bytes);

            Mocker.GetMock<IDiskProvider>()
                  .Setup(v => v.OpenReadStream(It.IsAny<string>()))
                  .Returns(() => File.OpenRead(path));
        }

        [TestCase(".html")]
        [TestCase(".svg")]
        [TestCase(".htm")]
        [TestCase("")]
        [TestCase(".jpg?width=300")]
        public void should_store_and_serve_non_image_extensions_as_jpg(string extension)
        {
            var covers = new List<MediaCover.MediaCover>
                {
                    new MediaCover.MediaCover
                    {
                        Url = "http://dummy.com/test" + extension,
                        CoverType = MediaCoverTypes.Cover
                    }
                };

            Subject.ConvertToLocalUrls(6, MediaCoverEntity.Book, covers);

            covers.Single().Url.Should().Be("/MediaCover/Books/6/cover.jpg");
            Subject.GetCoverPath(6, MediaCoverEntity.Book, MediaCoverTypes.Cover, extension).Should().EndWith("cover.jpg");
        }

        [TestCase(".jpg")]
        [TestCase(".JPG")]
        [TestCase(".jpeg")]
        [TestCase(".png")]
        [TestCase(".gif")]
        [TestCase(".webp")]
        public void should_keep_image_extensions_so_cached_covers_still_match(string extension)
        {
            Subject.GetCoverPath(6, MediaCoverEntity.Book, MediaCoverTypes.Cover, extension).Should().EndWith("cover" + extension);
        }

        [Test]
        public void should_discard_downloaded_cover_that_is_not_an_image()
        {
            _author.Metadata.Value.Images = new List<MediaCover.MediaCover> { new MediaCover.MediaCover(MediaCoverTypes.Poster, "http://dummy.com/poster.html") };

            GivenDownloadedCoverBytes(System.Text.Encoding.UTF8.GetBytes("<html><script>fetch('/initialize.json')</script></html>"));

            Mocker.GetMock<ICoverExistsSpecification>()
                  .Setup(v => v.AlreadyExists(It.IsAny<DateTime?>(), It.IsAny<long?>(), It.IsAny<string>()))
                  .Returns(false);

            Mocker.GetMock<IBookService>()
                  .Setup(v => v.GetBooksByAuthor(It.IsAny<int>()))
                  .Returns(new List<Book>());

            Subject.HandleAsync(new AuthorRefreshCompleteEvent(_author));

            Mocker.GetMock<IHttpClient>()
                  .Verify(v => v.DownloadFile(It.Is<HttpRequest>(r => r.Url.FullUri == "http://dummy.com/poster.html" && r.MaxResponseLength == CoverImageFormat.MaxLength && r.PublicAddressesOnly), It.Is<string>(f => f.EndsWith("poster.jpg"))), Times.Once());

            Mocker.GetMock<IHttpClient>()
                  .Verify(v => v.Get(It.Is<HttpRequest>(r => r.MaxResponseLength == CoverImageFormat.MaxLength && r.PublicAddressesOnly)), Times.Once());

            Mocker.GetMock<IDiskProvider>()
                  .Verify(v => v.DeleteFile(It.Is<string>(f => f.EndsWith("poster.jpg"))), Times.Once());

            Mocker.GetMock<IDiskProvider>()
                  .Verify(v => v.FileSetLastWriteTime(It.IsAny<string>(), It.IsAny<DateTime>()), Times.Never());

            ExceptionVerification.ExpectedWarns(1);
        }

        [TestCase(new byte[] { 0xFF, 0xD8, 0xFF, 0xDB })]
        [TestCase(new byte[] { 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A })]
        [TestCase(new byte[] { 0x47, 0x49, 0x46, 0x38, 0x39, 0x61 })]
        [TestCase(new byte[] { 0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50 })]
        public void should_recognise_raster_image_signatures(byte[] header)
        {
            CoverImageFormat.IsImage(header).Should().BeTrue();
        }

        [TestCase("<svg xmlns=\"http://www.w3.org/2000/svg\">")]
        [TestCase("<!DOCTYPE html>")]
        [TestCase("GIF")]
        public void should_not_recognise_markup_as_an_image(string content)
        {
            CoverImageFormat.IsImage(System.Text.Encoding.UTF8.GetBytes(content)).Should().BeFalse();
        }

        [TestCase(".png")]
        [TestCase(".jpg")]
        public void should_convert_cover_urls_to_local(string extension)
        {
            var covers = new List<MediaCover.MediaCover>
                {
                    new MediaCover.MediaCover
                    {
                        Url = "http://dummy.com/test" + extension,
                        CoverType = MediaCoverTypes.Banner
                    }
                };

            Mocker.GetMock<IDiskProvider>().Setup(c => c.FileGetLastWrite(It.IsAny<string>()))
                  .Returns(new DateTime(1234));

            Mocker.GetMock<IDiskProvider>().Setup(c => c.FileExists(It.IsAny<string>()))
                  .Returns(true);

            Subject.ConvertToLocalUrls(12, MediaCoverEntity.Author, covers);

            covers.Single().Url.Should().Be("/MediaCover/12/banner" + extension + "?lastWrite=1234");
        }

        [TestCase(".png")]
        [TestCase(".jpg")]
        public void convert_to_local_url_should_not_change_extension(string extension)
        {
            var covers = new List<MediaCover.MediaCover>
                {
                    new MediaCover.MediaCover
                    {
                        Url = "http://dummy.com/test" + extension,
                        CoverType = MediaCoverTypes.Banner
                    }
                };

            Mocker.GetMock<IDiskProvider>().Setup(c => c.FileGetLastWrite(It.IsAny<string>()))
                  .Returns(new DateTime(1234));

            Mocker.GetMock<IDiskProvider>().Setup(c => c.FileExists(It.IsAny<string>()))
                  .Returns(true);

            Subject.ConvertToLocalUrls(12, MediaCoverEntity.Author, covers);

            covers.Single().Extension.Should().Be(extension);
        }

        [TestCase(".png")]
        [TestCase(".jpg")]
        public void should_convert_book_cover_urls_to_local(string extension)
        {
            var covers = new List<MediaCover.MediaCover>
                {
                    new MediaCover.MediaCover
                    {
                        Url = "http://dummy.com/test" + extension,
                        CoverType = MediaCoverTypes.Disc
                    }
                };

            Mocker.GetMock<IDiskProvider>().Setup(c => c.FileGetLastWrite(It.IsAny<string>()))
                  .Returns(new DateTime(1234));

            Mocker.GetMock<IDiskProvider>().Setup(c => c.FileExists(It.IsAny<string>()))
                  .Returns(true);

            Subject.ConvertToLocalUrls(6, MediaCoverEntity.Book, covers);

            covers.Single().Url.Should().Be("/MediaCover/Books/6/disc" + extension + "?lastWrite=1234");
        }

        [TestCase(".png")]
        [TestCase(".jpg")]
        public void should_convert_media_urls_to_local_without_time_if_file_doesnt_exist(string extension)
        {
            var covers = new List<MediaCover.MediaCover>
                {
                    new MediaCover.MediaCover
                    {
                        Url = "http://dummy.com/test" + extension,
                        CoverType = MediaCoverTypes.Banner
                    }
                };

            var path = Path.Combine(TestContext.CurrentContext.TestDirectory, "Files", "Media", "NonExistant.mp4");
            var fileInfo = new FileInfo(path);

            Mocker.GetMock<IDiskProvider>()
                .Setup(c => c.GetFileInfo(It.IsAny<string>()))
                .Returns((FileInfoBase)fileInfo);

            Subject.ConvertToLocalUrls(12, MediaCoverEntity.Author, covers);

            covers.Single().Url.Should().Be("/MediaCover/12/banner" + extension);
        }

        [Test]
        public void should_resize_covers_if_main_downloaded()
        {
            Mocker.GetMock<ICoverExistsSpecification>()
                  .Setup(v => v.AlreadyExists(It.IsAny<DateTime?>(), It.IsAny<long?>(), It.IsAny<string>()))
                  .Returns(false);

            Mocker.GetMock<IBookService>()
                  .Setup(v => v.GetBooksByAuthor(It.IsAny<int>()))
                  .Returns(new List<Book> { _book });

            Mocker.GetMock<IDiskProvider>()
                  .Setup(v => v.FileExists(It.IsAny<string>()))
                  .Returns(true);

            Subject.HandleAsync(new AuthorRefreshCompleteEvent(_author));

            Mocker.GetMock<IImageResizer>()
                  .Verify(v => v.Resize(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<int>()), Times.Exactly(2));
        }

        [Test]
        public void should_resize_covers_if_missing()
        {
            Mocker.GetMock<ICoverExistsSpecification>()
                  .Setup(v => v.AlreadyExists(It.IsAny<DateTime?>(), It.IsAny<long?>(), It.IsAny<string>()))
                  .Returns(true);

            Mocker.GetMock<IBookService>()
                  .Setup(v => v.GetBooksByAuthor(It.IsAny<int>()))
                  .Returns(new List<Book> { _book });

            Mocker.GetMock<IDiskProvider>()
                  .Setup(v => v.FileExists(It.IsAny<string>()))
                  .Returns(false);

            Subject.HandleAsync(new AuthorRefreshCompleteEvent(_author));

            Mocker.GetMock<IImageResizer>()
                  .Verify(v => v.Resize(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<int>()), Times.Exactly(2));
        }

        [Test]
        public void should_not_resize_covers_if_exists()
        {
            Mocker.GetMock<ICoverExistsSpecification>()
                  .Setup(v => v.AlreadyExists(It.IsAny<DateTime?>(), It.IsAny<long?>(), It.IsAny<string>()))
                  .Returns(true);

            Mocker.GetMock<IDiskProvider>()
                  .Setup(v => v.FileExists(It.IsAny<string>()))
                  .Returns(true);

            Mocker.GetMock<IBookService>()
                  .Setup(v => v.GetBooksByAuthor(It.IsAny<int>()))
                  .Returns(new List<Book> { _book });

            Mocker.GetMock<IDiskProvider>()
                  .Setup(v => v.GetFileSize(It.IsAny<string>()))
                  .Returns(1000);

            Subject.HandleAsync(new AuthorRefreshCompleteEvent(_author));

            Mocker.GetMock<IImageResizer>()
                  .Verify(v => v.Resize(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<int>()), Times.Never());
        }

        [Test]
        public void should_resize_covers_if_existing_is_empty()
        {
            Mocker.GetMock<ICoverExistsSpecification>()
                  .Setup(v => v.AlreadyExists(It.IsAny<DateTime?>(), It.IsAny<long?>(), It.IsAny<string>()))
                  .Returns(true);

            Mocker.GetMock<IDiskProvider>()
                  .Setup(v => v.FileExists(It.IsAny<string>()))
                  .Returns(true);

            Mocker.GetMock<IBookService>()
                  .Setup(v => v.GetBooksByAuthor(It.IsAny<int>()))
                  .Returns(new List<Book> { _book });

            Mocker.GetMock<IDiskProvider>()
                  .Setup(v => v.GetFileSize(It.IsAny<string>()))
                  .Returns(0);

            Subject.HandleAsync(new AuthorRefreshCompleteEvent(_author));

            Mocker.GetMock<IImageResizer>()
                  .Verify(v => v.Resize(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<int>()), Times.Exactly(2));
        }

        [TestCase(0)]
        [TestCase(1)]
        public void should_skip_books_without_a_monitored_edition_and_carry_on(int unmonitoredEditions)
        {
            // rreading-glasses can list one edition under two works, and the refresh then leaves one book with no
            // monitored edition, or no editions at all
            var editions = Enumerable.Range(1, unmonitoredEditions)
                .Select(i => Builder<Edition>.CreateNew()
                    .With(v => v.Monitored = false)
                    .With(v => v.Images = new List<MediaCover.MediaCover> { new MediaCover.MediaCover(MediaCoverTypes.Cover, "http://dummy.com/other.jpg") })
                    .Build())
                .ToList();

            var orphan = Builder<Book>.CreateNew()
                .With(v => v.Id = 3)
                .With(v => v.Editions = editions)
                .Build();

            _edition.Images = new List<MediaCover.MediaCover> { new MediaCover.MediaCover(MediaCoverTypes.Cover, "http://dummy.com/cover.jpg") };

            Mocker.GetMock<ICoverExistsSpecification>()
                  .Setup(v => v.AlreadyExists(It.IsAny<DateTime?>(), It.IsAny<long?>(), It.IsAny<string>()))
                  .Returns(false);

            Mocker.GetMock<IBookService>()
                  .Setup(v => v.GetBooksByAuthor(It.IsAny<int>()))
                  .Returns(new List<Book> { orphan, _book });

            Subject.HandleAsync(new AuthorRefreshCompleteEvent(_author));

            Mocker.GetMock<IHttpClient>()
                  .Verify(v => v.DownloadFile(It.Is<HttpRequest>(r => r.Url.FullUri == "http://dummy.com/cover.jpg" && r.MaxResponseLength == CoverImageFormat.MaxLength), It.IsAny<string>()), Times.Once());

            Mocker.GetMock<IHttpClient>()
                  .Verify(v => v.DownloadFile(It.Is<HttpRequest>(r => r.Url.FullUri == "http://dummy.com/other.jpg"), It.IsAny<string>()), Times.Never());

            Mocker.GetMock<IEventAggregator>()
                  .Verify(v => v.PublishEvent(It.IsAny<MediaCoversUpdatedEvent>()), Times.Once());
        }

        [Test]
        public void should_log_error_if_resize_failed()
        {
            Mocker.GetMock<ICoverExistsSpecification>()
                  .Setup(v => v.AlreadyExists(It.IsAny<DateTime?>(), It.IsAny<long?>(), It.IsAny<string>()))
                  .Returns(true);

            Mocker.GetMock<IDiskProvider>()
                  .Setup(v => v.FileExists(It.IsAny<string>()))
                  .Returns(false);

            Mocker.GetMock<IBookService>()
                  .Setup(v => v.GetBooksByAuthor(It.IsAny<int>()))
                  .Returns(new List<Book> { _book });

            Mocker.GetMock<IImageResizer>()
                  .Setup(v => v.Resize(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<int>()))
                  .Throws<ApplicationException>();

            Subject.HandleAsync(new AuthorRefreshCompleteEvent(_author));

            Mocker.GetMock<IImageResizer>()
                  .Verify(v => v.Resize(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<int>()), Times.Exactly(2));
        }
    }
}
