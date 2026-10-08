using System;
using System.Collections.Generic;
using FluentAssertions;
using NUnit.Framework;
using NzbDrone.Core.Datastore;
using NzbDrone.Core.Jobs;
using NzbDrone.Test.Common;
using Readarr.Http;

namespace NzbDrone.Api.Test
{
    [TestFixture]
    public class PagingResourceMapperFixture : TestBase
    {
        private static readonly HashSet<string> AllowedSortKeys = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
        {
            "authorMetadata.sortName",
            "date"
        };

        private static PagingSpec<ScheduledTask> Map(string sortKey, SortDirection? sortDirection, HashSet<string> allowedSortKeys)
        {
            var pagingResource = new PagingResource<object>(new PagingRequestResource
            {
                SortKey = sortKey,
                SortDirection = sortDirection
            });

            return pagingResource.MapToPagingSpec<object, ScheduledTask>(allowedSortKeys, "date", SortDirection.Descending);
        }

        [TestCase("date")]
        [TestCase("authorMetadata.sortName")]
        [TestCase("AUTHORMETADATA.SORTNAME")]
        public void should_keep_allowed_sort_key(string sortKey)
        {
            Map(sortKey, SortDirection.Ascending, AllowedSortKeys).SortKey.Should().Be(sortKey);
        }

        [TestCase("Id\" DESC; DELETE FROM \"Config\"; --")]
        [TestCase("authorMetadata.sortName\"--")]
        [TestCase("books.title")]
        [TestCase("")]
        public void should_use_default_sort_key_for_unknown_sort_key(string sortKey)
        {
            Map(sortKey, SortDirection.Ascending, AllowedSortKeys).SortKey.Should().Be("date");
        }

        [Test]
        public void should_use_default_sort_key_when_none_requested()
        {
            Map(null, null, AllowedSortKeys).SortKey.Should().Be("date");
        }

        [Test]
        public void should_use_default_sort_key_when_no_keys_are_allowed()
        {
            Map("date", SortDirection.Ascending, null).SortKey.Should().Be("date");
            Map("authorMetadata.sortName", SortDirection.Ascending, null).SortKey.Should().Be("date");
        }

        [Test]
        public void should_use_default_sort_direction_when_default_requested()
        {
            Map("authorMetadata.sortName", SortDirection.Default, AllowedSortKeys).SortDirection.Should().Be(SortDirection.Descending);
            Map("authorMetadata.sortName", SortDirection.Ascending, AllowedSortKeys).SortDirection.Should().Be(SortDirection.Ascending);
        }
    }
}
