using System;
using FluentAssertions;
using NUnit.Framework;
using NzbDrone.Core.Configuration;
using NzbDrone.Core.MetadataSource;
using NzbDrone.Core.Test.Framework;

namespace NzbDrone.Core.Test.MetadataSource
{
    [TestFixture]
    public class MetadataRequestBuilderFixture : CoreTest<MetadataRequestBuilder>
    {
        private void GivenMetadataSource(string url)
        {
            Mocker.GetMock<IConfigService>()
                .Setup(s => s.MetadataSource)
                .Returns(url);
        }

        [TestCase]
        public void should_use_user_definied_if_not_blank()
        {
            GivenMetadataSource("http://api.readarr.com/api/testing/");

            var details = Subject.GetRequestBuilder().Create();

            details.BaseUrl.ToString().Should().Contain("testing");
        }

        [TestCase(null)]
        [TestCase("")]
        [TestCase("  ")]
        public void should_throw_not_configured_if_config_blank(string url)
        {
            GivenMetadataSource(url);

            Action act = () => Subject.GetRequestBuilder();

            act.Should().Throw<MetadataSourceNotConfiguredException>();
        }
    }
}
