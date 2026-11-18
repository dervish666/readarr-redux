using System;
using System.IO;
using System.Threading.Tasks;
using FluentAssertions;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Http;
using NUnit.Framework;
using NzbDrone.Test.Common;
using Readarr.Http.ErrorManagement;

namespace NzbDrone.Api.Test.ErrorManagement
{
    [TestFixture]
    public class ReadarrErrorPipelineFixture : TestBase<ReadarrErrorPipeline>
    {
        [Test]
        public async Task should_keep_unexpected_exception_details_out_of_the_response()
        {
            var context = new DefaultHttpContext();
            context.TraceIdentifier = "request-123";
            context.Response.Body = new MemoryStream();
            context.Features.Set<IExceptionHandlerPathFeature>(new ExceptionHandlerFeature
            {
                Error = new InvalidOperationException("private-path-and-secret")
            });

            await Subject.HandleException(context);
            ExceptionVerification.ExpectedFatals(1);
            context.Response.Body.Position = 0;
            var response = await new StreamReader(context.Response.Body).ReadToEndAsync();

            context.Response.StatusCode.Should().Be(500);
            response.Should().Contain("request-123").And.NotContain("private-path-and-secret").And.NotContain("InvalidOperationException");
        }
    }
}
