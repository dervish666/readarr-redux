using System.Collections.Generic;
using FizzWare.NBuilder;
using Moq;
using NUnit.Framework;
using NzbDrone.Core.Books;
using NzbDrone.Core.MediaFiles;
using NzbDrone.Core.MediaFiles.Events;
using NzbDrone.Core.Notifications;
using NzbDrone.Core.Test.Framework;

namespace NzbDrone.Core.Test.NotificationTests
{
    [TestFixture]
    public class NotificationServiceFixture : CoreTest<NotificationService>
    {
        [Test]
        public void should_not_notify_deleting_a_file_whose_book_is_gone()
        {
            var notification = new Mock<INotification>();
            notification.SetupGet(s => s.Definition).Returns(new NotificationDefinition { Id = 1, Name = "Test" });

            Mocker.GetMock<INotificationFactory>()
                .Setup(s => s.OnBookFileDeleteEnabled(It.IsAny<bool>()))
                .Returns(new List<INotification> { notification.Object });

            // A row left behind by a deleted book still points at its edition, which no longer loads
            var bookFile = Builder<BookFile>.CreateNew()
                .With(f => f.EditionId = 5)
                .With(f => f.Edition = (Edition)null)
                .With(f => f.Author = (Author)null)
                .Build();

            Subject.Handle(new BookFileDeletedEvent(bookFile, DeleteMediaFileReason.Manual));

            notification.Verify(v => v.OnBookFileDelete(It.IsAny<BookFileDeleteMessage>()), Times.Never());
        }
    }
}
