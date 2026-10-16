using Microsoft.AspNetCore.Mvc;
using NzbDrone.Core.Books;
using Readarr.Http;

namespace Readarr.Api.V1.Author
{
    // Metadata the user sets on an author by hand, kept over the metadata source's on refresh
    [V1ApiController("author")]
    public class AuthorMetadataController : Controller
    {
        private readonly IMetadataOverrideService _metadataOverrideService;
        private readonly IAuthorService _authorService;

        public AuthorMetadataController(IMetadataOverrideService metadataOverrideService, IAuthorService authorService)
        {
            _metadataOverrideService = metadataOverrideService;
            _authorService = authorService;
        }

        [HttpGet("{id:int}/metadata")]
        [Produces("application/json")]
        public AuthorMetadataOverrideResource GetMetadata(int id)
        {
            var overrides = _authorService.GetAuthor(id).Metadata.Value.MetadataOverrides;

            return new AuthorMetadataOverrideResource { Overview = overrides?.Overview };
        }

        [HttpPut("{id:int}/metadata")]
        [Consumes("application/json")]
        [Produces("application/json")]
        public AuthorMetadataOverrideResource UpdateMetadata(int id, [FromBody] AuthorMetadataOverrideResource resource)
        {
            _metadataOverrideService.UpdateAuthorOverview(id, resource.Overview);

            return GetMetadata(id);
        }
    }

    // The author's overview set by hand, or null for the metadata source's
    public class AuthorMetadataOverrideResource
    {
        public string Overview { get; set; }
    }
}
