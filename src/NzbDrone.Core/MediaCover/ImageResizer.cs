using NzbDrone.Common.Disk;
using NzbDrone.Common.EnvironmentInfo;
using SixLabors.ImageSharp;
using SixLabors.ImageSharp.Formats;
using SixLabors.ImageSharp.Formats.Bmp;
using SixLabors.ImageSharp.Formats.Gif;
using SixLabors.ImageSharp.Formats.Jpeg;
using SixLabors.ImageSharp.Formats.Png;
using SixLabors.ImageSharp.Formats.Webp;
using SixLabors.ImageSharp.Processing;

namespace NzbDrone.Core.MediaCover
{
    public interface IImageResizer
    {
        void Resize(string source, string destination, int height);
    }

    public class ImageResizer : IImageResizer
    {
        private readonly IDiskProvider _diskProvider;
        private readonly bool _enabled;
        private readonly DecoderOptions _decoderOptions;

        public ImageResizer(IDiskProvider diskProvider, IPlatformInfo platformInfo)
        {
            _diskProvider = diskProvider;

            _enabled = true;

            // Covers come from the metadata source and the file extension from its URL. Only the web
            // formats covers actually use are decoded or encoded, so a hostile cover can't reach the
            // TIFF codec (GHSA-wmxv-xphr-5c9g, GHSA-j9gm-c75j-xc9q, GHSA-jjfr-hcj7-qf5w, unfixed on 3.x).
            var configuration = new SixLabors.ImageSharp.Configuration(
                new JpegConfigurationModule(),
                new PngConfigurationModule(),
                new GifConfigurationModule(),
                new WebpConfigurationModule(),
                new BmpConfigurationModule());

            // Thumbnails don't need super high quality
            configuration.ImageFormatsManager.SetEncoder(JpegFormat.Instance, new JpegEncoder
            {
                Quality = 92
            });

            _decoderOptions = new DecoderOptions { Configuration = configuration };
        }

        public void Resize(string source, string destination, int height)
        {
            if (!_enabled)
            {
                return;
            }

            try
            {
                using var image = Image.Load(_decoderOptions, source);
                image.Mutate(x => x.Resize(0, height));
                image.Save(destination);
            }
            catch
            {
                if (_diskProvider.FileExists(destination))
                {
                    _diskProvider.DeleteFile(destination);
                }

                throw;
            }
        }
    }
}
