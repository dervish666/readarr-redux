using System.Collections.Generic;
using System.IO.Abstractions;
using System.IO.Abstractions.TestingHelpers;
using System.Linq;
using FluentAssertions;
using Moq;
using NUnit.Framework;
using NzbDrone.Common.Disk;
using NzbDrone.Core.Books;
using NzbDrone.Core.DecisionEngine;
using NzbDrone.Core.MediaFiles;
using NzbDrone.Core.MediaFiles.BookImport;
using NzbDrone.Core.MediaFiles.BookImport.Manual;
using NzbDrone.Core.Parser.Model;
using NzbDrone.Core.Test.Framework;
using NzbDrone.Test.Common;

namespace NzbDrone.Core.Test.MediaFiles.BookImport.Manual
{
    [TestFixture]
    public class ManualImportServiceFixture : CoreTest<ManualImportService>
    {
        private static readonly string Folder = @"C:\books\AudioBooks\TheFirstDefier".AsOsAgnostic();

        private List<IFileInfo> _files;
        private Book _book;

        [SetUp]
        public void Setup()
        {
            var fileSystem = new MockFileSystem();

            _files = new[] { 1, 4, 6 }
                .Select(n => System.IO.Path.Combine(Folder, $"Defiance of the Fall {n}", $"TheFirstDefier - Defiance of the Fall {n}.m4b"))
                .Select(p =>
                {
                    fileSystem.AddFile(p, new MockFileData(string.Empty));
                    return fileSystem.FileInfo.FromFileName(p);
                })
                .ToList();

            _book = new Book { Id = 4, Title = "Defiance of the Fall 4" };

            Mocker.GetMock<IDiskProvider>().Setup(s => s.FolderExists(Folder)).Returns(true);
            Mocker.GetMock<IDiskScanService>().Setup(s => s.GetBookFiles(Folder, true)).Returns(_files.ToArray());
        }

        private ImportDecision<LocalBook> Decision(IFileInfo file, bool additional, params Rejection[] rejections)
        {
            return new ImportDecision<LocalBook>(new LocalBook { Path = file.FullName, Book = _book, AdditionalFile = additional }, rejections);
        }

        // Three files all tagged as book 4: each is its own release, and each release also carries book 4's files
        // on disk as additional files, so every path comes back three times
        [Test]
        public void should_return_one_row_per_file_preferring_its_own_decision()
        {
            var decisions = new List<ImportDecision<LocalBook>>();

            foreach (var own in _files)
            {
                decisions.Add(Decision(own, false));
                decisions.AddRange(_files.Where(f => f != own).Select(f => Decision(f, true, new Rejection("Has the same filesize as existing file"))));
            }

            Mocker.GetMock<IMakeImportDecision>()
                  .Setup(s => s.GetImportDecisions(It.IsAny<List<IFileInfo>>(), It.IsAny<IdentificationOverrides>(), It.IsAny<ImportDecisionMakerInfo>(), It.IsAny<ImportDecisionMakerConfig>()))
                  .Returns(decisions);

            var items = Subject.GetMediaFiles(Folder, null, null, FilterFilesType.None, false);

            items.Should().HaveCount(3);
            items.Select(i => i.Path).Should().OnlyHaveUniqueItems();
            items.Should().OnlyContain(i => !i.AdditionalFile && !i.Rejections.Any());
        }
    }
}
