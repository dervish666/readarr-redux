using System.Text.Json;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc;
using NUnit.Framework;
using NzbDrone.Core.Configuration;
using NzbDrone.Test.Common;
using Readarr.Http.Frontend;

namespace NzbDrone.Api.Test.Frontend
{
    [TestFixture]
    public class InitializeJsonControllerFixture : TestBase<InitializeJsonController>
    {
        [TestCase("Readarr \"Upstairs\"")]
        [TestCase("Readarr \\ books\nnext line")]
        [TestCase("Readarr 日本語")]
        public void should_serialize_instance_names_without_breaking_initialization(string name)
        {
            Mocker.GetMock<IConfigFileProvider>().SetupGet(x => x.InstanceName).Returns(name);
            Mocker.GetMock<IConfigFileProvider>().SetupGet(x => x.Branch).Returns("develop");
            var response = (ContentResult)Subject.Index();
            using var json = JsonDocument.Parse(response.Content);

            json.RootElement.GetProperty("instanceName").GetString().Should().Be(name);
            json.RootElement.GetProperty("analytics").ValueKind.Should().Be(JsonValueKind.False);
        }
    }
}
