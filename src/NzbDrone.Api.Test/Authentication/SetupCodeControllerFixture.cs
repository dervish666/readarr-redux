using System;
using System.Net;
using FluentAssertions;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Moq;
using NUnit.Framework;
using NzbDrone.Core.Authentication;
using NzbDrone.Core.Configuration;
using NzbDrone.Test.Common;
using Readarr.Http.Authentication;

namespace NzbDrone.Api.Test.Authentication
{
    [TestFixture]
    public class SetupCodeControllerFixture : TestBase
    {
        private SetupCodeController GetController(string remoteIp)
        {
            var httpContext = new DefaultHttpContext();
            httpContext.Connection.RemoteIpAddress = IPAddress.Parse(remoteIp);

            var controller = new SetupCodeController(Mocker.GetMock<ISetupCodeService>().Object,
                Mocker.GetMock<IConfigFileProvider>().Object,
                Mocker.GetMock<ILoginThrottle>().Object,
                TestLogger);

            controller.ControllerContext = new ControllerContext { HttpContext = httpContext };

            return controller;
        }

        private void GivenSetupCodeRequired(bool admitted = true)
        {
            Mocker.GetMock<ISetupCodeService>().SetupGet(s => s.IsRequired).Returns(true);
            Mocker.GetMock<ISetupCodeService>().Setup(s => s.Verify("ABCD-EFGH-JKLM")).Returns("proof");

            var delay = TimeSpan.FromSeconds(8);
            Mocker.GetMock<ILoginThrottle>()
                .Setup(s => s.TryBeginAttempt(It.IsAny<string>(), It.IsAny<string>(), out delay))
                .Returns(admitted);
        }

        [Test]
        public void should_set_the_setup_cookie_for_the_right_code()
        {
            GivenSetupCodeRequired();
            var controller = GetController("127.0.0.1");

            var result = controller.EnterCode("ABCD-EFGH-JKLM");

            result.Should().BeOfType<RedirectResult>().Which.Url.Should().Be("/");
            controller.Response.Headers.SetCookie.ToString().Should().Contain(UnconfiguredAuthenticationHandler.SetupCookieName + "=proof").And.Contain("httponly");
            Mocker.GetMock<ILoginThrottle>().Verify(v => v.EndAttempt("127.0.0.1", It.IsAny<string>(), true), Times.Once());
        }

        [Test]
        public void should_send_a_wrong_code_back_to_the_form_and_count_it()
        {
            GivenSetupCodeRequired();
            var controller = GetController("127.0.0.1");

            var result = controller.EnterCode("WRONG");

            result.Should().BeOfType<RedirectResult>().Which.Url.Should().Be("/?setupCodeFailed=true");
            controller.Response.Headers.SetCookie.ToString().Should().BeEmpty();
            Mocker.GetMock<ILoginThrottle>().Verify(v => v.EndAttempt("127.0.0.1", It.IsAny<string>(), false), Times.Once());
            ExceptionVerification.ExpectedWarns(1);
        }

        [Test]
        public void should_not_check_a_code_while_throttled()
        {
            GivenSetupCodeRequired(admitted: false);
            var controller = GetController("127.0.0.1");

            var result = controller.EnterCode("ABCD-EFGH-JKLM");

            result.Should().BeOfType<ObjectResult>().Which.StatusCode.Should().Be(StatusCodes.Status429TooManyRequests);
            Mocker.GetMock<ISetupCodeService>().Verify(v => v.Verify(It.IsAny<string>()), Times.Never());
        }

        [Test]
        public void should_refuse_a_public_address()
        {
            GivenSetupCodeRequired();
            var controller = GetController("203.0.113.66");

            controller.EnterCode("ABCD-EFGH-JKLM").Should().BeOfType<UnauthorizedObjectResult>();
            Mocker.GetMock<ISetupCodeService>().Verify(v => v.Verify(It.IsAny<string>()), Times.Never());
        }

        [Test]
        public void should_go_home_once_no_code_is_needed()
        {
            Mocker.GetMock<IConfigFileProvider>().SetupGet(s => s.UrlBase).Returns("/readarr");
            var controller = GetController("127.0.0.1");

            controller.EnterCode("anything").Should().BeOfType<RedirectResult>().Which.Url.Should().Be("/readarr/");
            Mocker.GetMock<ISetupCodeService>().Verify(v => v.Verify(It.IsAny<string>()), Times.Never());
        }
    }
}
