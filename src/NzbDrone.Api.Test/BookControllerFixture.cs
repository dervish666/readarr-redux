using FizzWare.NBuilder;
using FluentAssertions;
using NUnit.Framework;
using NzbDrone.Core.Books;
using NzbDrone.Core.MediaFiles;
using NzbDrone.Core.MediaFiles.Events;
using NzbDrone.Test.Common;
using Readarr.Api.V1.Books;

namespace NzbDrone.Api.Test
{
    [TestFixture]
    public class BookControllerFixture : TestBase<BookController>
    {
        [Test]
        public void should_not_throw_when_a_deleted_file_belongs_to_a_book_that_is_gone()
        {
            // A row left behind by a deleted book still points at its edition, which no longer loads
            var bookFile = Builder<BookFile>.CreateNew()
                .With(f => f.EditionId = 5)
                .With(f => f.Edition = (Edition)null)
                .With(f => f.Author = (Author)null)
                .Build();

            Subject.Invoking(s => s.Handle(new BookFileDeletedEvent(bookFile, DeleteMediaFileReason.Manual)))
                .Should().NotThrow();
        }
    }
}
