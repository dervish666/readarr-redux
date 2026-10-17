using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;

namespace NzbDrone.Core.MediaCover
{
    // Covers are served from Readarr's own origin, so a cover must be a raster image both by name
    // and by content. A remote URL ending in .html or .svg must never become a stored .html or .svg.
    public static class CoverImageFormat
    {
        public const string DefaultExtension = ".jpg";
        public const int HeaderLength = 12;

        // Cover URLs come from the metadata source, so a hostile or broken server could otherwise stream until the
        // disk or memory runs out. Every cover download and header lookup stops at this many bytes.
        public const long MaxLength = 20 * 1024 * 1024;

        public static readonly HashSet<string> AllowedExtensions = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
        {
            ".jpg",
            ".jpeg",
            ".png",
            ".gif",
            ".webp"
        };

        // Keep a known image extension as given, so covers already cached under it still match.
        // Anything else, including no extension or one carrying a query string, is stored as .jpg.
        public static string NormalizeExtension(string extension)
        {
            if (extension != null && AllowedExtensions.Contains(extension))
            {
                return extension;
            }

            return DefaultExtension;
        }

        public static bool HasAllowedExtension(string path)
        {
            return AllowedExtensions.Contains(Path.GetExtension(path) ?? string.Empty);
        }

        public static bool IsImage(byte[] header)
        {
            if (header == null || header.Length < 4)
            {
                return false;
            }

            // JPEG
            if (header[0] == 0xFF && header[1] == 0xD8 && header[2] == 0xFF)
            {
                return true;
            }

            // PNG
            if (header[0] == 0x89 && header[1] == 0x50 && header[2] == 0x4E && header[3] == 0x47)
            {
                return true;
            }

            // GIF87a and GIF89a
            if (header[0] == 0x47 && header[1] == 0x49 && header[2] == 0x46 && header[3] == 0x38)
            {
                return true;
            }

            if (header.Length < HeaderLength)
            {
                return false;
            }

            // WebP: "RIFF" size "WEBP"
            if (Matches(header, 0, "RIFF") && Matches(header, 8, "WEBP"))
            {
                return true;
            }

            // AVIF: size "ftyp" "avif" or "avis". Some cover hosts negotiate it behind a .jpg URL.
            if (Matches(header, 4, "ftyp") && (Matches(header, 8, "avif") || Matches(header, 8, "avis")))
            {
                return true;
            }

            return false;
        }

        public static bool IsImage(Stream stream)
        {
            if (stream == null)
            {
                return false;
            }

            var header = new byte[HeaderLength];
            var read = 0;

            while (read < header.Length)
            {
                var count = stream.Read(header, read, header.Length - read);

                if (count == 0)
                {
                    break;
                }

                read += count;
            }

            return IsImage(header.Take(read).ToArray());
        }

        private static bool Matches(byte[] header, int offset, string ascii)
        {
            for (var i = 0; i < ascii.Length; i++)
            {
                if (header[offset + i] != ascii[i])
                {
                    return false;
                }
            }

            return true;
        }
    }
}
