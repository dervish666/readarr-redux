using System;
using System.Collections.Generic;
using System.Linq;
using FluentAssertions;
using Moq;
using NUnit.Framework;
using NzbDrone.Core.Indexers;
using NzbDrone.Core.Jobs;
using NzbDrone.Core.Lifecycle;
using NzbDrone.Core.Test.Framework;
using NzbDrone.Test.Common;

namespace NzbDrone.Core.Test.JobTests
{
    [TestFixture]
    public class TaskManagerFixture : CoreTest<TaskManager>
    {
        [Test]
        public void should_register_every_task_even_if_saving_one_fails()
        {
            Mocker.GetMock<IScheduledTaskRepository>()
                .Setup(s => s.All())
                .Returns(new List<ScheduledTask>());

            Mocker.GetMock<IScheduledTaskRepository>()
                .Setup(s => s.Upsert(It.IsAny<ScheduledTask>()))
                .Throws(new InvalidOperationException("database is locked"));

            Subject.Handle(new ApplicationStartedEvent());

            var registered = Subject.GetAll().Select(t => t.TypeName).ToList();

            registered.Should().Contain(typeof(RssSyncCommand).FullName);
            registered.Should().HaveCountGreaterThan(5);
            ExceptionVerification.IgnoreWarns();
        }
    }
}
