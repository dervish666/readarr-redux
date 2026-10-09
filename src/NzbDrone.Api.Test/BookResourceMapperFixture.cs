using System.Collections.Generic;
using FluentAssertions;
using NUnit.Framework;
using NzbDrone.Core.Books;
using NzbDrone.Core.MediaCover;
using NzbDrone.Test.Common;
using Readarr.Api.V1.Books;

namespace NzbDrone.Api.Test
{
    [TestFixture]
    public class BookResourceMapperFixture : TestBase
    {
        // Lookup results can be the same objects BookInfoProxy holds in its author cache. The lookup endpoints rewrite
        // resource cover URLs to the proxy path, which must not reach the cached book that a later add or refresh uses.
        [Test]
        public void should_not_share_cover_objects_with_the_book()
        {
            var cover = new MediaCover(MediaCoverTypes.Cover, "https://images.example/1.jpg");
            var book = new Book
            {
                Title = "The Colour of Magic",
                Editions = new List<Edition>
                {
                    new Edition { Monitored = true, Title = "The Colour of Magic", Images = new List<MediaCover> { cover } }
                }
            };

            var resource = book.ToResource();

            resource.Images[0].RemoteUrl = resource.Images[0].Url;
            resource.Images[0].Url = "/MediaCoverProxy/abc/1.jpg";

            cover.Url.Should().Be("https://images.example/1.jpg");
            cover.RemoteUrl.Should().BeNull();
        }
    }
}
