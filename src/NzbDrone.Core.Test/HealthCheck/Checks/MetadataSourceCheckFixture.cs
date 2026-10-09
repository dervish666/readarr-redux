using System.Collections.Generic;
using FluentAssertions;
using Moq;
using NUnit.Framework;
using NzbDrone.Core.Configuration;
using NzbDrone.Core.HealthCheck.Checks;
using NzbDrone.Core.Localization;
using NzbDrone.Core.MetadataSource;
using NzbDrone.Core.Test.Framework;

namespace NzbDrone.Core.Test.HealthCheck.Checks
{
    [TestFixture]
    public class MetadataSourceCheckFixture : CoreTest<MetadataSourceCheck>
    {
        private const string SourceUrl = "http://metadata.local:8790";

        [SetUp]
        public void Setup()
        {
            Mocker.GetMock<IConfigService>()
                  .Setup(s => s.MetadataSource)
                  .Returns(SourceUrl);

            // Echo the key plus any nested message so a test can tell which string the check picked
            Mocker.GetMock<ILocalizationService>()
                  .Setup(s => s.GetLocalizedString(It.IsAny<string>()))
                  .Returns<string>(key => key);

            Mocker.GetMock<ILocalizationService>()
                  .Setup(s => s.GetLocalizedString(It.IsAny<string>(), It.IsAny<Dictionary<string, object>>()))
                  .Returns<string, Dictionary<string, object>>((key, tokens) =>
                      tokens.TryGetValue("message", out var message) ? $"{key} {message}" : key);
        }

        private void GivenProbe(MetadataSourceProbeStatus status, int? statusCode = null)
        {
            Mocker.GetMock<IMetadataSourceProbeService>()
                  .Setup(s => s.GetCachedProbe(It.IsAny<string>()))
                  .Returns<string>(url => new MetadataSourceProbeResult { Url = url, Status = status, StatusCode = statusCode });
        }

        [Test]
        public void should_be_ok_when_the_source_serves_data()
        {
            GivenProbe(MetadataSourceProbeStatus.Ok, 200);

            Subject.Check().ShouldBeOk();
        }

        [Test]
        public void should_probe_the_configured_source_through_the_cache()
        {
            GivenProbe(MetadataSourceProbeStatus.Ok, 200);

            Subject.Check();

            Mocker.GetMock<IMetadataSourceProbeService>()
                  .Verify(s => s.GetCachedProbe(SourceUrl), Times.Once());

            Mocker.GetMock<IMetadataSourceProbeService>()
                  .Verify(s => s.Probe(It.IsAny<string>()), Times.Never());
        }

        [Test]
        public void should_warn_when_not_configured()
        {
            GivenProbe(MetadataSourceProbeStatus.NotConfigured);

            Subject.Check().ShouldBeWarning("MetadataSourceCheckNotConfiguredMessage");
        }

        [Test]
        public void should_error_when_unreachable()
        {
            GivenProbe(MetadataSourceProbeStatus.Unreachable);

            Subject.Check().ShouldBeError("MetadataSourceStatusUnreachable");
        }

        [Test]
        public void should_error_on_upstream_auth_failure()
        {
            GivenProbe(MetadataSourceProbeStatus.AuthFailure, 401);

            Subject.Check().ShouldBeError("MetadataSourceStatusAuthFailure");
        }

        [Test]
        public void should_warn_on_server_errors()
        {
            GivenProbe(MetadataSourceProbeStatus.ServerError, 502);

            Subject.Check().ShouldBeWarning("MetadataSourceStatusServerError");
        }

        [Test]
        public void should_warn_when_rate_limited()
        {
            GivenProbe(MetadataSourceProbeStatus.RateLimited, 429);

            Subject.Check().ShouldBeWarning("MetadataSourceStatusRateLimited");
        }

        [Test]
        public void should_error_on_404_for_the_known_work()
        {
            GivenProbe(MetadataSourceProbeStatus.NotFound, 404);

            Subject.Check().ShouldBeError("MetadataSourceStatusNotFound");
        }

        [Test]
        public void should_error_on_unexpected_response()
        {
            GivenProbe(MetadataSourceProbeStatus.UnexpectedResponse, 200);

            Subject.Check().ShouldBeError("MetadataSourceStatusUnexpectedResponse");
        }

        [Test]
        public void should_error_on_invalid_url()
        {
            GivenProbe(MetadataSourceProbeStatus.InvalidUrl);

            Subject.Check().ShouldBeError("MetadataSourceStatusInvalidUrl");
        }

        [TestCase(MetadataSourceProbeStatus.Unreachable)]
        [TestCase(MetadataSourceProbeStatus.AuthFailure)]
        [TestCase(MetadataSourceProbeStatus.ServerError)]
        [TestCase(MetadataSourceProbeStatus.RateLimited)]
        [TestCase(MetadataSourceProbeStatus.NotFound)]
        [TestCase(MetadataSourceProbeStatus.UnexpectedResponse)]
        [TestCase(MetadataSourceProbeStatus.InvalidUrl)]
        public void failure_messages_should_point_at_the_settings_page(MetadataSourceProbeStatus status)
        {
            GivenProbe(status, 500);

            Subject.Check().Message.Should().StartWith("MetadataSourceCheckMessage");
        }
    }
}
