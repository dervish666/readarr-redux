using System.Collections.Generic;
using System.Linq;
using System.Reflection;
using FluentAssertions;
using FluentValidation;
using Moq;
using NUnit.Framework;
using NzbDrone.Core.Books;
using NzbDrone.Core.Organizer;
using NzbDrone.Core.Profiles.Metadata;
using NzbDrone.Core.Profiles.Qualities;
using NzbDrone.Core.RootFolders;
using NzbDrone.Test.Common;
using Readarr.Api.V1.Author;
using Readarr.Api.V1.Config;
using Readarr.Api.V1.Profiles.Delay;
using Readarr.Api.V1.Profiles.Quality;
using Readarr.Api.V1.RemotePathMappings;
using Readarr.Api.V1.RootFolders;
using Readarr.Http.ClientSchema;
using Readarr.Http.REST;
using Readarr.Http.Validation;
using CoreQuality = NzbDrone.Core.Qualities.Quality;

namespace NzbDrone.Api.Test.ValidationTests
{
    // Pins the API-facing validation rules (custom validators in Readarr.Http and Readarr.Api.V1,
    // and the controller rule sets that share injected Core validators across resource types).
    [TestFixture]
    public class ApiValidatorsCharacterisationFixture : TestBase
    {
        private static readonly string BooksPath = @"C:\Test\Books".AsOsAgnostic();
        private static readonly string OtherPath = @"C:\Other".AsOsAgnostic();

        public class Model
        {
            public int Number { get; set; }
            public string Value { get; set; }
            public IEnumerable<int> Collection { get; set; }
            public List<Field> Fields { get; set; }
        }

        private static ResourceValidator<TResource> GetValidator<TResource>(RestController<TResource> controller, string name)
            where TResource : RestResource, new()
        {
            return (ResourceValidator<TResource>)typeof(RestController<TResource>)
                .GetProperty(name, BindingFlags.Instance | BindingFlags.NonPublic)
                .GetValue(controller);
        }

        private static List<string> Validate(System.Action<TestValidator<Model>> rule, Model model)
        {
            return new TestValidator<Model>(rule).Validate(model).Describe();
        }

        [SetUp]
        public void Setup()
        {
            Mocker.GetMock<NzbDrone.Common.EnvironmentInfo.IAppFolderInfo>().SetupGet(s => s.StartUpFolder).Returns(@"C:\Startup".AsOsAgnostic());
            Mocker.GetMock<NzbDrone.Core.Profiles.Delay.IDelayProfileService>().Setup(s => s.All()).Returns(new List<NzbDrone.Core.Profiles.Delay.DelayProfile>());
        }

        private void GivenRootFolder()
        {
            Mocker.GetMock<IRootFolderService>()
                .Setup(s => s.All())
                .Returns(new List<RootFolder> { new RootFolder { Path = BooksPath } });
            Mocker.GetMock<IAuthorService>()
                .Setup(s => s.AllAuthorPaths())
                .Returns(new Dictionary<int, string>());
            Mocker.GetMock<IQualityProfileService>().Setup(s => s.Exists(1)).Returns(true);
            Mocker.GetMock<IMetadataProfileService>().Setup(s => s.Exists(1)).Returns(true);
        }

        [Test]
        public void rss_sync_interval()
        {
            System.Action<TestValidator<Model>> rule = v => v.RuleFor(s => s.Number).IsValidRssSyncInterval();

            Validate(rule, new Model { Number = 0 }).Should().BeEmpty();
            Validate(rule, new Model { Number = 10 }).Should().BeEmpty();
            Validate(rule, new Model { Number = 120 }).Should().BeEmpty();
            Validate(rule, new Model { Number = 5 }).Should().Equal("Number | RssSyncIntervalValidator | Error | Must be between 10 and 120 or 0 to disable");
            Validate(rule, new Model { Number = 121 }).Should().Equal("Number | RssSyncIntervalValidator | Error | Must be between 10 and 120 or 0 to disable");
        }

