using System;
using System.Security.Claims;
using FluentAssertions;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using Moq;
using NUnit.Framework;
using NzbDrone.Core.Authentication;
using NzbDrone.Core.Configuration;
using Readarr.Http.Authentication;

namespace NzbDrone.Api.Test.Authentication
{
    // Runs the forms cookie options exactly as AddAppAuthentication configures them
    [TestFixture]
    public class SessionValidationFixture
    {
        private Guid _currentIdentifier;
        private ServiceProvider _serviceProvider;

        [SetUp]
        public void Setup()
        {
            _currentIdentifier = Guid.NewGuid();

            var configFileProvider = new Mock<IConfigFileProvider>();
            configFileProvider.SetupGet(s => s.InstanceName).Returns("Readarr");

            var userService = new Mock<IUserService>();
            userService.Setup(s => s.FindUser(It.IsAny<Guid>()))
                .Returns<Guid>(id => id == _currentIdentifier ? new User { Identifier = id, Username = "sam" } : null);

            var services = new ServiceCollection();
            services.AddLogging();
            services.AddDataProtection();
            services.AddSingleton(configFileProvider.Object);
            services.AddSingleton(userService.Object);
            services.AddAppAuthentication();

            _serviceProvider = services.BuildServiceProvider();
        }

        [TearDown]
        public void TearDown()
        {
            _serviceProvider.Dispose();
        }

        private ClaimsPrincipal Validate(Guid? identifier)
        {
            var options = _serviceProvider.GetRequiredService<IOptionsMonitor<CookieAuthenticationOptions>>().Get(AuthenticationType.Forms.ToString());

            var claims = new[] { new Claim("user", "sam"), new Claim("AuthType", AuthenticationType.Forms.ToString()) };
            var identity = new ClaimsIdentity(claims, "Cookies", "user", "identifier");

            if (identifier.HasValue)
            {
                identity.AddClaim(new Claim("identifier", identifier.Value.ToString()));
            }

            var httpContext = new DefaultHttpContext { RequestServices = _serviceProvider };
            var scheme = new AuthenticationScheme(AuthenticationType.Forms.ToString(), null, typeof(CookieAuthenticationHandler));
            var ticket = new AuthenticationTicket(new ClaimsPrincipal(identity), AuthenticationType.Forms.ToString());
            var context = new CookieValidatePrincipalContext(httpContext, scheme, options, ticket);

            options.Events.ValidatePrincipal(context).GetAwaiter().GetResult();

            return context.Principal;
        }

        [Test]
        public void should_accept_cookie_for_current_session()
        {
            Validate(_currentIdentifier).Should().NotBeNull();
        }

        [Test]
        public void should_reject_cookie_issued_before_credentials_changed()
        {
            var issuedWith = _currentIdentifier;

            _currentIdentifier = Guid.NewGuid();

            Validate(issuedWith).Should().BeNull();
        }

        [Test]
        public void should_reject_cookie_without_identifier()
        {
            Validate(null).Should().BeNull();
        }
    }
}
