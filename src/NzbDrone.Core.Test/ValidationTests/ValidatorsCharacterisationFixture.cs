using System.Collections.Generic;
using System.Linq;
using FluentAssertions;
using FluentValidation;
using FluentValidation.Results;
using NUnit.Framework;
using NzbDrone.Common.Disk;
using NzbDrone.Core.Download;
using NzbDrone.Core.ImportLists.Exclusions;
using NzbDrone.Core.Organizer;
using NzbDrone.Core.Profiles.Delay;
using NzbDrone.Core.Profiles.Metadata;
using NzbDrone.Core.Profiles.Qualities;
using NzbDrone.Core.Test.Framework;
using NzbDrone.Core.Validation;
using NzbDrone.Test.Common;

namespace NzbDrone.Core.Test.ValidationTests
{
    // Pins the observable behaviour of the non-path custom validators and the shared
    // rule-builder extensions in NzbDrone.Core.Validation ahead of the FluentValidation upgrade.
    [TestFixture]
    public class ValidatorsCharacterisationFixture : CoreTest
    {
        public class Model
        {
            public int Id { get; set; }
            public int ProfileId { get; set; }
            public string Value { get; set; }
            public int Number { get; set; }
            public HashSet<int> Tags { get; set; }
        }

        private static List<string> ValidateInt(NzbDronePropertyValidator validator, int value)
        {
            var testValidator = new TestValidator<Model> { v => v.RuleFor(s => s.ProfileId).SetValidator(validator) };

            return testValidator.Validate(new Model { ProfileId = value }).Describe();
        }

        private static List<string> ValidateString(NzbDronePropertyValidator validator, string value)
        {
            var testValidator = new TestValidator<Model> { v => v.RuleFor(s => s.Value).SetValidator(validator) };

            return testValidator.Validate(new Model { Value = value }).Describe();
        }

        private static List<string> Validate(System.Action<TestValidator<Model>> rule, Model model)
        {
            return new TestValidator<Model>(rule).Validate(model).Describe();
        }

        [Test]
        public void quality_profile_exists_validator()
        {
            Mocker.GetMock<IQualityProfileService>().Setup(s => s.Exists(1)).Returns(true);

            var subject = Mocker.Resolve<QualityProfileExistsValidator>();

            ValidateInt(subject, 1).Should().BeEmpty();
            ValidateInt(subject, 0).Should().BeEmpty();
            ValidateInt(subject, 2).Should().Equal("ProfileId | QualityProfileExistsValidator | Error | Quality Profile does not exist");
        }

        [Test]
        public void metadata_profile_exists_validator()
        {
            Mocker.GetMock<IMetadataProfileService>().Setup(s => s.Exists(1)).Returns(true);

            var subject = Mocker.Resolve<MetadataProfileExistsValidator>();

            ValidateInt(subject, 1).Should().BeEmpty();
            ValidateInt(subject, 0).Should().BeEmpty();
            ValidateInt(subject, 2).Should().Equal("ProfileId | MetadataProfileExistsValidator | Error | Metadata profile does not exist");
        }

        [Test]
        public void download_client_exists_validator()
        {
            Mocker.GetMock<IDownloadClientFactory>().Setup(s => s.Exists(1)).Returns(true);

            var subject = Mocker.Resolve<DownloadClientExistsValidator>();

            ValidateInt(subject, 1).Should().BeEmpty();
            ValidateInt(subject, 0).Should().BeEmpty();
            ValidateInt(subject, 2).Should().Equal("ProfileId | DownloadClientExistsValidator | Error | Download Client does not exist");
        }

        [Test]
        public void import_list_exclusion_exists_validator()
        {
            Mocker.GetMock<IImportListExclusionService>()
                .Setup(s => s.All())
                .Returns(new List<ImportListExclusion> { new ImportListExclusion { ForeignId = "abc" } });

            var subject = Mocker.Resolve<ImportListExclusionExistsValidator>();

            ValidateString(subject, "abc").Should().Equal("Value | ImportListExclusionExistsValidator | Error | This exclusion has already been added.");
            ValidateString(subject, "def").Should().BeEmpty();
            ValidateString(subject, null).Should().BeEmpty();
        }

