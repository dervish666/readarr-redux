using System;
using System.Collections.Generic;
using FluentAssertions;
using Moq;
using NUnit.Framework;
using NzbDrone.Common.Cache;
using NzbDrone.Common.Messaging;
using NzbDrone.Core.HealthCheck;
using NzbDrone.Core.Localization;
using NzbDrone.Core.Messaging.Commands;
using NzbDrone.Core.Messaging.Events;
using NzbDrone.Core.Test.Framework;
using NzbDrone.Test.Common;

namespace NzbDrone.Core.Test.HealthCheck
{
    public class HealthCheckServiceFixture : CoreTest<HealthCheckService>
    {
        private FakeHealthCheck _healthCheck;

        [SetUp]
        public void SetUp()
        {
            _healthCheck = new FakeHealthCheck();

            Mocker.SetConstant<IEnumerable<IProvideHealthCheck>>(new[] { _healthCheck });
            Mocker.SetConstant<ICacheManager>(Mocker.Resolve<CacheManager>());

            Mocker.GetMock<IServerSideNotificationService>()
                .Setup(v => v.GetServerChecks())
                .Returns(new List<Core.HealthCheck.HealthCheck>());
        }

        [Test]
        public void should_not_execute_conditional()
        {
            Subject.HandleAsync(new FakeEvent());

            _healthCheck.Executed.Should().BeFalse();
        }

        [Test]
        public void should_execute_conditional()
        {
            Subject.HandleAsync(new FakeEvent() { ShouldExecute = true });

            _healthCheck.Executed.Should().BeTrue();
        }

        [Test]
        public void should_execute_unconditional()
        {
            Subject.HandleAsync(new FakeEvent2());

            _healthCheck.Executed.Should().BeTrue();
        }
    }

    public class FakeEvent : IEvent
    {
        public bool ShouldExecute { get; set; }
    }

    public class FakeEvent2 : IEvent
    {
        public bool ShouldExecute { get; set; }
    }

    [CheckOn(typeof(FakeEvent))]
    [CheckOn(typeof(FakeEvent2))]
    public class FakeHealthCheck : IProvideHealthCheck, ICheckOnCondition<FakeEvent>
    {
        public bool CheckOnStartup => false;
        public bool CheckOnSchedule => false;

        public bool Executed { get; set; }
        public bool Checked { get; set; }

        public Core.HealthCheck.HealthCheck Check()
        {
            Executed = true;

            return new Core.HealthCheck.HealthCheck(GetType());
        }

        public bool ShouldCheckOnEvent(FakeEvent message)
        {
            return message.ShouldExecute;
        }
    }

    public class ThrowingHealthCheck : IProvideHealthCheck
    {
        public bool CheckOnStartup => true;
        public bool CheckOnSchedule => true;

        public Core.HealthCheck.HealthCheck Check()
        {
            throw new InvalidOperationException("boom");
        }
    }

    public class HealthCheckServiceThrowingCheckFixture : CoreTest<HealthCheckService>
    {
        private FakeHealthCheck _healthCheck;

        [SetUp]
        public void SetUp()
        {
            _healthCheck = new FakeHealthCheck();

            Mocker.SetConstant<IEnumerable<IProvideHealthCheck>>(new IProvideHealthCheck[] { new ThrowingHealthCheck(), _healthCheck });
            Mocker.SetConstant<ICacheManager>(Mocker.Resolve<CacheManager>());

            Mocker.GetMock<IServerSideNotificationService>()
                .Setup(v => v.GetServerChecks())
                .Returns(new List<Core.HealthCheck.HealthCheck>());

            Mocker.GetMock<ILocalizationService>()
                .Setup(v => v.GetLocalizedString("HealthCheckFailedToRun"))
                .Returns("Health check {0} failed to run: {1}");
        }

        [Test]
        public void should_run_remaining_checks_and_report_an_error_when_a_check_throws()
        {
            Subject.Execute(new CheckHealthCommand { Trigger = CommandTrigger.Manual });

            _healthCheck.Executed.Should().BeTrue();

            var result = Subject.Results().Should().ContainSingle().Subject;
            result.Source.Should().Be(typeof(ThrowingHealthCheck));
            result.Type.Should().Be(HealthCheckResult.Error);
            result.Message.Should().Be("Health check ThrowingHealthCheck failed to run: boom");

            Mocker.GetMock<IEventAggregator>()
                .Verify(v => v.PublishEvent(It.IsAny<HealthCheckCompleteEvent>()), Times.Once());

            ExceptionVerification.ExpectedErrors(1);
        }
    }
}
