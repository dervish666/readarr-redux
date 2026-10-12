using System.Collections.Generic;
using FluentAssertions;
using NUnit.Framework;
using NzbDrone.Core.Books;
using NzbDrone.Core.MediaFiles.BookImport.Identification;
using NzbDrone.Core.Parser.Model;
using NzbDrone.Test.Common;

namespace NzbDrone.Core.Test.MediaFiles.BookImport.Identification
{
    [TestFixture]
    public class DistanceCalculatorFixture : TestBase
    {
        [Test]
        public void should_reverse_single_reversed_author()
        {
            var input = new List<string> { "Last, First" };
            var authors = DistanceCalculator.GetAuthorVariants(input);

            authors.Should().Contain("First Last");
        }

        [Test]
        public void should_reverse_two_reversed_author()
        {
            var input = new List<string>
            {
                "Last, First",
                "Last2, First2"
            };

            var authors = DistanceCalculator.GetAuthorVariants(input);

            authors.Should().HaveCount(4);
            authors.Should().Contain("First Last");
            authors.Should().Contain("First2 Last2");
            authors.Should().Contain("Last, First");
            authors.Should().Contain("Last2, First2");
        }

        [Test]
        public void should_not_reverse_single_author()
        {
            var input = new List<string> { "First Last" };
            var authors = DistanceCalculator.GetAuthorVariants(input);

            authors.Should().HaveCount(1);
            authors.Should().Contain("First Last");
        }

        [TestCase("First1 Last1, First2 Last2", "First1 Last1", "First2 Last2")]
        [TestCase("First1 Last1; First2 Last2", "First1 Last1", "First2 Last2")]
        [TestCase("First1 Last1 & First2 Last2", "First1 Last1", "First2 Last2")]
        [TestCase("First1 Last1 / First2 Last2", "First1 Last1", "First2 Last2")]
        [TestCase("First1 Last1 and First2 Last2", "First1 Last1", "First2 Last2")]
        public void should_split_concatenated_author(string inputString, string first, string second)
        {
            var input = new List<string> { inputString };
            var authors = DistanceCalculator.GetAuthorVariants(input);

            authors.Should().Contain(inputString);
            authors.Should().Contain(first);
            authors.Should().Contain(second);
            authors.Should().HaveCount(3);
        }

        [Test]
        public void should_split_concatenated_with_trailing_and()
        {
            var inputString = "First Last, First2 Last2 & First3 Last3";
            var input = new List<string> { inputString };
            var authors = DistanceCalculator.GetAuthorVariants(input);

            authors.Should().Contain(inputString);
            authors.Should().Contain("First Last");
            authors.Should().Contain("First2 Last2");
            authors.Should().Contain("First3 Last3");
            authors.Should().HaveCount(4);
        }

        [Test]
        public void should_not_split_if_multiple_input()
        {
            var input = new List<string>
            {
                "First Last",
                "Second Third, Fourth Fifth"
            };

            var authors = DistanceCalculator.GetAuthorVariants(input);

            authors.Should().HaveCount(2);
            authors.Should().Contain("First Last");
            authors.Should().Contain("Second Third, Fourth Fifth");
        }

        private static Edition GivenEdition(string title, string isbn = null)
        {
            var book = new Book
            {
                ForeignBookId = "1",
                Title = title,
                AuthorMetadata = new AuthorMetadata { Name = "C.S. Lewis" },
                SeriesLinks = new List<SeriesBookLink>()
            };

            return new Edition { Title = title, Isbn13 = isbn, Book = book };
        }

        private static List<LocalBook> GivenFiles(string bookTitle, string isbn = null)
        {
            return new List<LocalBook>
            {
                new LocalBook
                {
                    Path = "/books/C.S. Lewis/book.epub",
                    FileTrackInfo = new ParsedTrackInfo { BookTitle = bookTitle, Isbn = isbn, Authors = new List<string> { "C.S. Lewis" } }
                }
            };
        }

        [Test]
        public void should_not_match_titles_whose_bracketed_numbers_differ()
        {
            var match = DistanceCalculator.GetTitleMatch(GivenFiles("The Chronicles of Narnia (Book 5)"), GivenEdition("The Chronicles of Narnia (Book 6)"));

            match.Distance.Should().BeGreaterThan(0.2);
        }

        [Test]
        public void should_match_a_title_without_its_series_marker()
        {
            var match = DistanceCalculator.GetTitleMatch(GivenFiles("The Lion, the Witch and the Wardrobe"), GivenEdition("The Lion, the Witch and the Wardrobe (Chronicles of Narnia, #1)"));

            match.Distance.Should().Be(0);
        }

        [Test]
        public void should_count_an_isbn_10_tag_as_the_editions_isbn_13()
        {
            var distance = DistanceCalculator.BookDistance(GivenFiles("The Screwtape Letters", "1589973240"), GivenEdition("The Screwtape Letters", "9781589973244"));

            distance.Penalties["isbn"].Should().Equal(0.0);
        }
    }
}
