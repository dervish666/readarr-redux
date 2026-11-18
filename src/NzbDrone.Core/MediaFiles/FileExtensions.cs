using System;
using System.Collections.Generic;

namespace NzbDrone.Core.MediaFiles
{
    // Extensions a book or audiobook release has no business containing. None of these may ever be a format
    // Readarr imports (epub, mobi, azw*, pdf, cbz, cbr, mp3, m4b, flac and the rest), or a good release would fail.
    public static class FileExtensions
    {
        private static readonly List<string> _dangerousExtensions = new List<string>
        {
            ".lnk",
            ".ps1",
            ".vbs",
            ".zipx"
        };

        private static readonly List<string> _executableExtensions = new List<string>
        {
            ".bat",
            ".cmd",
            ".exe",
            ".sh"
        };

        public static HashSet<string> DangerousExtensions => new HashSet<string>(_dangerousExtensions, StringComparer.OrdinalIgnoreCase);
        public static HashSet<string> ExecutableExtensions => new HashSet<string>(_executableExtensions, StringComparer.OrdinalIgnoreCase);
    }
}
