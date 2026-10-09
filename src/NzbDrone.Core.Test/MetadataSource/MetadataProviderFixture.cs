using System.Collections.Generic;
using FluentAssertions;
using NUnit.Framework;
using NzbDrone.Core.Books;
using NzbDrone.Core.MetadataSource;
using NzbDrone.Core.Test.Framework;

namespace NzbDrone.Core.Test.MetadataSource
{
    [TestFixture]
    public class MetadataProviderFixture : CoreTest
    {
        [TestCase("https://www.goodreads.com/book/show/13153953", "Goodreads")]
        [TestCase("https://goodreads.com/author/show/1654.Terry_Pratchett", "Goodreads")]
        [TestCase("https://hardcover.app/books/dune", "Hardcover")]
        [TestCase("https://openlibrary.org/works/OL893415W", "openlibrary.org")]
        [TestCase("/book/show/1", null)]
        [TestCase(null, null)]
        public void should_name_provider_from_link(string url, string expected)
        {
            MetadataProvider.NameFromUrl(url).Should().Be(expected);
        }

        [TestCase("https://www.goodreads.com/book/show/13153953", "goodreads")]
        [TestCase("https://hardcover.app/books/dune", "hardcover")]
        public void should_key_identifier_by_the_provider_the_edition_came_from(string url, string expected)
        {
            var edition = new Edition { ForeignEditionId = "1", Links = new List<Links> { new Links { Url = url, Name = "Book" } } };

            MetadataProvider.IdentifierKey(edition).Should().Be(expected);
        }

        [Test]
        public void should_key_identifier_as_goodreads_when_edition_has_no_links()
        {
            MetadataProvider.IdentifierKey(new Edition { ForeignEditionId = "1", Links = new List<Links>() }).Should().Be("goodreads");
        }
    }
}
