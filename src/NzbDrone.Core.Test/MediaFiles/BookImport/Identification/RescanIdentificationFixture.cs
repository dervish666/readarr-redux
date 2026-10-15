using System;
using System.Collections.Generic;
using System.IO;
using System.IO.Abstractions;
using System.IO.Abstractions.TestingHelpers;
using System.Linq;
using FluentAssertions;
using Moq;
using NUnit.Framework;
using NzbDrone.Core.Books;
using NzbDrone.Core.MediaFiles;
using NzbDrone.Core.MediaFiles.BookImport;
using NzbDrone.Core.MediaFiles.BookImport.Identification;
using NzbDrone.Core.MetadataSource;
using NzbDrone.Core.Parser.Model;
using NzbDrone.Core.Profiles.Qualities;
using NzbDrone.Core.Qualities;
using NzbDrone.Core.RootFolders;
using NzbDrone.Core.Test.Framework;
using NzbDrone.Test.Common;

namespace NzbDrone.Core.Test.MediaFiles.BookImport.Identification
{
    // A rescan of files in the library, through real grouping, candidates, identification and matching rules. The
    // books, editions and tags are the ones that went wrong in a real library on 2026-10-12.
    [TestFixture]
    public class RescanIdentificationFixture : CoreTest<ImportDecisionMaker>
    {
        private static readonly string Root = @"C:\books\AudioBooks".AsOsAgnostic();

        private MockFileSystem _fileSystem;
        private List<Author> _authors;
        private List<Book> _books;
        private Dictionary<string, ParsedTrackInfo> _tags;
        private Dictionary<int, List<BookFile>> _filesByBook;

        [SetUp]
        public void Setup()
        {
            _fileSystem = new MockFileSystem();
            _authors = new List<Author>();
            _books = new List<Book>();
            _tags = new Dictionary<string, ParsedTrackInfo>();
            _filesByBook = new Dictionary<int, List<BookFile>>();

            Mocker.SetConstant<ITrackGroupingService>(Mocker.Resolve<TrackGroupingService>());
            Mocker.SetConstant<ICandidateService>(Mocker.Resolve<CandidateService>());
            Mocker.SetConstant<IIdentificationService>(Mocker.Resolve<IdentificationService>());
            Mocker.SetConstant<IEnumerable<IImportDecisionEngineSpecification<LocalBook>>>(new List<IImportDecisionEngineSpecification<LocalBook>>());
            Mocker.SetConstant<IEnumerable<IImportDecisionEngineSpecification<LocalEdition>>>(MatchSpecifications());

            Mocker.GetMock<IMediaFileService>()
                .Setup(s => s.FilterUnchangedFiles(It.IsAny<List<IFileInfo>>(), It.IsAny<FilterFilesType>()))
                .Returns((List<IFileInfo> files, FilterFilesType filter) => files);

            Mocker.GetMock<IMediaFileService>()
                .Setup(s => s.GetFilesByBook(It.IsAny<int>()))
                .Returns((int id) => _filesByBook.TryGetValue(id, out var files) ? files : new List<BookFile>());

            Mocker.GetMock<IMetadataTagService>()
                .Setup(s => s.ReadTags(It.IsAny<IFileInfo>()))
                .Returns((IFileInfo file) => _tags.TryGetValue(file.FullName, out var tags) ? tags : new ParsedTrackInfo());

            Mocker.GetMock<IAuthorService>()
                .Setup(s => s.GetCandidates(It.IsAny<string>()))
                .Returns((string name) => _authors.Where(a => a.Metadata.Value.Name == name).ToList());

            // Identification weighs every book of the author's that it is offered
            Mocker.GetMock<IBookService>()
                .Setup(s => s.GetCandidates(It.IsAny<int>(), It.IsAny<string>()))
                .Returns((int authorMetadataId, string title) => _books.Where(b => b.AuthorMetadataId == authorMetadataId).ToList());

            Mocker.GetMock<IEditionService>()
                .Setup(s => s.GetCandidates(It.IsAny<int>(), It.IsAny<string>()))
                .Returns(new List<Edition>());

            Mocker.GetMock<IEditionService>()
                .Setup(s => s.GetEditionsByBook(It.IsAny<int>()))
                .Returns((int id) => _books.Single(b => b.Id == id).Editions.Value);

            Mocker.GetMock<ISearchForNewBook>()
                .Setup(s => s.SearchForNewBook(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<bool>()))
                .Returns(new List<Book>());

            Mocker.GetMock<ISearchForNewBook>()
                .Setup(s => s.SearchByIsbn(It.IsAny<string>()))
                .Returns(new List<Book>());

            Mocker.GetMock<ISearchForNewBook>()
                .Setup(s => s.SearchByAsin(It.IsAny<string>()))
                .Returns(new List<Book>());

            Mocker.GetMock<ISearchForNewBook>()
                .Setup(s => s.SearchByGoodreadsBookId(It.IsAny<long>(), It.IsAny<bool>()))
                .Returns(new List<Book>());

            Mocker.GetMock<IRootFolderService>()
                .Setup(s => s.GetBestRootFolder(It.IsAny<string>()))
                .Returns(new RootFolder { Path = Root, DefaultQualityProfileId = 1 });

            Mocker.GetMock<IQualityProfileService>()
                .Setup(s => s.Get(It.IsAny<int>()))
                .Returns(new QualityProfile { Id = 1 });
        }

