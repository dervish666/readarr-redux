using FluentAssertions;
using NUnit.Framework;
using NzbDrone.Core.Authentication;
using NzbDrone.Core.Configuration;
using NzbDrone.Core.Lifecycle;
using NzbDrone.Core.Test.Framework;
using NzbDrone.Test.Common;

namespace NzbDrone.Core.Test.Authentication
{
    [TestFixture]
    public class SetupCodeServiceFixture : CoreTest<SetupCodeService>
    {
        private void GivenNoLogin(bool confirmed = false)
        {
            Mocker.GetMock<IConfigFileProvider>().SetupGet(s => s.AuthenticationMethod).Returns(AuthenticationType.None);
            Mocker.GetMock<IConfigFileProvider>().SetupGet(s => s.AuthenticationNoneConfirmed).Returns(confirmed);
        }

        [Test]
        public void should_require_a_code_while_no_login_is_set_up()
        {
            GivenNoLogin();

            Subject.IsRequired.Should().BeTrue();
        }

        [Test]
        public void should_not_require_a_code_once_no_login_is_confirmed()
        {
            GivenNoLogin(confirmed: true);

            Subject.IsRequired.Should().BeFalse();
        }

        [TestCase(AuthenticationType.Forms)]
        [TestCase(AuthenticationType.Basic)]
        [TestCase(AuthenticationType.External)]
        public void should_not_require_a_code_with_a_login(AuthenticationType method)
        {
            Mocker.GetMock<IConfigFileProvider>().SetupGet(s => s.AuthenticationMethod).Returns(method);

            Subject.IsRequired.Should().BeFalse();
        }

        [Test]
        public void should_write_the_code_to_the_log_at_startup()
        {
            GivenNoLogin();

            Subject.Handle(new ApplicationStartedEvent());

            ExceptionVerification.ExpectedWarns(1);
            Subject.CurrentCode.Should().HaveLength(12);
        }

        [Test]
        public void should_not_make_a_code_at_startup_once_a_login_is_set_up()
        {
            Mocker.GetMock<IConfigFileProvider>().SetupGet(s => s.AuthenticationMethod).Returns(AuthenticationType.Forms);

            Subject.Handle(new ApplicationStartedEvent());

            ExceptionVerification.ExpectedWarns(0);
        }

        [Test]
        public void should_accept_the_code_however_it_is_typed_and_hand_back_a_working_proof()
        {
            GivenNoLogin();
            var code = Subject.CurrentCode;

            var proof = Subject.Verify(" " + SetupCodeService.Format(code).ToLowerInvariant() + " ");

            proof.Should().NotBeNullOrEmpty();
            Subject.IsValidProof(proof).Should().BeTrue();
            ExceptionVerification.IgnoreWarns();
        }

        [TestCase(null)]
        [TestCase("")]
        [TestCase("AAAA-AAAA-AAAA")]
        public void should_refuse_a_wrong_code(string code)
        {
            GivenNoLogin();

            Subject.Verify(code).Should().BeNull();
            ExceptionVerification.IgnoreWarns();
        }

        [TestCase(null)]
        [TestCase("")]
        [TestCase("00")]
        public void should_refuse_a_wrong_proof(string proof)
        {
            GivenNoLogin();

            Subject.IsValidProof(proof).Should().BeFalse();
            ExceptionVerification.IgnoreWarns();
        }

        [Test]
        public void should_make_a_different_code_each_start()
        {
            GivenNoLogin();
            var first = Subject.CurrentCode;

            var second = new SetupCodeService(Mocker.GetMock<IConfigFileProvider>().Object, TestLogger).CurrentCode;

            second.Should().NotBe(first);
            ExceptionVerification.IgnoreWarns();
        }
    }
}