        [Test]
        public void empty_collection()
        {
            System.Action<TestValidator<Model>> rule = v => v.RuleFor(s => s.Collection).EmptyCollection<Model, int>();

            Validate(rule, new Model { Collection = new List<int>() }).Should().BeEmpty();
            Validate(rule, new Model { Collection = null }).Should().BeEmpty();
            Validate(rule, new Model { Collection = new List<int> { 1 } }).Should().Equal("Collection | EmptyCollectionValidator`1 | Error | Collection Must Be Empty");
        }

        [Test]
        public void not_blank_and_http_valid_id()
        {
            Validate(v => v.RuleFor(s => s.Value).NotBlank(), new Model { Value = "x" }).Should().BeEmpty();
            Validate(v => v.RuleFor(s => s.Value).NotBlank(), new Model { Value = null }).Should().Equal(
                "Value | NotNullValidator | Error | 'Value' must not be empty.",
                "Value | NotEmptyValidator | Error | 'Value' must not be empty.");
            Validate(v => v.RuleFor(s => s.Value).NotBlank(), new Model { Value = string.Empty }).Should().Equal(
                "Value | NotEmptyValidator | Error | 'Value' must not be empty.");
            Validate(v => Readarr.Http.Validation.RuleBuilderExtensions.ValidId(v.RuleFor(s => s.Number)), new Model { Number = 0 }).Should().Equal(
                "Number | GreaterThanValidator | Error | 'Number' must be greater than '0'.");
            Validate(v => Readarr.Http.Validation.RuleBuilderExtensions.IsZero(v.RuleFor(s => s.Number)), new Model { Number = 2 }).Should().Equal(
                "Number | EqualValidator | Error | 'Number' must be equal to '0'.");
            Validate(v => Readarr.Http.Validation.RuleBuilderExtensions.HaveHttpProtocol(v.RuleFor(s => s.Value)), new Model { Value = "ftp://x" }).Should().Equal(
                "Value | RegularExpressionValidator | Error | must start with http:// or https://");
        }

        [Test]
        public void rule_for_field()
        {
            var validator = new ResourceValidator<Model>();
            validator.RuleForField<string>(c => c.Fields, "apiKey").NotEmpty();
            validator.RuleForField<string>(c => c.Fields, "baseUrl").NotEmpty();

            var model = new Model
            {
                Fields = new List<Field>
                {
                    new Field { Name = "apiKey", Value = string.Empty },
                    new Field { Name = "baseUrl", Value = "http://x" }
                }
            };

            validator.Validate(model).Describe().Should().Equal("apiKey | NotEmptyValidator | Error | 'apiKey' must not be empty.");

            model.Fields[0].Value = "key";
            validator.Validate(model).IsValid.Should().BeTrue();

            model.Fields.RemoveAt(1);
            validator.Validate(model).Describe().Should().Equal("baseUrl | NotEmptyValidator | Error | 'baseUrl' must not be empty.");
        }

        private static QualityProfileQualityItemResource Item(CoreQuality quality, bool allowed = true)
        {
            return new QualityProfileQualityItemResource { Quality = quality, Allowed = allowed };
        }

        private static List<QualityProfileQualityItemResource> AllItems()
        {
            return CoreQuality.All.Select(q => Item(q)).ToList();
        }

        private static List<string> ValidateProfile(QualityProfileResource resource)
        {
            var validator = new TestValidator<QualityProfileResource>
            {
                v => v.RuleFor(c => c.Cutoff).ValidCutoff(),
                v => v.RuleFor(c => c.Items).ValidItems()
            };

            return validator.Validate(resource).Describe();
        }

        [Test]
        public void quality_profile_valid()
        {
            ValidateProfile(new QualityProfileResource { Cutoff = CoreQuality.All[0].Id, Items = AllItems() }).Should().BeEmpty();
        }

        [Test]
        public void quality_profile_cutoff_and_allowed()
        {
            var items = AllItems();
            items.ForEach(i => i.Allowed = false);

            ValidateProfile(new QualityProfileResource { Cutoff = CoreQuality.All[0].Id, Items = items }).Should().Equal(
                "Cutoff | ValidCutoffValidator`1 | Error | Cutoff must be an allowed quality or group",
                "Items | AllowedValidator`1 | Error | Must contain at least one allowed quality");

            ValidateProfile(new QualityProfileResource { Cutoff = 999, Items = AllItems() }).Should().Equal(
                "Cutoff | ValidCutoffValidator`1 | Error | Cutoff must be an allowed quality or group");
        }

