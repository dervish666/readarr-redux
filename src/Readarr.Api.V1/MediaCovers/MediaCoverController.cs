using System;
using System.IO;
using System.Text.RegularExpressions;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.StaticFiles;
using NzbDrone.Common.Disk;
using NzbDrone.Common.EnvironmentInfo;
using NzbDrone.Common.Extensions;
using Readarr.Http;
using Readarr.Http.Extensions;

namespace Readarr.Api.V1.MediaCovers
{
    [V1ApiController]
    public class MediaCoverController : Controller
    {
        private static readonly Regex RegexResizedImage = new Regex(@"-\d+(?=\.(jpg|jpeg|png|gif|webp)$)", RegexOptions.Compiled | RegexOptions.IgnoreCase);

        private readonly IAppFolderInfo _appFolderInfo;
        private readonly IDiskProvider _diskProvider;
        private readonly IContentTypeProvider _mimeTypeProvider;

        public MediaCoverController(IAppFolderInfo appFolderInfo, IDiskProvider diskProvider)
        {
            _appFolderInfo = appFolderInfo;
            _diskProvider = diskProvider;
            _mimeTypeProvider = new FileExtensionContentTypeProvider();
        }

        [HttpGet(@"author/{authorId:int}/{filename:regex(^[[^/\\]]+\.(jpg|jpeg|png|gif|webp)$)}")]
        public IActionResult GetAuthorMediaCover(int authorId, string filename)
        {
            var filePath = GetCoverPath(Path.Combine(_appFolderInfo.GetAppDataPath(), "MediaCover", authorId.ToString()), filename);

            if (filePath == null)
            {
                return NotFound();
            }

            if (!_diskProvider.FileExists(filePath) || _diskProvider.GetFileSize(filePath) == 0)
            {
                // Return the full sized image if someone requests a non-existing resized one.
                // TODO: This code can be removed later once everyone had the update for a while.
                var basefilePath = RegexResizedImage.Replace(filePath, "");
                if (basefilePath == filePath || !_diskProvider.FileExists(basefilePath))
                {
                    return NotFound();
                }

                filePath = basefilePath;
            }

            Response.Headers.AddImageSecurityHeaders();

            return PhysicalFile(filePath, GetContentType(filePath));
        }

        [HttpGet(@"book/{bookId:int}/{filename:regex(^[[^/\\]]+\.(jpg|jpeg|png|gif|webp)$)}")]
        public IActionResult GetBookMediaCover(int bookId, string filename)
        {
            var filePath = GetCoverPath(Path.Combine(_appFolderInfo.GetAppDataPath(), "MediaCover", "Books", bookId.ToString()), filename);

            if (filePath == null)
            {
                return NotFound();
            }

            if (!_diskProvider.FileExists(filePath) || _diskProvider.GetFileSize(filePath) == 0)
            {
                // Return the full sized image if someone requests a non-existing resized one.
                // TODO: This code can be removed later once everyone had the update for a while.
                var basefilePath = RegexResizedImage.Replace(filePath, "");
                if (basefilePath == filePath || !_diskProvider.FileExists(basefilePath))
                {
                    return NotFound();
                }

                filePath = basefilePath;
            }

            Response.Headers.AddImageSecurityHeaders();

            return PhysicalFile(filePath, GetContentType(filePath));
        }

        // Covers are plain file names. Reject either separator and anything that resolves outside
        // the cover folder, since a backslash is a separator on Windows and survives routing.
        private static string GetCoverPath(string folder, string filename)
        {
            if (filename == null || filename.IndexOfAny(new[] { '/', '\\' }) >= 0)
            {
                return null;
            }

            var root = Path.GetFullPath(folder).TrimEnd(Path.DirectorySeparatorChar) + Path.DirectorySeparatorChar;
            var filePath = Path.GetFullPath(Path.Combine(folder, filename));

            return filePath.StartsWith(root, StringComparison.Ordinal) ? filePath : null;
        }

        private string GetContentType(string filePath)
        {
            if (!_mimeTypeProvider.TryGetContentType(filePath, out var contentType))
            {
                contentType = "application/octet-stream";
            }

            return contentType;
        }
    }
}
