using FluentAssertions;
using NUnit.Framework;
using NzbDrone.Test.Common;
using Readarr.Api.V1.Queue;

namespace NzbDrone.Api.Test
{
    [TestFixture]
    public class QueueLastPageFixture : TestBase
    {
        [TestCase(21, 10, 3)]
        [TestCase(20, 10, 2)]
        [TestCase(1, 10, 1)]
        [TestCase(0, 10, 1)]
        [TestCase(10, 10, 1)]
        public void should_calculate_last_page(int totalRecords, int pageSize, int expectedPage)
        {
            QueueController.GetLastPage(totalRecords, pageSize).Should().Be(expectedPage);
        }
    }
}