        // The rules that judge a book match, as the container collects them
        private static List<IImportDecisionEngineSpecification<LocalEdition>> MatchSpecifications()
        {
            return typeof(ImportDecisionMaker).Assembly.GetTypes()
                .Where(t => !t.IsAbstract &&
                            typeof(IImportDecisionEngineSpecification<LocalEdition>).IsAssignableFrom(t) &&
                            t.Name.EndsWith("MatchSpecification"))
                .Select(t => (IImportDecisionEngineSpecification<LocalEdition>)Activator.CreateInstance(t, TestLogger))
                .ToList();
        }

        private Author GivenAuthor(int id, string name)
        {
            var author = new Author
            {
                Id = id,
                AuthorMetadataId = id,
                QualityProfileId = 1,
                Path = Path.Combine(Root, name),
                Metadata = new AuthorMetadata { Id = id, ForeignAuthorId = id.ToString(), Name = name }
            };

            _authors.Add(author);

            return author;
        }

        private Book GivenBook(Author author, int id, string title, string format, string isbn = null, string asin = null, DateTime? released = null, string publisher = null, string editionTitle = null)
        {
            var book = new Book
            {
                Id = id,
                ForeignBookId = id.ToString(),
                Title = title,
                CleanTitle = title,
                AuthorMetadataId = author.AuthorMetadataId,
                Author = author,
                AuthorMetadata = author.Metadata.Value,
                SeriesLinks = new List<SeriesBookLink>()
            };

            book.Editions = new List<Edition>
            {
                new Edition
                {
                    Id = id,
                    BookId = id,
                    ForeignEditionId = $"e{id}",
                    Title = editionTitle ?? title,
                    Format = format,
                    Isbn13 = isbn,
                    Asin = asin,
                    ReleaseDate = released,
                    Publisher = publisher,
                    Language = "eng",
                    Monitored = true,
                    Book = book
                }
            };

            _books.Add(book);

            return book;
        }

        private static ParsedTrackInfo Tags(Author author, string bookTitle, uint year = 0, string publisher = null, int track = 0, string isbn = null, string goodreads = null)
        {
            return new ParsedTrackInfo
            {
                Authors = new List<string> { author.Metadata.Value.Name },
                BookTitle = bookTitle,
                Title = bookTitle,
                Year = year,
                Publisher = publisher,
                Isbn = isbn,
                GoodreadsId = goodreads,
                TrackNumbers = track > 0 ? new[] { track } : new int[0]
            };
        }

        private static string BookPath(Author author, string folder, string file)
        {
            return Path.Combine(author.Path, folder, file);
        }

