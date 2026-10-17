using NUnit.Framework;
using NzbDrone.Core.Authentication;
using NzbDrone.Core.Configuration;
using NzbDrone.Core.HealthCheck.Checks;
using NzbDrone.Core.Localization;
using NzbDrone.Core.Test.Framework;
using NzbDrone.Test.Common;

namespace NzbDrone.Core.Test.HealthCheck.Checks
{
    [TestFixture]
    public class AuthenticationNotSetUpCheckFixture : CoreTest<AuthenticationNotSetUpCheck>
    {
        [SetUp]
        public void Setup()
        {
            Mocker.GetMock<ILocalizationService>()
                  .Setup(s => s.GetLocalizedString("AuthenticationNotSetUpCheckMessage"))
                  .Returns("No login is set up");
        }

        private void GivenAuthenticationMethod(AuthenticationType method)
        {
            Mocker.GetMock<IConfigFileProvider>()
                  .SetupGet(s => s.AuthenticationMethod)
                  .Returns(method);
        }

        [Test]
        public void should_return_error_and_log_a_warning_when_no_login_is_set_up()
        {
            GivenAuthenticationMethod(AuthenticationType.None);

            Subject.Check().ShouldBeError("No login is set up");

            ExceptionVerification.ExpectedWarns(1);
        }

        [TestCase(AuthenticationType.Forms)]
        [TestCase(AuthenticationType.Basic)]
        [TestCase(AuthenticationType.External)]
        public void should_return_ok_when_a_login_is_set_up(AuthenticationType method)
        {
            GivenAuthenticationMethod(method);

            Subject.Check().ShouldBeOk();
        }
    }
}
