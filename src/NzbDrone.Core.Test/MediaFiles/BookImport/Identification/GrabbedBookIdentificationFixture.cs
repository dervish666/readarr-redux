using System.Collections.Generic;
using System.Linq;
using FluentAssertions;
using Moq;
using NUnit.Framework;
using NzbDrone.Core.Books;
using NzbDrone.Core.MediaFiles.BookImport;
using NzbDrone.Core.MediaFiles.BookImport.Identification;
using NzbDrone.Core.Parser.Model;
using NzbDrone.Core.Test.Framework;

namespace NzbDrone.Core.Test.MediaFiles.BookImport.Identification
{
    [TestFixture]
    public class GrabbedBookIdentificationFixture : CoreTest<IdentificationService>
    {
        private Author _author;
        private Book _grabbed;

        [SetUp]
        public void Setup()
        {
            _author = new Author { Id = 1, AuthorMetadataId = 1 };
            _grabbed = new Book { Id = 10, Title = "The Book One", ForeignBookId = "10" };

            // No candidates anywhere, so each file ends up with whatever book the overrides pin
            Mocker.GetMock<ICandidateService>()
                .Setup(s => s.GetDbCandidatesFromTags(It.IsAny<LocalEdition>(), It.IsAny<IdentificationOverrides>(), It.IsAny<bool>()))
                .Returns(new List<CandidateEdition>());

            Mocker.GetMock<ICandidateService>()
                .Setup(s => s.GetRemoteCandidates(It.IsAny<LocalEdition>(), It.IsAny<IdentificationOverrides>()))
                .Returns(new List<CandidateEdition>());
        }

        private static List<LocalBook> Files(string bookTitle, int count, string folder)
        {
            return Enumerable.Range(1, count).Select(i => new LocalBook
            {
                Path = $"/downloads/{folder}/{i:00}.mp3",
                FileTrackInfo = new ParsedTrackInfo { BookTitle = bookTitle, Authors = new List<string> { "Author" } }
            }).ToList();
        }

        private List<LocalBook> Identify(params List<LocalBook>[] releases)
        {
            Mocker.GetMock<ITrackGroupingService>()
                .Setup(s => s.GroupTracks(It.IsAny<List<LocalBook>>()))
                .Returns(releases.Select(r => new LocalEdition(r)).ToList());

            var files = releases.SelectMany(r => r).ToList();
            var overrides = new IdentificationOverrides { Author = _author, GrabbedBook = _grabbed };

            Subject.Identify(files, overrides, new ImportDecisionMakerConfig());

            return files;
        }

        [Test]
        public void should_pin_a_single_release_to_the_grabbed_book()
        {
            var files = Identify(Files("The Book One (Unabridged)", 3, "one"));

            files.Should().OnlyContain(x => x.Book == _grabbed);
        }

        [Test]
        public void should_pin_several_releases_of_the_same_book_to_the_grabbed_book()
        {
            // An epub and a mobi of the same book come out as two releases
            var files = Identify(Files("The Book One", 1, "epub"), Files("The Book One", 1, "mobi"));

            files.Should().OnlyContain(x => x.Book == _grabbed);
        }

        [Test]
        public void should_not_pin_a_download_that_groups_into_different_books()
        {
            var files = Identify(Files("The Book One", 3, "one"), Files("The Book Two", 3, "two"));

            files.Should().OnlyContain(x => x.Book == null);
        }

        [Test]
        public void should_not_pin_a_release_whose_tags_name_different_books()
        {
            // Grouping tolerates a minority of odd tags, so a pack can still come out as one release
            var tracks = Files("The Book One", 4, "pack").Concat(Files("The Book Two", 1, "pack")).ToList();

            var files = Identify(tracks);

            files.Should().OnlyContain(x => x.Book == null);
        }

        [Test]
        public void should_not_pin_several_releases_when_one_has_no_title()
        {
            var files = Identify(Files("The Book One", 2, "one"), Files(null, 2, "other"));

            files.Should().OnlyContain(x => x.Book == null);
        }
    }
}
