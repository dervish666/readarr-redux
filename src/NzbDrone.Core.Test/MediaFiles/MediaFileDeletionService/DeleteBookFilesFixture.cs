using System.Collections.Generic;
using System.IO;
using System.Linq;
using FizzWare.NBuilder;
using FluentAssertions;
using Moq;
using NUnit.Framework;
using NzbDrone.Common.Disk;
using NzbDrone.Core.Books;
using NzbDrone.Core.Books.Calibre;
using NzbDrone.Core.Books.Events;
using NzbDrone.Core.MediaFiles;
using NzbDrone.Core.Messaging.Events;
using NzbDrone.Core.Qualities;
using NzbDrone.Core.RootFolders;
using NzbDrone.Core.Test.Framework;
using NzbDrone.Test.Common;

namespace NzbDrone.Core.Test.MediaFiles.MediaFileDeletionService
{
    [TestFixture]
    public class DeleteBookFilesFixture : DbTest<BookService, Book>
    {
        private static readonly string AuthorFolder = @"C:\Test\Books\Author".AsOsAgnostic();

        private Book _book;
        private List<BookFile> _files;
        private BookFile _otherBookFile;
        private BookDeletedEvent _deleted;

        [SetUp]
        public void Setup()
        {
            Mocker.SetConstant<IBookRepository>(Mocker.Resolve<BookRepository>());
            Mocker.SetConstant<IEditionRepository>(Mocker.Resolve<EditionRepository>());
            Mocker.SetConstant<IEditionService>(Mocker.Resolve<EditionService>());
            Mocker.SetConstant<IMediaFileRepository>(Mocker.Resolve<MediaFileRepository>());
            Mocker.SetConstant<IMediaFileService>(Mocker.Resolve<MediaFileService>());

            var metadata = Builder<AuthorMetadata>.CreateNew()
                .With(a => a.Id = 0)
                .Build();
            Db.Insert(metadata);

            var author = Builder<Author>.CreateNew()
                .With(a => a.Id = 0)
                .With(a => a.AuthorMetadataId = metadata.Id)
                .With(a => a.Path = AuthorFolder)
                .Build();
            Db.Insert(author);

            _book = GivenBook(metadata.Id, "Book One");
            var edition = GivenEdition(_book);
            _files = new List<BookFile>
            {
                GivenFile(edition, Path.Combine(AuthorFolder, "Book One", "Book One (1).mp3")),
                GivenFile(edition, Path.Combine(AuthorFolder, "Book One", "Book One (2).mp3"))
            };

            var otherBook = GivenBook(metadata.Id, "Book Two");
            _otherBookFile = GivenFile(GivenEdition(otherBook), Path.Combine(AuthorFolder, "Book Two", "Book Two.m4b"));

            Mocker.GetMock<IEventAggregator>()
                .Setup(s => s.PublishEvent(It.IsAny<BookDeletedEvent>()))
                .Callback<BookDeletedEvent>(e => _deleted = e);

            Mocker.GetMock<IDiskProvider>()
                .Setup(s => s.FileExists(It.IsAny<string>()))
                .Returns(true);

            Mocker.GetMock<IRootFolderService>()
                .Setup(s => s.GetBestRootFolder(It.IsAny<string>()))
                .Returns(new RootFolder { Path = Path.GetDirectoryName(AuthorFolder) });
        }

        private Book GivenBook(int authorMetadataId, string title)
        {
            var book = Builder<Book>.CreateNew()
                .With(b => b.Id = 0)
                .With(b => b.Title = title)
                .With(b => b.ForeignBookId = title)
                .With(b => b.TitleSlug = title)
                .With(b => b.AuthorMetadataId = authorMetadataId)
                .Build();
            Db.Insert(book);

            return book;
        }

        private Edition GivenEdition(Book book)
        {
            var edition = Builder<Edition>.CreateNew()
                .With(e => e.Id = 0)
                .With(e => e.BookId = book.Id)
                .With(e => e.ForeignEditionId = book.Title)
                .With(e => e.TitleSlug = book.Title)
                .With(e => e.Monitored = true)
                .Build();
            Db.Insert(edition);

            return edition;
        }

        private BookFile GivenFile(Edition edition, string path)
        {
            var file = Builder<BookFile>.CreateNew()
                .With(f => f.Id = 0)
                .With(f => f.EditionId = edition.Id)
                .With(f => f.Path = path)
                .With(f => f.CalibreId = 0)
                .With(f => f.Quality = new QualityModel(Quality.MP3))
                .Build();
            Db.Insert(file);

            return file;
        }

