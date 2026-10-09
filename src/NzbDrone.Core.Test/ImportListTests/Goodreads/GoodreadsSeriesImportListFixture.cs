using System;
using System.Collections.Generic;
using System.Linq;
using FluentAssertions;
using Moq;
using NUnit.Framework;
using NzbDrone.Core.ImportLists;
using NzbDrone.Core.ImportLists.Goodreads;
using NzbDrone.Core.MetadataSource;
using NzbDrone.Core.MetadataSource.BookInfo;
using NzbDrone.Core.Test.Framework;
using NzbDrone.Test.Common;

namespace NzbDrone.Core.Test.ImportListTests.Goodreads
{
    [TestFixture]
    public class GoodreadsSeriesImportListFixture : CoreTest<GoodreadsSeriesImportList>
    {
        [SetUp]
        public void Setup()
        {
            Subject.Definition = new ImportListDefinition
            {
                Id = 1,
                Name = "Discworld",
                Settings = new GoodreadsSeriesImportListSettings { SeriesId = 40650 }
            };
        }

        [Test]
        public void should_return_one_item_per_work_in_the_series()
        {
            Mocker.GetMock<IProvideSeriesInfo>()
                .Setup(v => v.GetSeriesInfo(40650, true))
                .Returns(new SeriesResource
                {
                    ForeignId = 40650,
                    Title = "Discworld",
                    LinkItems = new List<SeriesWorkLinkResource>
                    {
                        new SeriesWorkLinkResource { ForeignWorkId = 194190, PositionInSeries = "1" },
                        new SeriesWorkLinkResource { ForeignWorkId = 592532, PositionInSeries = "2" },
                        new SeriesWorkLinkResource { ForeignWorkId = 583611, PositionInSeries = "3" }
                    }
                });

            var items = Subject.Fetch();

            items.Select(x => x.BookGoodreadsId).Should().Equal("194190", "592532", "583611");
            items.Should().OnlyContain(x => x.ImportListId == 1);
        }

        [Test]
        public void should_take_series_ids_too_big_for_an_int()
        {
            Subject.Definition.Settings = new GoodreadsSeriesImportListSettings { SeriesId = 3000000000 };

            Mocker.GetMock<IProvideSeriesInfo>()
                .Setup(v => v.GetSeriesInfo(3000000000, true))
                .Returns(new SeriesResource
                {
                    ForeignId = 3000000000,
                    LinkItems = new List<SeriesWorkLinkResource> { new SeriesWorkLinkResource { ForeignWorkId = 3000000001 } }
                });

            Subject.Fetch().Single().BookGoodreadsId.Should().Be("3000000001");
        }

        [Test]
        public void should_log_and_record_failure_when_series_fetch_fails()
        {
            Mocker.GetMock<IProvideSeriesInfo>()
                .Setup(v => v.GetSeriesInfo(40650, true))
                .Throws(new InvalidOperationException("metadata source down"));

            Subject.Fetch().Should().BeEmpty();

            Mocker.GetMock<IImportListStatusService>()
                .Verify(v => v.RecordFailure(1, It.IsAny<TimeSpan>()), Times.Once());
            ExceptionVerification.ExpectedWarns(1);
        }
    }
}
