using System;
using FizzWare.NBuilder;
using FluentAssertions;
using NUnit.Framework;
using NzbDrone.Core.Books;
using NzbDrone.Core.Test.Framework;

namespace NzbDrone.Core.Test.MusicTests
{
    [TestFixture]
    public class MissingBookTrackerFixture : CoreTest<MissingBookTracker>
    {
        private readonly DateTime _start = new DateTime(2026, 10, 17, 12, 0, 0, DateTimeKind.Utc);
        private Book _book;

        [SetUp]
        public void Setup()
        {
            _book = Builder<Book>.CreateNew().With(b => b.Id = 7).Build();
        }

        [Test]
        public void should_not_delete_the_first_time_a_book_is_missing()
        {
            Subject.MissingLongEnough(_book, _start).Should().BeFalse();
        }

        [Test]
        public void should_not_delete_when_missing_again_within_the_grace_period()
        {
            Subject.MissingLongEnough(_book, _start);

            Subject.MissingLongEnough(_book, _start + MissingBookTracker.Grace - TimeSpan.FromMinutes(1)).Should().BeFalse();
        }

        [Test]
        public void should_delete_when_still_missing_after_the_grace_period()
        {
            Subject.MissingLongEnough(_book, _start);

            Subject.MissingLongEnough(_book, _start + MissingBookTracker.Grace).Should().BeTrue();
        }

        [Test]
        public void should_start_again_once_the_book_is_found()
        {
            Subject.MissingLongEnough(_book, _start);
            Subject.Found(_book);

            Subject.MissingLongEnough(_book, _start + MissingBookTracker.Grace).Should().BeFalse();
        }
    }
}
