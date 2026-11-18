using System.Collections.Generic;
using System.Linq;
using System.Reflection;
using FluentAssertions;
using NUnit.Framework;
using NzbDrone.Core.Books.Calibre;
using NzbDrone.Core.Profiles.Metadata;
using NzbDrone.Core.Profiles.Qualities;
using NzbDrone.Core.RootFolders;
using NzbDrone.Test.Common;
using Readarr.Api.V1.Author;
using Readarr.Api.V1.Books;
using Readarr.Api.V1.RootFolders;
using Readarr.Http.REST;

namespace NzbDrone.Api.Test.ValidationTests
{
    // Property naming for nested member rules and rules on the root object itself, both of which
    // FluentValidation reworked between 9 and 12.
    [TestFixture]
    public class NestedAndSelfRulesCharacterisationFixture : TestBase
    {
        private static ResourceValidator<TResource> GetValidator<TResource>(RestController<TResource> controller, string name)
            where TResource : RestResource, new()
        {
            return (ResourceValidator<TResource>)typeof(RestController<TResource>)
                .GetProperty(name, BindingFlags.Instance | BindingFlags.NonPublic)
                .GetValue(controller);
        }

        [Test]
        public void book_controller_nested_author_rules()
        {
            Mocker.GetMock<IQualityProfileService>().Setup(s => s.Exists(1)).Returns(true);
            Mocker.GetMock<IMetadataProfileService>().Setup(s => s.Exists(1)).Returns(true);

            var post = GetValidator(Mocker.Resolve<BookController>(), "PostValidator");

            var result = post.Validate(new BookResource
            {
                ForeignBookId = string.Empty,
                Author = new AuthorResource { QualityProfileId = 2, MetadataProfileId = 3, RootFolderPath = "relative", ForeignAuthorId = null }
            });

            result.Describe().Should().Equal(
                "ForeignBookId | NotEmptyValidator | Error | 'Foreign Book Id' must not be empty.",
                "Author.QualityProfileId | QualityProfileExistsValidator | Error | Quality Profile does not exist",
                "Author.MetadataProfileId | MetadataProfileExistsValidator | Error | Metadata profile does not exist",
                "Author.RootFolderPath | PathValidator | Error | Invalid Path: 'relative'",
                "Author.ForeignAuthorId | NotEmptyValidator | Error | 'Author. Foreign Author Id' must not be empty.");

            result.Errors.Select(e => e.FormattedMessagePlaceholderValues["PropertyName"]).Should().Equal(
                "Foreign Book Id",
                "Author. Quality Profile Id",
                "Author. Metadata Profile Id",
                "Author. Root Folder Path",
                "Author. Foreign Author Id");
        }

        [Test]
        public void root_folder_controller_calibre_library_self_rule()
        {
            Mocker.GetMock<IRootFolderService>()
                .Setup(s => s.All())
                .Returns(new List<RootFolder>
                {
                    new RootFolder { Id = 5, CalibreSettings = new CalibreSettings { Host = "localhost", Port = 8080, Library = "books" } }
                });
            Mocker.GetMock<IQualityProfileService>().Setup(s => s.Exists(1)).Returns(true);
            Mocker.GetMock<IMetadataProfileService>().Setup(s => s.Exists(1)).Returns(true);

            var shared = GetValidator(Mocker.Resolve<RootFolderController>(), "SharedValidator");
            var resource = new RootFolderResource
            {
                Name = "Calibre",
                Path = null,
                DefaultMetadataProfileId = 1,
                DefaultQualityProfileId = 1,
                IsCalibreLibrary = true,
                Host = "localhost",
                Port = 8080,
                Library = "books",
                OutputProfile = "default"
            };

            var failures = shared.Validate(resource).Describe();

            failures.Should().Contain(" | PredicateValidator | Error | Calibre library is already configured as a root folder");

            resource.Id = 5;
            shared.Validate(resource).Describe().Should().NotContain(f => f.Contains("Calibre library"));
        }

        [Test]
        public void calibre_settings_validator()
        {
            new CalibreSettings { Host = "nope", Port = 0, OutputFormat = "epub,nope", OutputProfile = 999, Password = "x" }.Validate().Errors.Describe().Should().Equal(
                "Host |  | Error | Invalid Url: 'nope'",
                "Port |  | Error | 'Port' must be between 1 and 65535. You entered 0.",
                "Username |  | Error | 'Username' must not be empty.",
                "OutputFormat |  | Error | Invalid output formats",
                $"OutputProfile |  | Error | 'Output Profile' must be between 0 and {(int)CalibreProfile.tablet}. You entered 999.");
        }
    }
}
