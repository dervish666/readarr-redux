using System;
using System.IO;
using System.Text.RegularExpressions;
using Microsoft.AspNetCore.Mvc;
using NLog;
using NzbDrone.Common.Disk;
using NzbDrone.Common.EnvironmentInfo;
using NzbDrone.Common.Extensions;
using NzbDrone.Core.MediaCover;

namespace Readarr.Http.Frontend.Mappers
{
    public class MediaCoverMapper : StaticResourceMapperBase
    {
        private static readonly Regex RegexResizedImage = new Regex(@"-\d+(?=\.(jpg|jpeg|png|gif|webp)($|\?))", RegexOptions.Compiled | RegexOptions.IgnoreCase);

        private readonly IAppFolderInfo _appFolderInfo;
        private readonly IDiskProvider _diskProvider;

        public MediaCoverMapper(IAppFolderInfo appFolderInfo, IDiskProvider diskProvider, Logger logger)
            : base(diskProvider, logger)
        {
            _appFolderInfo = appFolderInfo;
            _diskProvider = diskProvider;
        }

        protected override string FolderPath => Path.Combine(_appFolderInfo.GetAppDataPath(), "MediaCover");

        protected override string MapPath(string resourceUrl)
        {
            var path = resourceUrl.Replace('/', Path.DirectorySeparatorChar);
            path = path.Trim(Path.DirectorySeparatorChar);

            var resourcePath = Path.Combine(_appFolderInfo.GetAppDataPath(), path);

            if (!_diskProvider.FileExists(resourcePath) || _diskProvider.GetFileSize(resourcePath) == 0)
            {
                var baseResourcePath = RegexResizedImage.Replace(resourcePath, "");
                if (baseResourcePath != resourcePath)
                {
                    return baseResourcePath;
                }
            }

            return resourcePath;
        }

        // Older versions saved a cover under whatever extension its URL had, so an .html or .svg
        // can already be sitting in the cache. Only image files are ever served from it.
        public override IActionResult GetResponse(string resourceUrl)
        {
            var path = resourceUrl.Split('?')[0];

            if (!CoverImageFormat.HasAllowedExtension(path))
            {
                return null;
            }

            return base.GetResponse(resourceUrl);
        }

        public override bool CanHandle(string resourceUrl)
        {
            return resourceUrl.StartsWith("/MediaCover/", StringComparison.InvariantCultureIgnoreCase);
        }
    }
}
