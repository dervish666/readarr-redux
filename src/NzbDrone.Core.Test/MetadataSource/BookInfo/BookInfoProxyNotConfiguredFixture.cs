using NUnit.Framework;
using NzbDrone.Core.MetadataSource;
using NzbDrone.Core.MetadataSource.BookInfo;
using NzbDrone.Core.MetadataSource.Goodreads;
using NzbDrone.Core.Test.Framework;

namespace NzbDrone.Core.Test.MetadataSource.Goodreads
{
    [TestFixture]
    public class BookInfoProxyNotConfiguredFixture : CoreTest<BookInfoProxy>
    {
        [SetUp]
        public void Setup()
        {
            Mocker.GetMock<IMetadataRequestBuilder>()
                .Setup(s => s.GetRequestBuilder())
                .Throws(new MetadataSourceNotConfiguredException("No metadata source is configured"));

            Mocker.SetConstant<IGoodreadsSearchProxy>(Mocker.Resolve<GoodreadsSearchProxy>());
        }

        [TestCase("dune")]
        [TestCase("isbn:9780441172719")]
        [TestCase("author:1654")]
        [TestCase("work:194190")]
        public void should_report_missing_metadata_source_instead_of_a_generic_search_error(string query)
        {
            Assert.Throws<MetadataSourceNotConfiguredException>(() => Subject.SearchForNewBook(query, null));
        }
    }
}
