using Microsoft.AspNetCore.Mvc;
using NzbDrone.Core.Books;
using Readarr.Http;

namespace Readarr.Api.V1.Books
{
    // Metadata the user sets on a book by hand, kept over the metadata source's on refresh
    [V1ApiController("book")]
    public class BookMetadataController : Controller
    {
        private readonly IMetadataOverrideService _metadataOverrideService;

        public BookMetadataController(IMetadataOverrideService metadataOverrideService)
        {
            _metadataOverrideService = metadataOverrideService;
        }

        [HttpGet("{id:int}/metadata")]
        [Produces("application/json")]
        public BookMetadataResource GetMetadata(int id)
        {
            return _metadataOverrideService.GetBookMetadata(id).ToResource(_metadataOverrideService.GetAvailableSeries(id));
        }

        [HttpPut("{id:int}/metadata")]
        [Consumes("application/json")]
        [Produces("application/json")]
        public BookMetadataResource UpdateMetadata(int id, [FromBody] BookMetadataResource resource)
        {
            _metadataOverrideService.UpdateBookMetadata(id, resource.ToModel());

            return GetMetadata(id);
        }
    }
}
