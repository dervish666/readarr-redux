using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using FluentAssertions;
using FluentValidation;
using FluentValidation.Results;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Http;
using NUnit.Framework;
using NzbDrone.Core.Books;
using NzbDrone.Core.RootFolders;
using NzbDrone.Core.Validation;
using NzbDrone.Core.Validation.Paths;
using NzbDrone.Test.Common;
using Readarr.Http.ErrorManagement;

namespace NzbDrone.Api.Test.ErrorManagement
{
    // Pins the exact JSON body the API returns for a ValidationException, since the
    // serialized shape is FluentValidation's ValidationFailure.
    [TestFixture]
    public class ValidationErrorResponseCharacterisationFixture : TestBase<ReadarrErrorPipeline>
    {
        private async Task<(int StatusCode, string ContentType, string Body)> Handle(IEnumerable<ValidationFailure> failures)
        {
            var context = new DefaultHttpContext();
            context.Response.Body = new MemoryStream();
            context.Features.Set<IExceptionHandlerPathFeature>(new ExceptionHandlerFeature
            {
                Error = new ValidationException(failures)
            });

            await Subject.HandleException(context);
            ExceptionVerification.IgnoreWarns();

            context.Response.Body.Position = 0;
            var body = await new StreamReader(context.Response.Body).ReadToEndAsync();

            return (context.Response.StatusCode, context.Response.ContentType, body);
        }

        [Test]
        public async Task custom_and_built_in_validator_failures()
        {
            var booksPath = "/books";

            Mocker.GetMock<IRootFolderService>()
                .Setup(s => s.All())
                .Returns(new List<RootFolder> { new RootFolder { Path = booksPath } });

            var validator = new TestValidator<Author>
            {
                v => v.RuleFor(s => s.Path).SetValidator(Mocker.Resolve<RootFolderValidator>()),
                v => v.RuleFor(s => s.QualityProfileId).InclusiveBetween(1, 5),
                v => v.RuleFor(s => s.CleanName).NotEmpty().AsWarning()
            };

            var failures = validator.Validate(new Author { Path = booksPath, QualityProfileId = 9 }).Errors;

            var (statusCode, contentType, body) = await Handle(failures);

            statusCode.Should().Be(400);
            contentType.Should().Be("application/json");
            body.ReplaceLineEndings("\n").Should().Be(
                """
                [
                  {
                    "propertyName": "Path",
                    "errorMessage": "Path \u0027/books\u0027 is already configured as a root folder",
                    "attemptedValue": "/books",
                    "severity": "error",
                    "errorCode": "RootFolderValidator",
                    "formattedMessageArguments": [],
                    "formattedMessagePlaceholderValues": {
                      "path": "/books",
                      "propertyName": "Path",
                      "propertyValue": "/books"
                    }
                  },
                  {
                    "propertyName": "QualityProfileId",
                    "errorMessage": "\u0027Quality Profile Id\u0027 must be between 1 and 5. You entered 9.",
                    "attemptedValue": 9,
                    "severity": "error",
                    "errorCode": "InclusiveBetweenValidator",
                    "formattedMessageArguments": [],
                    "formattedMessagePlaceholderValues": {
                      "from": 1,
                      "to": 5,
                      "value": 9,
                      "propertyName": "Quality Profile Id",
                      "propertyValue": 9
                    }
                  },
                  {
                    "propertyName": "CleanName",
                    "errorMessage": "\u0027Clean Name\u0027 must not be empty.",
                    "customState": {
                      "isWarning": true
                    },
                    "severity": "error",
                    "errorCode": "NotEmptyValidator",
                    "formattedMessageArguments": [],
                    "formattedMessagePlaceholderValues": {
                      "propertyName": "Clean Name",
                      "propertyValue": null
                    }
                  }
                ]
                """.ReplaceLineEndings("\n"));
        }

        [Test]
        public async Task nzbdrone_validation_failure()
        {
            var failures = new List<ValidationFailure>
            {
                new NzbDroneValidationFailure("Host", "Unable to connect")
                {
                    IsWarning = true,
                    DetailedDescription = "details",
                    InfoLink = "http://wiki"
                },
                new ValidationFailure("Title", "Unable to parse", "Some.Title")
            };

            var (statusCode, _, body) = await Handle(failures);

            statusCode.Should().Be(400);
            body.ReplaceLineEndings("\n").Should().Be(
                """
                [
                  {
                    "propertyName": "Host",
                    "errorMessage": "Unable to connect",
                    "severity": "error"
                  },
                  {
                    "propertyName": "Title",
                    "errorMessage": "Unable to parse",
                    "attemptedValue": "Some.Title",
                    "severity": "error"
                  }
                ]
                """.ReplaceLineEndings("\n"));
        }

        [Test]
        public async Task failures_from_nzbdrone_validation_result_after_filter()
        {
            var validator = new TestValidator<Author>
            {
                v => v.RuleFor(s => s.Path).NotEmpty(),
                v => v.RuleFor(s => s.CleanName).NotEmpty()
            };

            var result = new NzbDroneValidationResult(validator.Validate(new Author())).Filter("Path");

            result.Errors.Select(e => e.PropertyName).Should().Equal("Path");

            var (_, _, body) = await Handle(result.Errors);

            body.ReplaceLineEndings("\n").Should().Be(
                """
                [
                  {
                    "isWarning": false,
                    "propertyName": "Path",
                    "errorMessage": "\u0027Path\u0027 must not be empty.",
                    "severity": "error"
                  }
                ]
                """.ReplaceLineEndings("\n"));
        }
    }
}