        // Files the book already has, tagged by an earlier import
        private void GivenBookFiles(Book book, string folder, int count, ParsedTrackInfo tags)
        {
            var author = book.Author.Value;

            for (var i = 1; i <= count; i++)
            {
                GivenBookFile(book, BookPath(author, folder, $"{author.Metadata.Value.Name} - {book.Title} ({i}).mp3"), tags);
            }
        }

        private void GivenBookFile(Book book, string path, ParsedTrackInfo tags)
        {
            if (!_filesByBook.TryGetValue(book.Id, out var files))
            {
                files = new List<BookFile>();
                _filesByBook[book.Id] = files;
            }

            files.Add(new BookFile { Id = 1000 + _filesByBook.Values.Sum(x => x.Count), Path = path, EditionId = book.Id, Quality = new QualityModel(Quality.MP3) });
            _tags[path] = tags;
        }

        // A file on disk for the rescan to read
        private IFileInfo GivenFile(string path, ParsedTrackInfo tags)
        {
            _fileSystem.AddFile(path, new MockFileData(string.Empty));
            _tags[path] = tags;

            return _fileSystem.FileInfo.FromFileName(path);
        }

        private List<ImportDecision<LocalBook>> Rescan(params IFileInfo[] files)
        {
            var config = new ImportDecisionMakerConfig
            {
                Filter = FilterFilesType.Known,
                IncludeExisting = true,
                AddNewAuthors = false
            };

            return Subject.GetImportDecisions(files.ToList(), null, null, config);
        }

        private static ImportDecision<LocalBook> DecisionFor(List<ImportDecision<LocalBook>> decisions, IFileInfo file)
        {
            return decisions.Single(d => d.Item.Path == file.FullName && !d.Item.AdditionalFile);
        }

        private Author GivenAsimov()
        {
            return GivenAuthor(2330, "Isaac Asimov");
        }

        private Author GivenLewis(out Book screwtape, out Book lionWitchWardrobe, out Book chronicles)
        {
            var lewis = GivenAuthor(44, "C.S. Lewis");

            screwtape = GivenBook(lewis, 62658, "The Screwtape Letters", "Audio CD", "9781589973244", "1589973240", new DateTime(2009, 10, 1), "Tyndale Entertainment");
            lionWitchWardrobe = GivenBook(lewis, 59284, "The Chronicles of Narnia: The Lion, the Witch, and the Wardrobe: BBC (BBC Radio Presents) by C.S. Lewis", "Audio Cassette", asin: "B01FJ1FUM2", publisher: "Listening Library");
            chronicles = GivenBook(lewis, 51295, "The Chronicles of Narnia", "Paperback", "9780066238500", "0066238501", new DateTime(2014, 1, 1), "HarperCollins");
            GivenBook(lewis, 68172, "The Chronicles Of Narnia", "Unknown Binding", asin: "B0013N3MTY", publisher: "Harper-entertainment");

            GivenBookFiles(lionWitchWardrobe, "The Chronicles of Narnia The Lion, the Witch, and the Wardrobe BBC", 7, Tags(lewis, lionWitchWardrobe.Title, publisher: "Listening Library"));

            return lewis;
        }

        [Test]
        public void should_match_an_untracked_file_to_the_book_its_tags_name_not_the_book_with_most_files()
        {
            var asimov = GivenAsimov();

            var earth = GivenBook(asimov, 76492, "Foundation and Earth", "Mass Market Paperback", "9780553587579", "0553587579", new DateTime(2004, 8, 31), "Spectra");
            var empire = GivenBook(asimov, 84479, "Foundation and Empire (Book Two of The Foundation Series)", "Unknown Binding", asin: "B017MYVD0C", publisher: "Collins; New Impression edition (1994-03-28)");

            GivenBookFiles(earth, "Foundation and Earth", 25, Tags(asimov, earth.Title, 2004, "Spectra"));
            GivenBookFiles(empire, "Foundation and Empire", 16, Tags(asimov, empire.Title, publisher: "Collins; New Impression edition (1994-03-28)"));

            // Put back by an upgrade that didn't complete, with no row of its own
            var file = GivenFile(BookPath(asimov, "Foundation and Earth", "Isaac Asimov - Foundation and Earth.mp3"), Tags(asimov, "Foundation and Earth", 2004, "Spectra", 1));

            var decision = DecisionFor(Rescan(file), file);

            decision.Approved.Should().BeTrue();
            decision.Item.Book.ForeignBookId.Should().Be(earth.ForeignBookId);
        }

