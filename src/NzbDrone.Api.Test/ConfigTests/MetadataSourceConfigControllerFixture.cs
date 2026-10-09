using System;
using System.Collections.Generic;
using FluentAssertions;
using FluentValidation;
using Moq;
using NUnit.Framework;
using NzbDrone.Common.Cache;
using NzbDrone.Common.Http;
using NzbDrone.Core.Configuration;
using NzbDrone.Core.MetadataSource;
using NzbDrone.Test.Common;
using Readarr.Api.V1.Config;

namespace NzbDrone.Api.Test.ConfigTests
{
    [TestFixture]
    public class MetadataSourceConfigControllerFixture : TestBase<MetadataSourceConfigController>
    {
        [SetUp]
        public void Setup()
        {
            Mocker.SetConstant<ICacheManager>(Mocker.Resolve<CacheManager>());
            Mocker.SetConstant<IMetadataSourceProbeService>(Mocker.Resolve<MetadataSourceProbeService>());
        }

        private void VerifyNothingSentOrSaved()
        {
            Mocker.GetMock<IHttpClient>()
                  .Verify(s => s.Execute(It.IsAny<HttpRequest>()), Times.Never());

            Mocker.GetMock<IConfigService>()
                  .Verify(s => s.SaveConfigDictionary(It.IsAny<Dictionary<string, object>>()), Times.Never());
        }

        [TestCase("http://user:secret@metadata.local:8790")]
        [TestCase("http://user@metadata.local:8790")]
        [TestCase("http://metadata.local:8790/?source=1")]
        [TestCase("http://metadata.local:8790/#top")]
        [TestCase("http://bücher.example:8790")]
        public void saving_a_url_the_metadata_client_cannot_use_should_be_a_validation_error(string url)
        {
            Action act = () => Subject.SaveConfig(new MetadataSourceConfigResource { Id = 1, MetadataSource = url });

            act.Should().Throw<ValidationException>();
            VerifyNothingSentOrSaved();
        }

        [TestCase("http://user:secret@metadata.local:8790")]
        [TestCase("http://bücher.example:8790")]
        public void testing_a_url_the_metadata_client_cannot_use_should_report_invalid_url(string url)
        {
            Subject.Test(new MetadataSourceConfigResource { MetadataSource = url })
                   .Status.Should().Be(MetadataSourceProbeStatus.InvalidUrl);

            VerifyNothingSentOrSaved();
        }
    }
}
