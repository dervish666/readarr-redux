using System.IO;
using System.Text;
using FluentAssertions;
using ICSharpCode.SharpZipLib.GZip;
using ICSharpCode.SharpZipLib.Tar;
using ICSharpCode.SharpZipLib.Zip;
using NUnit.Framework;
using NzbDrone.Common;
using NzbDrone.Common.EnvironmentInfo;
using NzbDrone.Test.Common;

namespace NzbDrone.Core.Test.ProviderTests.DiskProviderTests
{
    [TestFixture]
    public class ArchiveProviderFixture : TestBase<ArchiveService>
    {
        [Test]
        public void Should_extract_to_correct_folder()
        {
            var destinationFolder = new DirectoryInfo(GetTempFilePath());
            var testArchive = OsInfo.IsWindows ? "TestArchive.zip" : "TestArchive.tar.gz";

            Subject.Extract(GetTestPath("Files/" + testArchive), destinationFolder.FullName);

            destinationFolder.Exists.Should().BeTrue();
            destinationFolder.GetDirectories().Should().HaveCount(1);
            destinationFolder.GetDirectories("*", SearchOption.AllDirectories).Should().HaveCount(3);
            destinationFolder.GetFiles("*.*", SearchOption.AllDirectories).Should().HaveCount(6);
        }

        [Test]
        public void should_not_extract_zip_when_an_entry_escapes_destination()
        {
            var destination = Path.Combine(TempFolder, "extract");
            var archive = CreateZip("good.txt", "../evil.txt");

            Assert.Throws<IOException>(() => Subject.Extract(archive, destination));

            File.Exists(Path.Combine(TempFolder, "evil.txt")).Should().BeFalse();
            File.Exists(Path.Combine(destination, "good.txt")).Should().BeFalse();
        }

        [Test]
        public void should_not_extract_zip_entry_with_absolute_path()
        {
            var destination = Path.Combine(TempFolder, "extract");
            var outside = Path.Combine(TempFolder, "absolute.txt");
            var archive = CreateZip(outside);

            Assert.Throws<IOException>(() => Subject.Extract(archive, destination));

            File.Exists(outside).Should().BeFalse();
        }

        [Test]
        public void should_not_extract_tgz_entry_into_sibling_folder_with_same_prefix()
        {
            var destination = Path.Combine(TempFolder, "extract");
            var archive = CreateTgz("../extract_evil/evil.txt");

            Assert.Throws<IOException>(() => Subject.Extract(archive, destination));

            File.Exists(Path.Combine(TempFolder, "extract_evil", "evil.txt")).Should().BeFalse();
        }

        [Test]
        public void should_extract_tgz_with_current_directory_entries()
        {
            var destination = Path.Combine(TempFolder, "extract");
            var archive = CreateTgz("./", "./Readarr/", "./Readarr/file.txt");

            Subject.Extract(archive, destination);

            File.Exists(Path.Combine(destination, "Readarr", "file.txt")).Should().BeTrue();
        }

        [Test]
        public void extract_root_files_should_only_extract_named_root_entries()
        {
            var destination = Path.Combine(TempFolder, "extract");
            var archive = CreateZip("config.xml", "readarr.db", "INFO", "nested/readarr.db");

            Subject.ExtractRootFiles(archive, destination, new[] { "config.xml", "readarr.db" });

            Directory.GetFileSystemEntries(destination, "*", SearchOption.AllDirectories)
                .Should().BeEquivalentTo(Path.Combine(destination, "config.xml"), Path.Combine(destination, "readarr.db"));
        }

        private string CreateZip(params string[] entryNames)
        {
            var path = Path.Combine(TempFolder, "test.zip");

            using (var zip = new ZipOutputStream(File.Create(path)))
            {
                // Keep names exactly as given, the default transform would clean them up
                zip.NameTransform = null;

                foreach (var name in entryNames)
                {
                    var data = Encoding.UTF8.GetBytes(name);

                    zip.PutNextEntry(new ZipEntry(name));
                    zip.Write(data, 0, data.Length);
                    zip.CloseEntry();
                }
            }

            return path;
        }

        private string CreateTgz(params string[] entryNames)
        {
            var path = Path.Combine(TempFolder, "test.tar.gz");

            using (var tar = new TarOutputStream(new GZipOutputStream(File.Create(path)), Encoding.UTF8))
            {
                foreach (var name in entryNames)
                {
                    var entry = TarEntry.CreateTarEntry(name);

                    if (name.EndsWith("/"))
                    {
                        entry.TarHeader.TypeFlag = TarHeader.LF_DIR;
                        tar.PutNextEntry(entry);
                    }
                    else
                    {
                        var data = Encoding.UTF8.GetBytes(name);

                        entry.Size = data.Length;
                        tar.PutNextEntry(entry);
                        tar.Write(data, 0, data.Length);
                    }

                    tar.CloseEntry();
                }
            }

            return path;
        }
    }
}
