using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Reflection;
using System.Security.Cryptography;
using System.Security.Cryptography.X509Certificates;
using FluentAssertions;
using FluentValidation;
using FluentValidation.Results;
using Moq;
using NUnit.Framework;
using NzbDrone.Common.Disk;
using NzbDrone.Core.Authentication;
using NzbDrone.Core.Configuration;
using NzbDrone.Test.Common;
using Readarr.Api.V1.Config;
using Readarr.Http.REST;

namespace NzbDrone.Api.Test.ConfigTests
{
    [TestFixture]
    public class HostConfigControllerFixture : TestBase<HostConfigController>
    {
        private const string StoredHash = "c3RvcmVkIGhhc2g=";

        [SetUp]
        public void Setup()
        {
            Mocker.GetMock<IUserService>()
                .Setup(s => s.FindUser())
                .Returns(new User { Identifier = Guid.NewGuid(), Username = "sam", Password = StoredHash, Salt = "c2FsdA==", Iterations = 10000 });
        }

        [Test]
        public void get_should_not_return_stored_password_hash()
        {
            var resource = Subject.GetHostConfig();

            resource.Username.Should().Be("sam");
            resource.Password.Should().NotBe(StoredHash);
            resource.Password.Should().Be("********");
        }

        [Test]
        public void get_should_return_empty_password_without_user()
        {
            Mocker.GetMock<IUserService>()
                .Setup(s => s.FindUser())
                .Returns((User)null);

            Subject.GetHostConfig().Password.Should().BeEmpty();
        }

        [Test]
        public void saving_unchanged_password_should_keep_it()
        {
            var resource = Subject.GetHostConfig();
            resource.Username = "dervish";

            Subject.SaveHostConfig(resource);

            Mocker.GetMock<IUserService>()
                .Verify(v => v.Upsert("dervish", null), Times.Once());
        }

        [Test]
        public void saving_new_password_should_pass_it_on()
        {
            var resource = Subject.GetHostConfig();
            resource.Password = "hunter2";
            resource.PasswordConfirmation = "hunter2";

            Subject.SaveHostConfig(resource);

            Mocker.GetMock<IUserService>()
                .Verify(v => v.Upsert("sam", "hunter2"), Times.Once());
        }

        private void GivenSecrets(string sslCertPassword, string proxyPassword)
        {
            Mocker.GetMock<IConfigFileProvider>().SetupGet(s => s.SslCertPassword).Returns(sslCertPassword);
            Mocker.GetMock<IConfigService>().SetupGet(s => s.ProxyPassword).Returns(proxyPassword);
        }

        private static bool Has(Dictionary<string, object> dictionary, string key, string value)
        {
            return dictionary.TryGetValue(key, out var actual) && (string)actual == value;
        }

        [Test]
        public void get_should_not_return_ssl_cert_or_proxy_password()
        {
            GivenSecrets("cert-secret", "proxy-secret");

            var resource = Subject.GetHostConfig();

            resource.SslCertPassword.Should().Be("********");
            resource.ProxyPassword.Should().Be("********");
        }

        [Test]
        public void get_should_return_empty_ssl_cert_and_proxy_password_when_not_set()
        {
            GivenSecrets(string.Empty, string.Empty);

            var resource = Subject.GetHostConfig();

            resource.SslCertPassword.Should().BeEmpty();
            resource.ProxyPassword.Should().BeEmpty();
        }

        [Test]
        public void saving_unchanged_secrets_should_keep_stored_values()
        {
            GivenSecrets("cert-secret", "proxy-secret");

            Subject.SaveHostConfig(Subject.GetHostConfig());

            Mocker.GetMock<IConfigFileProvider>()
                .Verify(v => v.SaveConfigDictionary(It.Is<Dictionary<string, object>>(d => Has(d, "SslCertPassword", "cert-secret"))), Times.Once());

            Mocker.GetMock<IConfigService>()
                .Verify(v => v.SaveConfigDictionary(It.Is<Dictionary<string, object>>(d => Has(d, "ProxyPassword", "proxy-secret"))), Times.Once());
        }

        [Test]
        public void saving_new_secrets_should_pass_them_on()
        {
            GivenSecrets("cert-secret", "proxy-secret");

            var resource = Subject.GetHostConfig();
            resource.SslCertPassword = "new-cert";
            resource.ProxyPassword = "new-proxy";

            Subject.SaveHostConfig(resource);

            Mocker.GetMock<IConfigFileProvider>()
                .Verify(v => v.SaveConfigDictionary(It.Is<Dictionary<string, object>>(d => Has(d, "SslCertPassword", "new-cert"))), Times.Once());

            Mocker.GetMock<IConfigService>()
                .Verify(v => v.SaveConfigDictionary(It.Is<Dictionary<string, object>>(d => Has(d, "ProxyPassword", "new-proxy"))), Times.Once());
        }

        private IEnumerable<ValidationFailure> ValidateSslCertificate(string sslCertPassword)
        {
            var certPath = Path.Combine(TempFolder, "readarr.pfx");

            using (var rsa = RSA.Create(2048))
            {
                var request = new CertificateRequest("CN=readarr", rsa, HashAlgorithmName.SHA256, RSASignaturePadding.Pkcs1);

                using (var cert = request.CreateSelfSigned(DateTimeOffset.UtcNow, DateTimeOffset.UtcNow.AddDays(1)))
                {
                    File.WriteAllBytes(certPath, cert.Export(X509ContentType.Pkcs12, "cert-secret"));
                }
            }

            Mocker.GetMock<IDiskProvider>().Setup(s => s.FileExists(certPath)).Returns(true);

            var resource = Subject.GetHostConfig();
            resource.EnableSsl = true;
            resource.Port = 8787;
            resource.SslPort = 6868;
            resource.SslCertPath = certPath;
            resource.SslCertPassword = sslCertPassword;

            var validator = (IValidator<HostConfigResource>)typeof(RestController<HostConfigResource>)
                .GetProperty("SharedValidator", BindingFlags.Instance | BindingFlags.NonPublic)
                .GetValue(Subject);

            return validator.Validate(resource).Errors.Where(e => e.PropertyName == nameof(HostConfigResource.SslCertPath));
        }

        [Test]
        public void unchanged_ssl_cert_password_should_validate_against_stored_password()
        {
            GivenSecrets("cert-secret", string.Empty);

            ValidateSslCertificate("********").Should().BeEmpty();
        }

        [Test]
        public void wrong_ssl_cert_password_should_fail_validation()
        {
            GivenSecrets("cert-secret", string.Empty);

            ValidateSslCertificate("wrong").Should().NotBeEmpty();
        }
    }
}