        [Test]
        public void delay_profile_tag_in_use_validator()
        {
            Mocker.GetMock<IDelayProfileService>()
                .Setup(s => s.All())
                .Returns(new List<DelayProfile> { new DelayProfile { Id = 2, Tags = new HashSet<int> { 7 } } });

            var subject = Mocker.Resolve<DelayProfileTagInUseValidator>();
            System.Action<TestValidator<Model>> rule = v => v.RuleFor(s => s.Tags).SetValidator(subject);

            Validate(rule, new Model { Id = 1, Tags = new HashSet<int> { 7 } }).Should().Equal("Tags | DelayProfileTagInUseValidator | Error | One or more tags is used in another profile");
            Validate(rule, new Model { Id = 2, Tags = new HashSet<int> { 7 } }).Should().BeEmpty();
            Validate(rule, new Model { Id = 1, Tags = new HashSet<int> { 8 } }).Should().BeEmpty();
            Validate(rule, new Model { Id = 1, Tags = new HashSet<int>() }).Should().BeEmpty();
            Validate(rule, new Model { Id = 1, Tags = null }).Should().BeEmpty();
        }

        [Test]
        public void folder_chmod_validator()
        {
            Mocker.GetMock<IDiskProvider>().Setup(s => s.IsValidFolderPermissionMask("755")).Returns(true);

            var subject = Mocker.Resolve<FolderChmodValidator>();

            ValidateString(subject, "755").Should().BeEmpty();
            ValidateString(subject, "999").Should().Equal("Value | FolderChmodValidator | Error | Must contain a valid Unix permissions octal");
            ValidateString(subject, null).Should().Equal("Value | FolderChmodValidator | Error | Must contain a valid Unix permissions octal");
        }

        [Test]
        public void guid_validator()
        {
            ValidateString(new GuidValidator(), "e1f1e33e-2e4c-4d43-b91b-7064068d3283").Should().BeEmpty();
            ValidateString(new GuidValidator(), "nope").Should().Equal("Value | GuidValidator | Error | String is not a valid Guid");
            ValidateString(new GuidValidator(), null).Should().Equal("Value | GuidValidator | Error | String is not a valid Guid");
        }

        [Test]
        public void url_validator()
        {
            System.Action<TestValidator<Model>> rule = v => v.RuleFor(s => s.Value).IsValidUrl();

            Validate(rule, new Model { Value = "http://example.com" }).Should().BeEmpty();
            Validate(rule, new Model { Value = "not a url" }).Should().Equal("Value | UrlValidator | Error | Invalid Url: 'not a url'");
            Validate(rule, new Model { Value = null }).Should().Equal("Value | UrlValidator | Error | Invalid Url: '{url}'");
        }

        [Test]
        public void valid_book_format()
        {
            System.Action<TestValidator<Model>> rule = v => v.RuleFor(s => s.Value).ValidBookFormat();

            Validate(rule, new Model { Value = "{Book Title}{ (PartNumber)}" }).Should().BeEmpty();
            Validate(rule, new Model { Value = "{Original Title}" }).Should().BeEmpty();
            Validate(rule, new Model { Value = "{Book Title}" }).Should().Equal("Value | ValidStandardTrackFormatValidator | Error | Must contain Book Title AND PartNumber, OR Original Title");
            Validate(rule, new Model { Value = "{Book Title}{ (PartNumber)}\0" }).Should().Equal("Value | IllegalCharactersValidator | Error | Contains illegal characters: \0");
            Validate(rule, new Model { Value = string.Empty }).Should().Equal(
                "Value | NotEmptyValidator | Error | 'Value' must not be empty.",
                "Value | ValidStandardTrackFormatValidator | Error | Must contain Book Title AND PartNumber, OR Original Title");
            Validate(rule, new Model { Value = null }).Should().Equal(
                "Value | NotEmptyValidator | Error | 'Value' must not be empty.",
                "Value | ValidStandardTrackFormatValidator | Error | Must contain Book Title AND PartNumber, OR Original Title");
        }

        [Test]
        public void valid_author_folder_format()
        {
            System.Action<TestValidator<Model>> rule = v => v.RuleFor(s => s.Value).ValidAuthorFolderFormat();

            Validate(rule, new Model { Value = "{Author Name}" }).Should().BeEmpty();
            Validate(rule, new Model { Value = "{Book Title}" }).Should().Equal("Value | RegularExpressionValidator | Error | Must contain Author name");
            Validate(rule, new Model { Value = "{Author Name}\0" }).Should().Equal("Value | IllegalCharactersValidator | Error | Contains illegal characters: \0");
            Validate(rule, new Model { Value = string.Empty }).Should().Equal(
                "Value | NotEmptyValidator | Error | 'Value' must not be empty.",
                "Value | RegularExpressionValidator | Error | Must contain Author name");
        }

