using System.Collections.Generic;
using Moq;
using NUnit.Framework;
using NzbDrone.Common.Serializer;
using NzbDrone.Core.Configuration;
using NzbDrone.Test.Common;
using Prowlarr.Api.V1.Config;

namespace NzbDrone.Api.Test.ConfigTests
{
    [TestFixture]
    public class DevelopmentConfigControllerFixture : TestBase<DevelopmentConfigController>
    {
        [Test]
        public void saving_should_not_touch_the_metadata_source()
        {
            // What a Development tab opened before the source changed on the Metadata Source page still sends
            var resource = STJson.Deserialize<DevelopmentConfigResource>(
                "{\"id\":1,\"metadataSource\":\"http://stale.local:8790\",\"consoleLogLevel\":\"info\",\"logSql\":false,\"logRotate\":50,\"filterSentryEvents\":true}");

            Subject.SaveDevelopmentConfig(resource);

            Mocker.GetMock<IConfigService>()
                  .Verify(s => s.SaveConfigDictionary(It.Is<Dictionary<string, object>>(d => d.ContainsKey("MetadataSource"))), Times.Never());

            Mocker.GetMock<IConfigFileProvider>()
                  .Verify(s => s.SaveConfigDictionary(It.Is<Dictionary<string, object>>(d => d.ContainsKey("MetadataSource"))), Times.Never());
        }
    }
}