        [Test]
        public void quality_profile_empty_items()
        {
            ValidateProfile(new QualityProfileResource { Cutoff = 1, Items = new List<QualityProfileQualityItemResource>() }).Should().Equal(
                "Cutoff | ValidCutoffValidator`1 | Error | Cutoff must be an allowed quality or group",
                "Items | NotEmptyValidator | Error | 'Items' must not be empty.",
                "Items | AllowedValidator`1 | Error | Must contain at least one allowed quality",
                "Items | AllQualitiesValidator`1 | Error | Must contain all qualities");
        }

        [Test]
        public void quality_profile_named_individual_quality_and_unnamed_group()
        {
            var items = AllItems();
            var first = items[0];
            var second = items[1];
            var third = items[2];
            items.Remove(first);
            items.Remove(second);
            third.Name = "Named";

            items.Add(new QualityProfileQualityItemResource { Id = 1001, Name = null, Allowed = true, Items = new List<QualityProfileQualityItemResource> { first, second } });

            ValidateProfile(new QualityProfileResource { Cutoff = third.Quality.Id, Items = items }).Should().Equal(
                "Items | QualityNameValidator`1 | Error | Individual qualities should not be named",
                "Items | GroupItemValidator`1 | Error | Groups must contain multiple qualities",
                "Items | ItemGroupNameValidator`1 | Error | Groups must have a name");
        }

        [Test]
        public void quality_profile_group_without_id()
        {
            var items = AllItems();
            var first = items[0];
            var second = items[1];
            items.Remove(first);
            items.Remove(second);
            items.Add(new QualityProfileQualityItemResource { Id = 0, Name = "Group", Allowed = true, Items = new List<QualityProfileQualityItemResource> { first, second } });

            // ItemGroupIdValidator reports it, but UniqueQualityIdValidator dereferences the
            // group's null Quality, so the full ValidItems chain throws for this input.
            new TestValidator<QualityProfileResource> { v => v.RuleFor(c => c.Items).SetValidator(new ItemGroupIdValidator<QualityProfileResource>()) }
                .Validate(new QualityProfileResource { Items = items }).Describe()
                .Should().Equal("Items | ItemGroupIdValidator`1 | Error | Groups must have an ID");

            Assert.Throws<System.NullReferenceException>(() => ValidateProfile(new QualityProfileResource { Cutoff = items[0].Quality.Id, Items = items }));
        }

        [Test]
        public void quality_profile_group_membership_rules()
        {
            var items = AllItems();
            var first = items[0];
            var second = items[1];
            items.Remove(first);
            items.Remove(second);

            items.Add(new QualityProfileQualityItemResource { Id = 1001, Name = "Solo", Allowed = true, Items = new List<QualityProfileQualityItemResource> { first } });
            items.Add(new QualityProfileQualityItemResource { Id = 1001, Name = "Dupe", Allowed = true, Items = new List<QualityProfileQualityItemResource> { Item(first.Quality), second } });

            ValidateProfile(new QualityProfileResource { Cutoff = items[0].Quality.Id, Items = items }).Should().Equal(
                "Items | GroupItemValidator`1 | Error | Groups must contain multiple qualities",
                "Items | UniqueIdValidator`1 | Error | Groups must have a unique ID",
                "Items | UniqueQualityIdValidator`1 | Error | Qualities can only be used once");
        }