        [Test]
        public void should_not_match_an_omnibus_part_to_the_book_in_the_series_with_most_files()
        {
            var asimov = GivenAsimov();

            var omnibus = GivenBook(asimov, 63753, "Foundation / Foundation and Empire / Second Foundation / The Stars, Like Dust / The Naked Sun / I, Robot", "Paperback", "9780345340504", "0345340507", new DateTime(1986, 1, 1), "Ballantine Books", "Foundation Series");
            var second = GivenBook(asimov, 84202, "Second Foundation", "Hardcover", asin: "B0DM254QND", released: new DateTime(2011, 1, 1), publisher: "Barnes & Noble");
            var edge = GivenBook(asimov, 63940, "Foundation's Edge", "Paperback", "9780553293388", "0553293389", new DateTime(2010, 12, 31), "Bantam/Spectra");

            GivenBookFiles(omnibus, "Foundation Series", 16, Tags(asimov, omnibus.Title, 1986, "Ballantine Books"));
            GivenBookFiles(second, "Second Foundation", 18, Tags(asimov, second.Title, 2011, "Barnes & Noble"));
            GivenBookFiles(edge, "Foundation's Edge", 16, Tags(asimov, edge.Title, 2010, "Bantam/Spectra"));

            var file = GivenFile(BookPath(asimov, "Foundation's Edge", "Isaac Asimov - Foundation's Edge (1).mp3"), Tags(asimov, omnibus.Title, 1986, "Ballantine Books", 1));

            var decisions = Rescan(file);

            decisions.Should().NotContain(d => d.Approved && d.Item.Book.ForeignBookId == second.ForeignBookId);
            DecisionFor(decisions, file).Approved.Should().BeFalse();
        }

        [Test]
        public void should_not_move_a_changed_file_onto_another_book_whose_files_outnumber_its_own()
        {
            var lewis = GivenLewis(out var screwtape, out var lionWitchWardrobe, out _);

            // Tracked on The Screwtape Letters, and changed since the last scan
            var tags = Tags(lewis, "The Screwtape Letters: First Ever Full-Cast Dramatization of the Diabolical Classic", 1994, "Tyndale Entertainment");
            var files = Enumerable.Range(1, 6)
                .Select(i => BookPath(lewis, "The Screwtape Letters", $"C.S. Lewis - The Screwtape Letters ({i}).mp3"))
                .ToList();

            files.ForEach(x => GivenBookFile(screwtape, x, tags));

            var decisions = Rescan(files.Select(x => GivenFile(x, tags)).ToArray());

            decisions.Should().NotContain(d => d.Approved && d.Item.Book.ForeignBookId == lionWitchWardrobe.ForeignBookId);
            decisions.Where(d => d.Item.Path.Contains("Screwtape")).Should().OnlyContain(d => !d.Approved);
        }

        [Test]
        public void should_not_match_an_omnibus_to_one_of_its_books()
        {
            var lewis = GivenLewis(out _, out var lionWitchWardrobe, out var chronicles);

            var path = BookPath(lewis, "The Chronicles of Narnia", "C.S. Lewis - The Chronicles of Narnia.m4a");
            var tags = Tags(lewis, "The Chronicles of Narnia", 1956);

            GivenBookFile(chronicles, path, tags);

            var file = GivenFile(path, tags);

            var decisions = Rescan(file);

            decisions.Should().NotContain(d => d.Approved && d.Item.Book.ForeignBookId == lionWitchWardrobe.ForeignBookId);
            DecisionFor(decisions, file).Approved.Should().BeFalse();
        }

