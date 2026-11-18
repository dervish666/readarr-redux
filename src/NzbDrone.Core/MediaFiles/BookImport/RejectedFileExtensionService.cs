using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using NzbDrone.Common.Extensions;

namespace NzbDrone.Core.MediaFiles.BookImport
{
    public interface IRejectedFileExtensionService
    {
        ImportRejection[] GetRejections(IEnumerable<string> files);
    }

    public class RejectedFileExtensionService : IRejectedFileExtensionService
    {
        // One rejection per kind of file found, so each can be held against its own Fail Downloads option
        public ImportRejection[] GetRejections(IEnumerable<string> files)
        {
            var extensions = files.Select(Path.GetExtension)
                                  .Where(e => e.IsNotNullOrWhiteSpace())
                                  .ToHashSet(StringComparer.OrdinalIgnoreCase);

            var rejections = new List<ImportRejection>();

            var dangerousExtensions = extensions.Where(FileExtensions.DangerousExtensions.Contains).ToList();

            if (dangerousExtensions.Any())
            {
                rejections.Add(new ImportRejection(ImportRejectionReason.DangerousFile, $"Caution: Found potentially dangerous file with extension: {string.Join(", ", dangerousExtensions)}"));
            }

            var executableExtensions = extensions.Where(FileExtensions.ExecutableExtensions.Contains).ToList();

            if (executableExtensions.Any())
            {
                rejections.Add(new ImportRejection(ImportRejectionReason.ExecutableFile, $"Caution: Found executable file with extension: {string.Join(", ", executableExtensions)}"));
            }

            return rejections.ToArray();
        }
    }
}