        [Test]
        public void author_folder_as_root_folder_validator()
        {
            Mocker.GetMock<IBuildFileNames>()
                .Setup(s => s.GetAuthorFolder(It.IsAny<Author>(), null))
                .Returns("Some Author");

            var subject = Mocker.Resolve<AuthorFolderAsRootFolderValidator>();
            var validator = new TestValidator<AuthorResource>
            {
                v => v.RuleFor(s => s.RootFolderPath).SetValidator(subject)
            };

            var exact = @"C:\Books\Some Author".AsOsAgnostic();
            var close = @"C:\Books\Some Authr".AsOsAgnostic();

            validator.Validate(new AuthorResource { RootFolderPath = exact }).Describe().Should().Equal(
                $"RootFolderPath | AuthorFolderAsRootFolderValidator | Error | Root folder path '{exact}' contains author folder 'Some Author'");
            validator.Validate(new AuthorResource { RootFolderPath = close }).Describe().Should().Equal(
                $"RootFolderPath | AuthorFolderAsRootFolderValidator | Error | Root folder path '{close}' contains author folder 'Some Author'");
            validator.Validate(new AuthorResource { RootFolderPath = @"C:\Books".AsOsAgnostic() }).Describe().Should().BeEmpty();
            validator.Validate(new AuthorResource { RootFolderPath = null }).Describe().Should().BeEmpty();
            validator.Validate(new AuthorResource { RootFolderPath = " " }).Describe().Should().BeEmpty();

            // On a non-AuthorResource root the validator is a no-op.
            var other = new TestValidator<Model> { v => v.RuleFor(s => s.Value).SetValidator(subject) };
            other.Validate(new Model { Value = exact }).IsValid.Should().BeTrue();
        }

        [Test]
        public void root_folder_controller_rules()
        {
            GivenRootFolder();
            Mocker.GetMock<NzbDrone.Common.Disk.IDiskProvider>().Setup(s => s.FolderExists(It.IsAny<string>())).Returns(true);
            Mocker.GetMock<NzbDrone.Common.Disk.IDiskProvider>().Setup(s => s.FolderWritable(It.IsAny<string>())).Returns(true);

            var controller = Mocker.Resolve<RootFolderController>();
            var shared = GetValidator(controller, "SharedValidator");
            var post = GetValidator(controller, "PostValidator");

            var resource = new RootFolderResource { Name = "Books", Path = BooksPath, DefaultMetadataProfileId = 1, DefaultQualityProfileId = 1, OutputProfile = "default" };

            shared.Validate(resource).Describe().Should().BeEmpty();
            post.Validate(resource).Describe().Should().Equal($"Path | RootFolderValidator | Error | Path '{BooksPath}' is already configured as a root folder");

            var bad = new RootFolderResource { Name = string.Empty, Path = "relative", DefaultMetadataProfileId = 0, DefaultQualityProfileId = 2, IsCalibreLibrary = true, Host = "http://x", Port = 0, OutputProfile = "nope" };

            shared.Validate(bad).Describe().Should().Equal(
                "Path | PathValidator | Error | Invalid Path: 'relative'",
                "Name | NotEmptyValidator | Error | 'Name' must not be empty.",
                "DefaultMetadataProfileId | GreaterThanValidator | Error | 'Default Metadata Profile Id' must be greater than '0'.",
                "DefaultQualityProfileId | QualityProfileExistsValidator | Error | Quality Profile does not exist",
                "Host | PredicateValidator | Error | must be valid Host without http://",
                "Port | InclusiveBetweenValidator | Error | 'Port' must be between 1 and 65535. You entered 0.",
                "OutputProfile | StringEnumValidator | Error | 'Output Profile' has a range of values which does not include 'nope'.");
        }

        [Test]
        public void author_controller_rules()
        {
            GivenRootFolder();
            Mocker.GetMock<IBuildFileNames>()
                .Setup(s => s.GetAuthorFolder(It.IsAny<Author>(), null))
                .Returns("Some Author");
            Mocker.GetMock<IAuthorService>().Setup(s => s.FindById("existing")).Returns(new Author());

            var controller = Mocker.Resolve<AuthorController>();
            var shared = GetValidator(controller, "SharedValidator");
            var post = GetValidator(controller, "PostValidator");
            var put = GetValidator(controller, "PutValidator");

            shared.Validate(new AuthorResource { Path = BooksPath, QualityProfileId = 1, MetadataProfileId = 1 }).Describe().Should().Equal(
                $"Path | RootFolderValidator | Error | Path '{BooksPath}' is already configured as a root folder");

            shared.Validate(new AuthorResource { Path = OtherPath, QualityProfileId = 0, MetadataProfileId = 2 }).Describe().Should().Equal(
                "QualityProfileId | GreaterThanValidator | Error | 'Quality Profile Id' must be greater than '0'.",
                "MetadataProfileId | MetadataProfileExistsValidator | Error | Metadata profile does not exist");

            var rootFolderPath = @"C:\Books\Some Author".AsOsAgnostic();
            post.Validate(new AuthorResource { RootFolderPath = rootFolderPath, ForeignAuthorId = "existing" }).Describe().Should().Equal(
                $"RootFolderPath | AuthorFolderAsRootFolderValidator | Error | Root folder path '{rootFolderPath}' contains author folder 'Some Author'",
                "AuthorName | NotEmptyValidator | Error | 'Author Name' must not be empty.",
                "ForeignAuthorId | AuthorExistsValidator | Error | This author has already been added");

            put.Validate(new AuthorResource { Id = 0, Path = null }).Describe().Should().Equal(
                "Id | GreaterThanValidator | Error | 'Id' must be greater than '0'.",
                "Path | PathValidator | Error | Invalid Path: '{path}'");
        }