        // Runs the handlers in the order the event aggregator does: the synchronous ones, where EditionService deletes
        // the book's editions, then the asynchronous ones, which run concurrently. MediaFileService goes first, as the
        // order where it could leave nothing for the one that deletes the files.
        private void DeleteBook(bool deleteFiles)
        {
            Subject.DeleteBook(_book.Id, deleteFiles);

            _deleted.Should().NotBeNull();

            Mocker.Resolve<EditionService>().Handle(_deleted);
            Mocker.Resolve<MediaFileService>().HandleAsync(_deleted);
            Mocker.Resolve<Core.MediaFiles.MediaFileDeletionService>().HandleAsync(_deleted);
        }

        [Test]
        public void should_recycle_the_files_of_a_book_deleted_with_its_files_and_remove_their_rows()
        {
            DeleteBook(true);

            foreach (var file in _files)
            {
                Mocker.GetMock<IRecycleBinProvider>()
                    .Verify(v => v.DeleteFile(file.Path, It.IsAny<string>()), Times.Once());
            }

            Mocker.GetMock<IRecycleBinProvider>()
                .Verify(v => v.DeleteFile(_otherBookFile.Path, It.IsAny<string>()), Times.Never());

            Db.All<BookFile>().Select(x => x.Path).Should().BeEquivalentTo(new[] { _otherBookFile.Path });
        }

        [Test]
        public void should_keep_recycling_the_files_of_a_deleted_book_after_one_fails()
        {
            Mocker.GetMock<IRecycleBinProvider>()
                .Setup(s => s.DeleteFile(_files[0].Path, It.IsAny<string>()))
                .Throws(new IOException("Permission denied"));

            DeleteBook(true);

            Mocker.GetMock<IRecycleBinProvider>()
                .Verify(v => v.DeleteFile(_files[1].Path, It.IsAny<string>()), Times.Once());

            // The file still on disk stays as an unmapped file rather than pointing at the deleted edition
            var files = Db.All<BookFile>();
            files.Should().NotContain(x => x.Id == _files[1].Id);
            files.Single(x => x.Id == _files[0].Id).EditionId.Should().Be(0);

            ExceptionVerification.ExpectedErrors(1);
            ExceptionVerification.ExpectedWarns(1);
        }

        [Test]
        public void should_not_delete_a_file_a_rescan_imported_again_while_the_book_was_being_deleted()
        {
            Subject.DeleteBook(_book.Id, true);
            Mocker.Resolve<EditionService>().Handle(_deleted);

            // A rescan sees the row of the deleted edition as unmatched, replaces it and imports the file for another book
            Db.Delete(_files[0]);
            var retaken = GivenFile(Db.All<Edition>().Single(), _files[0].Path);

            Mocker.Resolve<MediaFileService>().HandleAsync(_deleted);
            Mocker.Resolve<Core.MediaFiles.MediaFileDeletionService>().HandleAsync(_deleted);

            Mocker.GetMock<IRecycleBinProvider>()
                .Verify(v => v.DeleteFile(_files[0].Path, It.IsAny<string>()), Times.Never());

            Mocker.GetMock<IRecycleBinProvider>()
                .Verify(v => v.DeleteFile(_files[1].Path, It.IsAny<string>()), Times.Once());

            Db.All<BookFile>().Select(x => x.Id).Should().BeEquivalentTo(new[] { _otherBookFile.Id, retaken.Id });
        }

        [Test]
        public void should_delete_the_files_of_a_deleted_book_from_calibre_when_they_are_not_reachable_here()
        {
            var calibreSettings = new CalibreSettings { Library = "Calibre" };

            Mocker.GetMock<IRootFolderService>()
                .Setup(s => s.GetBestRootFolder(It.IsAny<string>()))
                .Returns(new RootFolder { Path = Path.GetDirectoryName(AuthorFolder), IsCalibreLibrary = true, CalibreSettings = calibreSettings });

            Mocker.GetMock<IDiskProvider>()
                .Setup(s => s.FileExists(It.IsAny<string>()))
                .Returns(false);

            _files.ForEach(x => x.CalibreId = 7);
            Db.Update(_files[0]);
            Db.Update(_files[1]);

            DeleteBook(true);

            Mocker.GetMock<ICalibreProxy>()
                .Verify(v => v.DeleteBook(It.IsAny<BookFile>(), calibreSettings), Times.Exactly(2));

            Db.All<BookFile>().Select(x => x.Path).Should().BeEquivalentTo(new[] { _otherBookFile.Path });
        }

        [Test]
        public void should_unlink_the_files_of_a_book_deleted_without_its_files()
        {
            DeleteBook(false);

            Mocker.GetMock<IRecycleBinProvider>()
                .Verify(v => v.DeleteFile(It.IsAny<string>(), It.IsAny<string>()), Times.Never());

            var files = Db.All<BookFile>();

            files.Should().HaveCount(3);
            files.Where(x => _files.Any(f => f.Id == x.Id)).Should().OnlyContain(x => x.EditionId == 0);
            files.Single(x => x.Id == _otherBookFile.Id).EditionId.Should().Be(_otherBookFile.EditionId);
        }
    }
}
