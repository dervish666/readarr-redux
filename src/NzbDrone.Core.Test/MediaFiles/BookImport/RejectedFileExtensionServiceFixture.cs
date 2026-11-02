using System.Linq;
using FluentAssertions;
using NUnit.Framework;
using NzbDrone.Core.MediaFiles;
using NzbDrone.Core.MediaFiles.BookImport;
using NzbDrone.Core.Test.Framework;

namespace NzbDrone.Core.Test.MediaFiles.BookImport
{
    [TestFixture]
    public class RejectedFileExtensionServiceFixture : CoreTest<RejectedFileExtensionService>
    {
        // Book, comic and audio formats a release can legitimately hold, imported or not
        private static readonly string[] BookAndAudioExtensions =
        {
            ".epub", ".kepub", ".mobi", ".azw", ".azw3", ".azw4", ".kfx", ".pdf", ".cbz", ".cbr", ".cb7", ".djvu",
            ".fb2", ".lit", ".lrf", ".rtf", ".txt", ".doc", ".docx", ".htmlz", ".pdb",
            ".mp3", ".m4a", ".m4b", ".aac", ".flac", ".ogg", ".oga", ".opus", ".wma", ".wav", ".ape", ".alac", ".mp2",
            ".jpg", ".jpeg", ".png", ".nfo", ".opf", ".cue", ".zip", ".rar", ".7z"
        };

        [Test]
        public void should_never_flag_a_book_or_audio_format()
        {
            var flagged = FileExtensions.DangerousExtensions.Concat(FileExtensions.ExecutableExtensions).ToList();

            flagged.Should().NotIntersectWith(BookAndAudioExtensions);
            flagged.Should().NotIntersectWith(MediaFileExtensions.AllExtensions);
        }

        [Test]
        public void should_not_return_rejection_for_book_and_audio_files()
        {
            Subject.GetRejections(BookAndAudioExtensions.Select(e => "Book Title" + e)).Should().BeEmpty();
        }

        [Test]
        public void should_not_return_rejection_for_files_without_an_extension()
        {
            Subject.GetRejections(new[] { "Book Title" }).Should().BeEmpty();
        }

        [TestCase(".lnk")]
        [TestCase(".ps1")]
        [TestCase(".vbs")]
        [TestCase(".zipx")]
        [TestCase(".LNK")]
        public void should_return_rejection_for_dangerous_file(string extension)
        {
            var rejection = Subject.GetRejections(new[] { "Book Title.epub", "Book Title" + extension }).Single();

            rejection.RejectionReason.Should().Be(ImportRejectionReason.DangerousFile);
            rejection.Reason.Should().Contain(extension);
        }

        [TestCase(".exe")]
        [TestCase(".bat")]
        [TestCase(".cmd")]
        [TestCase(".sh")]
        [TestCase(".EXE")]
        public void should_return_rejection_for_executable_file(string extension)
        {
            var rejection = Subject.GetRejections(new[] { "Author - Book Title/Book Title.epub" + extension }).Single();

            rejection.RejectionReason.Should().Be(ImportRejectionReason.ExecutableFile);
            rejection.Reason.Should().Contain(extension);
        }

        [Test]
        public void should_return_a_rejection_for_each_kind_of_file_found()
        {
            Subject.GetRejections(new[] { "setup.exe", "Book Title.lnk" })
                   .Select(r => r.RejectionReason)
                   .Should().BeEquivalentTo(new[] { ImportRejectionReason.DangerousFile, ImportRejectionReason.ExecutableFile });
        }
    }
}
