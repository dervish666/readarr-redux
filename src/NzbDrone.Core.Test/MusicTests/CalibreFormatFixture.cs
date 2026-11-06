using System;
using System.Collections.Generic;
using FluentAssertions;
using NUnit.Framework;
using NzbDrone.Core.Books.Calibre;

namespace NzbDrone.Core.Test.MusicTests
{
    [TestFixture]
    public class CalibreFormatFixture
    {
        [TestCase("epub", "new.epub")]
        [TestCase("EPUB", "new.epub")]
        [TestCase(null, "old.mobi")]
        [TestCase("pdf", "old.mobi")]
        public void should_keep_the_imported_format_when_other_formats_are_retained(string preferred, string expected)
        {
            var formats = new Dictionary<string, CalibreBookFormat>
            {
                ["mobi"] = new CalibreBookFormat { Path = "old.mobi", LastModified = new DateTime(2020, 1, 1) },
                ["epub"] = new CalibreBookFormat { Path = "new.epub", LastModified = new DateTime(2026, 1, 1) }
            };

            CalibreProxy.GetOriginalFormat(formats, preferred).Should().Be(expected);
        }
    }
}