        [Test]
        public void valid_id_and_is_zero()
        {
            Validate(v => v.RuleFor(s => s.Number).ValidId(), new Model { Number = 1 }).Should().BeEmpty();
            Validate(v => v.RuleFor(s => s.Number).ValidId(), new Model { Number = 0 }).Should().Equal("Number | GreaterThanValidator | Error | 'Number' must be greater than '0'.");
            Validate(v => v.RuleFor(s => s.Number).IsZero(), new Model { Number = 0 }).Should().BeEmpty();
            Validate(v => v.RuleFor(s => s.Number).IsZero(), new Model { Number = 3 }).Should().Equal("Number | EqualValidator | Error | 'Number' must be equal to '0'.");
        }

        [Test]
        public void have_http_protocol()
        {
            System.Action<TestValidator<Model>> rule = v => v.RuleFor(s => s.Value).HaveHttpProtocol();

            Validate(rule, new Model { Value = "https://x" }).Should().BeEmpty();
            Validate(rule, new Model { Value = "ftp://x" }).Should().Equal("Value | RegularExpressionValidator | Error | must start with http:// or https://");
            Validate(rule, new Model { Value = null }).Should().BeEmpty();
        }

        [Test]
        public void valid_host()
        {
            System.Action<TestValidator<Model>> rule = v => v.RuleFor(s => s.Value).ValidHost();

            Validate(rule, new Model { Value = "my-host.local" }).Should().BeEmpty();
            Validate(rule, new Model { Value = "192.168.0.1" }).Should().BeEmpty();
            Validate(rule, new Model { Value = "http://host" }).Should().Equal("Value | PredicateValidator | Error | must be valid Host without http://");
        }

        [Test]
        public void valid_hosts()
        {
            System.Action<TestValidator<Model>> rule = v => v.RuleFor(s => s.Value).ValidHosts();

            Validate(rule, new Model { Value = "a.local,b.local" }).Should().BeEmpty();
            Validate(rule, new Model { Value = "http://a" }).Should().Equal("Value | PredicateValidator | Error | Must be a comma separated list of host names or IP addresses only, without a protocol or port");
            Validate(rule, new Model { Value = "0.0.0.0" }).Should().Equal("Value | PredicateValidator | Error | 0.0.0.0 and [::] are not host names, leave empty to allow all hosts");
        }

        [Test]
        public void valid_root_url()
        {
            System.Action<TestValidator<Model>> rule = v => v.RuleFor(s => s.Value).ValidRootUrl();

            Validate(rule, new Model { Value = "http://example.com" }).Should().BeEmpty();
            Validate(rule, new Model { Value = "example.com" }).Should().Equal("Value | PredicateValidator | Error | must be valid URL that starts with http(s)://");
        }

        [Test]
        public void valid_url_base()
        {
            System.Action<TestValidator<Model>> rule = v => v.RuleFor(s => s.Value).ValidUrlBase();

            Validate(rule, new Model { Value = "/readarr" }).Should().BeEmpty();
            Validate(rule, new Model { Value = "http://host/readarr" }).Should().Equal("Value | RegularExpressionValidator | Error | Must be a valid URL path (ie: '/readarr')");
        }

        [Test]
        public void valid_port()
        {
            System.Action<TestValidator<Model>> rule = v => v.RuleFor(s => s.Number).ValidPort();

            Validate(rule, new Model { Number = 8787 }).Should().BeEmpty();
            Validate(rule, new Model { Number = 80 }).Should().BeEmpty();
            Validate(rule, new Model { Number = 22 }).Should().Equal("Number | PredicateValidator | Error | The specified condition was not met for 'Number'.");
            Validate(rule, new Model { Number = 0 }).Should().Equal(
                "Number | InclusiveBetweenValidator | Error | 'Number' must be between 1 and 65535. You entered 0.",
                "Number | PredicateValidator | Error | The specified condition was not met for 'Number'.");
            Validate(rule, new Model { Number = 70000 }).Should().Equal("Number | InclusiveBetweenValidator | Error | 'Number' must be between 1 and 65535. You entered 70000.");
        }

        [Test]
        public void contains_readarr()
        {
            System.Action<TestValidator<Model>> rule = v => v.RuleFor(s => s.Value).ContainsReadarr();

            Validate(rule, new Model { Value = "My Readarr" }).Should().BeEmpty();
            Validate(rule, new Model { Value = "Other" }).Should().Equal("Value | RegularExpressionValidator | Error | Must contain readarr");
        }

