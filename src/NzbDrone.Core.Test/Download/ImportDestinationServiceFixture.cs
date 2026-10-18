using System.Collections.Generic;
using System.IO;
using System.IO.Abstractions;
using System.Linq;
using FizzWare.NBuilder;
using FluentAssertions;
using Moq;
using NUnit.Framework;
using NzbDrone.Common.Disk;
using NzbDrone.Core.Books;
using NzbDrone.Core.DecisionEngine;
using NzbDrone.Core.Download;
using NzbDrone.Core.Download.TrackedDownloads;
using NzbDrone.Core.MediaFiles;
using NzbDrone.Core.MediaFiles.BookImport;
using NzbDrone.Core.Parser.Model;
using NzbDrone.Core.Qualities;
using NzbDrone.Core.Test.Framework;
using NzbDrone.Test.Common;

namespace NzbDrone.Core.Test.Download
{
    // The compare view must show where an import would really put each file, so it has to number parts the way
    // the import does before it asks for a path
    [TestFixture]
    public class ImportDestinationServiceFixture : CoreTest<ImportDestinationService>
    {
        private readonly string _outputPath = @"C:\Test\Downloads\Defiance of the Fall 6".AsOsAgnostic();
        private readonly string _libraryPath = @"C:\Test\Books\TheFirstDefier\Defiance of the Fall 6".AsOsAgnostic();
        private TrackedDownload _trackedDownload;
        private Author _author;
        private Book _book;
        private Edition _edition;

        [SetUp]
        public void Setup()
        {
            _author = Builder<Author>.CreateNew().With(a => a.Name = "TheFirstDefier").Build();
            _book = Builder<Book>.CreateNew().With(b => b.Title = "Defiance of the Fall 6").Build();
            _edition = Builder<Edition>.CreateNew().With(e => e.Book = _book).Build();

            var item = Builder<DownloadClientItem>.CreateNew()
                .With(d => d.OutputPath = new OsPath(_outputPath))
                .Build();

            _trackedDownload = Builder<TrackedDownload>.CreateNew()
                .With(t => t.DownloadItem = item)
                .With(t => t.ImportItem = item)
                .With(t => t.RemoteBook = new RemoteBook { Author = _author, Books = new List<Book> { _book } })
                .Build();

            Mocker.GetMock<IDiskProvider>()
                .Setup(s => s.FolderExists(_outputPath))
                .Returns(true);

            // The import's own numbering, so the preview is checked against what an import would do
            Mocker.SetConstant<IImportApprovedBooks>(Mocker.Resolve<ImportApprovedBooks>());

            Mocker.GetMock<IMoveBookFiles>()
                .Setup(s => s.GetBookFilePath(It.IsAny<BookFile>(), It.IsAny<LocalBook>()))
                .Returns((BookFile file, LocalBook local) => Path.Combine(_libraryPath, $"Defiance of the Fall 6 - Part {file.Part:00}.mp3"));
        }

        private ImportDecision<LocalBook> Decision(string fileName, int part, bool approved = true)
        {
            var local = new LocalBook
            {
                Path = Path.Combine(_outputPath, fileName),
                Part = part,
                Author = _author,
                Book = _book,
                Edition = _edition,
                Quality = new QualityModel(Quality.MP3),
                FileTrackInfo = new ParsedTrackInfo()
            };

            return approved ? new ImportDecision<LocalBook>(local) : new ImportDecision<LocalBook>(local, new Rejection("Not an upgrade"));
        }

        private void GivenDecisions(params ImportDecision<LocalBook>[] decisions)
        {
            Mocker.GetMock<IMakeImportDecision>()
                .Setup(s => s.GetImportDecisions(It.IsAny<List<IFileInfo>>(), It.IsAny<IdentificationOverrides>(), It.IsAny<ImportDecisionMakerInfo>(), It.IsAny<ImportDecisionMakerConfig>()))
                .Returns(decisions.ToList());
        }

        [Test]
        public void should_number_clashing_audiobook_parts_before_working_out_their_destinations()
        {
            // Both files tagged as part 1, as a badly tagged release often is. The import numbers them from their
            // filenames, so they land on two paths, not one.
            GivenDecisions(Decision("Part 01.mp3", 1), Decision("Part 02.mp3", 1));

            var destinations = Subject.GetDestinations(_trackedDownload);

            destinations.Select(d => Path.GetFileName(d.DestinationPath)).Should().BeEquivalentTo(
                "Defiance of the Fall 6 - Part 01.mp3",
                "Defiance of the Fall 6 - Part 02.mp3");
        }

        [Test]
        public void should_leave_a_rejected_part_out_of_the_numbering_and_still_show_it()
        {
            GivenDecisions(Decision("Part 01.mp3", 0), Decision("Part 02.mp3", 0, approved: false));

            var destinations = Subject.GetDestinations(_trackedDownload);

            destinations.Should().HaveCount(2);
            destinations.Single(d => d.SourcePath.EndsWith("Part 02.mp3")).Rejections.Should().Contain("Not an upgrade");
        }

        [Test]
        public void should_show_which_book_the_file_in_the_way_belongs_to()
        {
            GivenDecisions(Decision("Part 01.mp3", 1));

            var destination = Path.Combine(_libraryPath, "Defiance of the Fall 6 - Part 01.mp3");
            var otherBook = Builder<Book>.CreateNew().With(b => b.Id = 99).With(b => b.Title = "Defiance of the Fall 4").Build();

            Mocker.GetMock<IDiskProvider>().Setup(s => s.FileExists(destination)).Returns(true);
            Mocker.GetMock<IDiskProvider>().Setup(s => s.GetFileInfo(destination)).Returns(Mock.Of<IFileInfo>(f => f.FullName == destination));
            Mocker.GetMock<IMediaFileService>().Setup(s => s.GetFileWithPath(destination)).Returns(new BookFile { Id = 5, EditionId = 7, Path = destination });
            Mocker.GetMock<IEditionService>().Setup(s => s.GetEdition(7)).Returns(new Edition { Id = 7, BookId = 99 });
            Mocker.GetMock<IBookService>().Setup(s => s.GetBook(99)).Returns(otherBook);
            Mocker.GetMock<IAuthorService>().Setup(s => s.GetAuthorByMetadataId(It.IsAny<int>())).Returns(_author);

            var result = Subject.GetDestinations(_trackedDownload).Single();

            result.DestinationExists.Should().BeTrue();
            result.DestinationBookFileId.Should().Be(5);
            result.DestinationBookTitle.Should().Be("Defiance of the Fall 4");
        }
    }
}
