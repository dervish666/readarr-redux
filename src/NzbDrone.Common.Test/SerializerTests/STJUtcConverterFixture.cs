using System;
using System.Globalization;
using System.Text.Json;
using FluentAssertions;
using NUnit.Framework;
using NzbDrone.Common.Serializer;

namespace NzbDrone.Common.Test.SerializerTests
{
    [TestFixture]
    [NonParallelizable]
    [Platform(Exclude = "Win")]
    public class STJUtcConverterFixture
    {
        private string _tz;
        private CultureInfo _culture;

        [SetUp]
        public void SetUp()
        {
            _tz = Environment.GetEnvironmentVariable("TZ");
            _culture = CultureInfo.CurrentCulture;

            // UTC+2 all year round (POSIX zone names invert the sign), read from TZ on Linux and macOS only.
            // fi-FI writes times with '.' rather than ':'.
            Environment.SetEnvironmentVariable("TZ", "Etc/GMT-2");
            TimeZoneInfo.ClearCachedData();
            CultureInfo.CurrentCulture = new CultureInfo("fi-FI");
        }

        [TearDown]
        public void TearDown()
        {
            Environment.SetEnvironmentVariable("TZ", _tz);
            TimeZoneInfo.ClearCachedData();
            CultureInfo.CurrentCulture = _culture;
        }

        // rreading-glasses sends release dates as Go's time.DateTime layout, with no zone
        [TestCase("\"2006-01-02 00:00:00\"")]
        [TestCase("\"2006-01-02T00:00:00Z\"")]
        [TestCase("\"2006-01-02T02:00:00+02:00\"")]
        public void should_read_midnight_utc_as_the_same_day_east_of_utc(string json)
        {
            TimeZoneInfo.Local.GetUtcOffset(new DateTime(2006, 1, 2)).Should().Be(TimeSpan.FromHours(2), "the test is meaningless if the zone override didn't take");

            var options = new JsonSerializerOptions { Converters = { new STJUtcConverter() } };

            var result = JsonSerializer.Deserialize<DateTime>(json, options);

            result.Should().Be(new DateTime(2006, 1, 2, 0, 0, 0, DateTimeKind.Utc));
            result.Kind.Should().Be(DateTimeKind.Utc);
        }
    }
}