        [Test]
        public void media_management_config_controller_recycle_bin_rules()
        {
            GivenRootFolder();
            Mocker.GetMock<NzbDrone.Common.Disk.IDiskProvider>().Setup(s => s.FolderExists(It.IsAny<string>())).Returns(true);
            Mocker.GetMock<NzbDrone.Common.Disk.IDiskProvider>().Setup(s => s.FolderWritable(It.IsAny<string>())).Returns(true);

            var shared = GetValidator(Mocker.Resolve<MediaManagementConfigController>(), "SharedValidator");

            shared.Validate(new MediaManagementConfigResource { RecycleBin = BooksPath, MinimumFreeSpaceWhenImporting = 100, MinimumBookMatchPercent = 10 }).Describe().Should().Equal(
                $"RecycleBin | RootFolderValidator | Error | Path '{BooksPath}' is already configured as a root folder",
                "MinimumBookMatchPercent | InclusiveBetweenValidator | Error | 'Minimum Book Match Percent' must be between 50 and 100. You entered 10.");

            shared.Validate(new MediaManagementConfigResource { RecycleBin = string.Empty, MinimumFreeSpaceWhenImporting = 100, MinimumBookMatchPercent = 80 }).IsValid.Should().BeTrue();
        }

        [Test]
        public void remote_path_mapping_controller_rules()
        {
            Mocker.GetMock<NzbDrone.Common.Disk.IDiskProvider>().Setup(s => s.FolderExists(It.IsAny<string>())).Returns(true);

            var shared = GetValidator(Mocker.Resolve<RemotePathMappingController>(), "SharedValidator");

            shared.Validate(new RemotePathMappingResource { Host = string.Empty, RemotePath = string.Empty, LocalPath = "relative" }).Describe().Should().Equal(
                "Host | NotEmptyValidator | Error | 'Host' must not be empty.",
                "RemotePath | NotEmptyValidator | Error | 'Remote Path' must not be empty.",
                "LocalPath | PathValidator | Error | Invalid Path: 'relative'");

            shared.Validate(new RemotePathMappingResource { Host = "h", RemotePath = "/r", LocalPath = OtherPath }).IsValid.Should().BeTrue();
        }

        [Test]
        public void delay_profile_controller_rules()
        {
            var shared = GetValidator(Mocker.Resolve<DelayProfileController>(), "SharedValidator");

            shared.Validate(new DelayProfileResource { Id = 1, EnableUsenet = true, Tags = new HashSet<int> { 3 } }).Describe().Should().Equal(
                "Tags | EmptyCollectionValidator`1 | Error | Collection Must Be Empty");

            shared.Validate(new DelayProfileResource { Id = 2, EnableTorrent = true, Tags = new HashSet<int>(), UsenetDelay = -1 }).Describe().Should().Equal(
                "Tags | NotEmptyValidator | Error | 'Tags' must not be empty.",
                "UsenetDelay | GreaterThanOrEqualValidator | Error | 'Usenet Delay' must be greater than or equal to '0'.");

            // Custom() rule on the root object with a message-only AddFailure.
            shared.Validate(new DelayProfileResource { Id = 2, Tags = new HashSet<int> { 3 } }).Describe().Should().Equal(
                " |  | Error | Either Usenet or Torrent should be enabled");
        }
    }
}
