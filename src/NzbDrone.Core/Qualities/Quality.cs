using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json.Serialization;
using NzbDrone.Core.Datastore;

namespace NzbDrone.Core.Qualities
{
    [JsonConverter(typeof(QualityConverter))]
    public class Quality : IEmbeddedDocument, IEquatable<Quality>
    {
        public int Id { get; set; }
        public string Name { get; set; }

        public Quality()
        {
        }

        private Quality(int id, string name)
        {
            Id = id;
            Name = name;
        }

        public override string ToString()
        {
            return Name;
        }

        public override int GetHashCode()
        {
            return Id.GetHashCode();
        }

        public bool Equals(Quality other)
        {
            if (ReferenceEquals(null, other))
            {
                return false;
            }

            if (ReferenceEquals(this, other))
            {
                return true;
            }

            return Id.Equals(other.Id);
        }

        public override bool Equals(object obj)
        {
            if (ReferenceEquals(null, obj))
            {
                return false;
            }

            if (ReferenceEquals(this, obj))
            {
                return true;
            }

            return Equals(obj as Quality);
        }

        public static bool operator ==(Quality left, Quality right)
        {
            return Equals(left, right);
        }

        public static bool operator !=(Quality left, Quality right)
        {
            return !Equals(left, right);
        }

        public static Quality Unknown => new Quality(0, "Unknown Text");
        public static Quality PDF => new Quality(1, "PDF");
        public static Quality MOBI => new Quality(2, "MOBI");
        public static Quality EPUB => new Quality(3, "EPUB");
        public static Quality AZW3 => new Quality(4, "AZW3");
        public static Quality MP3 => new Quality(10, "MP3");
        public static Quality FLAC => new Quality(11, "FLAC");
        public static Quality M4B => new Quality(12, "M4B");
        public static Quality UnknownAudio => new Quality(13, "Unknown Audio");

        static Quality()
        {
            All = new List<Quality>
            {
                Unknown,
                PDF,
                MOBI,
                EPUB,
                AZW3,
                UnknownAudio,
                MP3,
                M4B,
                FLAC
            };

            AllLookup = new Quality[All.Select(v => v.Id).Max() + 1];
            foreach (var quality in All)
            {
                AllLookup[quality.Id] = quality;
            }

            Audio = new HashSet<Quality>
            {
                UnknownAudio,
                MP3,
                M4B,
                FLAC
            };

            DefaultQualityDefinitions = new HashSet<QualityDefinition>
            {
                new QualityDefinition(Quality.Unknown)      { Weight = 1, MinSize = 0, MaxSize = 350, GroupWeight = 1 },
                new QualityDefinition(Quality.PDF)          { Weight = 5, MinSize = 0, MaxSize = 350, GroupWeight = 2 },
                new QualityDefinition(Quality.MOBI)         { Weight = 10, MinSize = 0, MaxSize = 350, GroupWeight = 10 },
                new QualityDefinition(Quality.EPUB)         { Weight = 11, MinSize = 0, MaxSize = 350, GroupWeight = 11 },
                new QualityDefinition(Quality.AZW3)         { Weight = 12, MinSize = 0, MaxSize = 350, GroupWeight = 12 },
                new QualityDefinition(Quality.UnknownAudio) { Weight = 50, MinSize = DefaultAudioMinSize, MaxSize = null, GroupWeight = 50 },
                new QualityDefinition(Quality.MP3)          { Weight = 100, MinSize = DefaultAudioMinSize, MaxSize = null, GroupWeight = 100 },
                new QualityDefinition(Quality.M4B)          { Weight = 105, MinSize = DefaultAudioMinSize, MaxSize = null, GroupWeight = 105 },
                new QualityDefinition(Quality.FLAC)         { Weight = 110, MinSize = DefaultAudioMinSize, MaxSize = null, GroupWeight = 110 },
            };
        }

        // Quality definition sizes are kilobits (x 128 bytes, see Fluent.Kilobits), so this is 10 MiB.
        // For audio qualities MinSize is the smallest total release AcceptableSizeSpecification accepts,
        // which keeps single chapters and partial uploads out. MaxSize is not enforced.
        public const double DefaultAudioMinSize = 10 * 1024 * 1024 / 128;

        public static readonly List<Quality> All;

        public static readonly Quality[] AllLookup;

        public static readonly HashSet<Quality> Audio;

        public static readonly HashSet<QualityDefinition> DefaultQualityDefinitions;

        public static bool IsAudio(Quality quality)
        {
            return quality != null && Audio.Contains(quality);
        }

        public static Quality FindById(int id)
        {
            if (id == 0)
            {
                return Unknown;
            }
            else if (id > AllLookup.Length)
            {
                throw new ArgumentException("ID does not match a known quality", nameof(id));
            }

            var quality = AllLookup[id];

            if (quality == null)
            {
                throw new ArgumentException("ID does not match a known quality", nameof(id));
            }

            return quality;
        }

        public static explicit operator Quality(int id)
        {
            return FindById(id);
        }

        public static explicit operator int(Quality quality)
        {
            return quality.Id;
        }
    }
}