        [Test]
        public void should_leave_a_file_unmapped_when_its_title_is_only_close_to_a_book()
        {
            var haig = GivenAuthor(26, "Matt Haig");

            var novel = GivenBook(haig, 194, "The Midnight Library", "Hardcover", "9780525559474", "0525559477", new DateTime(2020, 9, 29), "Viking");
            var graphicNovel = GivenBook(haig, 83682, "The Midnight Library: The Graphic Novel", "Hardcover", "9780143139126", "0143139126", new DateTime(DateTime.UtcNow.Year, 1, 1), "Penguin Books");

            GivenBookFile(novel, BookPath(haig, "The Midnight Library", "Matt Haig - The Midnight Library.m4b"), Tags(haig, novel.Title, 2020, "Viking"));

            var file = GivenFile(BookPath(haig, "The Midnight Library A Novel", "Matt Haig - The Midnight Library A Novel.mp3"), Tags(haig, "The Midnight Library: A Novel", 2023, "Large Print Press"));

            var decisions = Rescan(file);

            decisions.Should().NotContain(d => d.Approved && d.Item.Book.ForeignBookId == graphicNovel.ForeignBookId);
            DecisionFor(decisions, file).Approved.Should().BeFalse();
        }

        [Test]
        public void should_leave_a_file_unmapped_when_two_books_have_its_title()
        {
            var asimov = GivenAsimov();

            var second = GivenBook(asimov, 63700, "Second Foundation", "Hardcover", "9780553803730", "0553803735", new DateTime(2004, 6, 1), "Bantam Spectra");
            var alsoSecond = GivenBook(asimov, 84202, "Second Foundation", "Hardcover", asin: "B0DM254QND", released: new DateTime(2011, 1, 1), publisher: "Barnes & Noble");

            GivenBookFiles(alsoSecond, "Second Foundation", 15, Tags(asimov, alsoSecond.Title, 2011, "Barnes & Noble"));

            var file = GivenFile(BookPath(asimov, "Foundation (Publication Order)", "Isaac Asimov - Second Foundation.mp3"), Tags(asimov, "Second Foundation", 2011, "Barnes & Noble", 9));

            DecisionFor(Rescan(file), file).Approved.Should().BeFalse();
        }

        [Test]
        public void should_not_match_a_numbered_title_to_a_book_with_another_number()
        {
            var barker = GivenAuthor(2349, "Clive Barker");

            GivenBook(barker, 98051, "Hellraiser #6", "Comic", publisher: "Boom!");

            var file = GivenFile(BookPath(barker, "Hellraiser", "Clive Barker - Hellraiser 5.m4b"), Tags(barker, "Hellraiser #5", 2011, "Boom!"));

            DecisionFor(Rescan(file), file).Approved.Should().BeFalse();
        }

        // Book 1 of a long series is titled after the series alone, so its files name it as "Series 1"
        private Book GivenDefianceOfTheFall(out Author author)
        {
            author = GivenAuthor(9100, "TheFirstDefier");

            var series = new Series { Id = 1, Title = "Defiance of the Fall" };

            var first = GivenBook(author, 9101, "Defiance of the Fall", "Audible Audio", released: new DateTime(2021, 5, 27));
            var seventeenth = GivenBook(author, 9117, "Defiance of the Fall 17", "Audible Audio", released: new DateTime(2026, 12, 2));
            var eighteenth = GivenBook(author, 9118, "Defiance of the Fall 18", "Audible Audio", released: new DateTime(2027, 9, 8));

            foreach (var (book, position) in new[] { (first, "1"), (seventeenth, "17"), (eighteenth, "18") })
            {
                book.SeriesLinks = new List<SeriesBookLink> { new SeriesBookLink { Position = position, Series = series, Book = book } };
            }

            GivenBookFile(seventeenth, BookPath(author, "Defiance of the Fall 17", "TheFirstDefier - Defiance of the Fall 17.m4b"), Tags(author, seventeenth.Title, 2026));
            GivenBookFile(eighteenth, BookPath(author, "Defiance of the Fall 18", "TheFirstDefier - Defiance of the Fall 18.m4b"), Tags(author, eighteenth.Title, 2027));

            return first;
        }