        [Test]
        public void ip_validation()
        {
            Validate(v => v.RuleFor(s => s.Value).ValidIpAddress(), new Model { Value = "10.0.0.1" }).Should().BeEmpty();
            Validate(v => v.RuleFor(s => s.Value).ValidIpAddress(), new Model { Value = "nope" }).Should().Equal("Value | PredicateValidator | Error | Must contain wildcard (*) or a valid IP Address");
            Validate(v => v.RuleFor(s => s.Value).ValidIpNetworks(), new Model { Value = "10.0.0.0/8" }).Should().BeEmpty();
            Validate(v => v.RuleFor(s => s.Value).ValidIpNetworks(), new Model { Value = "nope" }).Should().Equal("Value | PredicateValidator | Error | Must be a comma separated list of IP addresses or networks in CIDR notation, such as 172.17.0.1, 10.0.0.0/8 or fc00::/7");
        }

        [Test]
        public void built_in_messages()
        {
            Validate(v => v.RuleFor(s => s.Number).InclusiveBetween(1, 7), new Model { Number = 9 }).Should().Equal("Number | InclusiveBetweenValidator | Error | 'Number' must be between 1 and 7. You entered 9.");
            Validate(v => v.RuleFor(s => s.Number).GreaterThanOrEqualTo(100), new Model { Number = 9 }).Should().Equal("Number | GreaterThanOrEqualValidator | Error | 'Number' must be greater than or equal to '100'.");
            Validate(v => v.RuleFor(s => s.Value).NotEmpty(), new Model { Value = null }).Should().Equal("Value | NotEmptyValidator | Error | 'Value' must not be empty.");
            Validate(v => v.RuleFor(s => s.Value).Empty(), new Model { Value = "x" }).Should().Equal("Value | EmptyValidator | Error | 'Value' must be empty.");
            Validate(v => v.RuleFor(s => s.Value).NotEqual("/"), new Model { Value = "/" }).Should().Equal("Value | NotEqualValidator | Error | 'Value' must not be equal to '/'.");
            Validate(v => v.RuleFor(s => s.Value).IsEnumName(typeof(System.DayOfWeek)), new Model { Value = "Funday" }).Should().Equal("Value | StringEnumValidator | Error | 'Value' has a range of values which does not include 'Funday'.");
            Validate(v => v.RuleFor(s => s.Value).Must(x => false), new Model { Value = "x" }).Should().Equal("Value | PredicateValidator | Error | The specified condition was not met for 'Value'.");
        }

        [Test]
        public void custom_rule_failure()
        {
            Validate(v => v.RuleFor(s => s).Custom((m, context) => context.AddFailure("Tags", "custom failure")), new Model())
                .Should().Equal("Tags |  | Error | custom failure");
        }

        [Test]
        public void as_warning_flows_into_nzbdrone_validation_result()
        {
            var validator = new TestValidator<Model>
            {
                v => v.RuleFor(s => s.Value).NotEmpty().AsWarning(),
                v => v.RuleFor(s => s.Number).GreaterThan(0)
            };

            var raw = validator.Validate(new Model());
            raw.Errors.Should().HaveCount(2);
            raw.Errors.First().CustomState.Should().BeSameAs(NzbDroneValidationState.Warning);

            var result = new NzbDroneValidationResult(raw);

            result.IsValid.Should().BeFalse();
            result.HasWarnings.Should().BeTrue();
            result.Warnings.Describe().Should().Equal("Value |  | Error | 'Value' must not be empty.");
            result.Errors.Describe().Should().Equal("Number |  | Error | 'Number' must be greater than '0'.");
            result.Failures.Select(f => f.PropertyName).Should().Equal("Number", "Value");
        }

        [Test]
        public void validation_exception_message()
        {
            var exception = new ValidationException(new List<ValidationFailure>
            {
                new ValidationFailure("Path", "Path is bad"),
                new ValidationFailure("Name", "Name is bad")
            });

            // FluentValidation 10+ appends the severity to each failure in the exception message. This text
            // only reaches logs and failed-command messages; the HTTP body is built from Errors instead.
            exception.Message.Should().Be("Validation failed: \n -- Path: Path is bad Severity: Error\n -- Name: Name is bad Severity: Error".Replace("\n", System.Environment.NewLine));
        }
    }
}