        [TestCase("Defiance of the Fall 1")]
        [TestCase("Defiance of the Fall #1")]
        [TestCase("Defiance of the Fall, Book 1")]
        [TestCase("Defiance of the Fall Book 1")]
        public void should_match_a_file_named_by_series_and_position_to_that_book(string bookTag)
        {
            var first = GivenDefianceOfTheFall(out var author);

            var file = GivenFile(BookPath(author, "Defiance of the Fall/Defiance of the Fall 1", "TheFirstDefier - Defiance of the Fall 1.m4b"), Tags(author, bookTag, 2021));

            var decision = DecisionFor(Rescan(file), file);

            decision.Approved.Should().BeTrue();
            decision.Item.Book.ForeignBookId.Should().Be(first.ForeignBookId);
        }

        [Test]
        public void should_not_match_a_series_position_to_a_book_at_another_position()
        {
            GivenDefianceOfTheFall(out var author);

            var file = GivenFile(BookPath(author, "Defiance of the Fall/Defiance of the Fall 2", "TheFirstDefier - Defiance of the Fall 2.m4b"), Tags(author, "Defiance of the Fall 2", 2021));

            DecisionFor(Rescan(file), file).Approved.Should().BeFalse();
        }

        [Test]
        public void should_match_a_file_whose_isbn_is_the_editions_even_when_its_title_is_not_close()
        {
            var haig = GivenAuthor(26, "Matt Haig");

            var novel = GivenBook(haig, 194, "The Midnight Library", "Hardcover", "9780525559474", "0525559477", new DateTime(2020, 9, 29), "Viking");
            GivenBook(haig, 83682, "The Midnight Library: The Graphic Novel", "Hardcover", "9780143139126", "0143139126", new DateTime(DateTime.UtcNow.Year, 1, 1), "Penguin Books");

            var file = GivenFile(BookPath(haig, "The Midnight Library", "Matt Haig - The Midnight Library.epub"), Tags(haig, "The Midnight Library: A Novel", isbn: "9780525559474"));

            var decision = DecisionFor(Rescan(file), file);

            decision.Approved.Should().BeTrue();
            decision.Item.Book.ForeignBookId.Should().Be(novel.ForeignBookId);
        }

        [Test]
        public void should_not_match_a_file_whose_tags_carry_another_books_identifier()
        {
            var haig = GivenAuthor(26, "Matt Haig");

            GivenBook(haig, 194, "The Midnight Library", "Hardcover", "9780525559474", "0525559477", new DateTime(2020, 9, 29), "Viking");
            var graphicNovel = GivenBook(haig, 83682, "The Midnight Library: The Graphic Novel", "Hardcover", "9780143139126", "0143139126", new DateTime(DateTime.UtcNow.Year, 1, 1), "Penguin Books");

            // The novel's title and ISBN, and the graphic novel's Goodreads id
            var tags = Tags(haig, "The Midnight Library", isbn: "9780525559474", goodreads: graphicNovel.ForeignBookId);
            var file = GivenFile(BookPath(haig, "The Midnight Library", "Matt Haig - The Midnight Library.epub"), tags);

            DecisionFor(Rescan(file), file).Approved.Should().BeFalse();
        }

        [Test]
        public void should_not_match_a_release_whose_files_name_books_with_different_numbers()
        {
            var lewis = GivenAuthor(44, "C.S. Lewis");

            GivenBook(lewis, 59357, "The Chronicles of Narnia (Book 5)", "Audio CD", publisher: "HarperAudio");

            // Close enough to be grouped as one release, the fifth book's parts outnumbering the sixth's
            var files = Enumerable.Range(1, 4)
                .Select(i => GivenFile(BookPath(lewis, "The Chronicles of Narnia", $"C.S. Lewis - Narnia {i:00}.mp3"), Tags(lewis, i < 4 ? "The Chronicles of Narnia (Book 5)" : "The Chronicles of Narnia (Book 6)", publisher: "HarperAudio", track: i)))
                .ToArray();

            Rescan(files).Should().OnlyContain(d => !d.Approved);
        }
    }
}
