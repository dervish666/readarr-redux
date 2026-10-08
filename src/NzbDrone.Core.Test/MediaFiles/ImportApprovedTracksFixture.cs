using System.Collections.Generic;
using System.IO;
using System.Linq;
using FizzWare.NBuilder;
using FluentAssertions;
using Moq;
using NUnit.Framework;
using NzbDrone.Common.Disk;
using NzbDrone.Core.Books;
using NzbDrone.Core.DecisionEngine;
using NzbDrone.Core.Download;
using NzbDrone.Core.MediaFiles;
using NzbDrone.Core.MediaFiles.BookImport;
using NzbDrone.Core.MediaFiles.Events;
using NzbDrone.Core.Messaging.Events;
using NzbDrone.Core.Parser.Model;
using NzbDrone.Core.Profiles.Qualities;
using NzbDrone.Core.Qualities;
using NzbDrone.Core.RootFolders;
using NzbDrone.Core.Test.Framework;
using NzbDrone.Test.Common;

namespace NzbDrone.Core.Test.MediaFiles
{
    [TestFixture]
    public class ImportApprovedTracksFixture : CoreTest<ImportApprovedBooks>
    {
        private List<ImportDecision<LocalBook>> _rejectedDecisions;
        private List<ImportDecision<LocalBook>> _approvedDecisions;

        private DownloadClientItem _downloadClientItem;
        private DownloadClientItemClientInfo _clientInfo;

        [SetUp]
        public void Setup()
        {
            _rejectedDecisions = new List<ImportDecision<LocalBook>>();
            _approvedDecisions = new List<ImportDecision<LocalBook>>();

            var author = Builder<Author>.CreateNew()
                                        .With(e => e.QualityProfile = new QualityProfile { Items = Qualities.QualityFixture.GetDefaultQualities() })
                                        .With(s => s.Path = @"C:\Test\Music\Alien Ant Farm".AsOsAgnostic())
                                        .Build();

            var book = Builder<Book>.CreateNew()
                .With(e => e.Author = author)
                .Build();

            var edition = Builder<Edition>.CreateNew()
                .With(e => e.Book = book)
                .With(e => e.Monitored = true)
                .Build();

            book.Editions = new List<Edition> { edition };

            var rootFolder = Builder<RootFolder>.CreateNew()
                .With(r => r.IsCalibreLibrary = false)
                .Build();

            _rejectedDecisions.Add(new ImportDecision<LocalBook>(new LocalBook(), new Rejection("Rejected!")));
            _rejectedDecisions.Add(new ImportDecision<LocalBook>(new LocalBook(), new Rejection("Rejected!")));
            _rejectedDecisions.Add(new ImportDecision<LocalBook>(new LocalBook(), new Rejection("Rejected!")));

            _approvedDecisions.Add(new ImportDecision<LocalBook>(
                                       new LocalBook
                                       {
                                           Author = author,
                                           Book = book,
                                           Edition = edition,
                                           Part = 1,
                                           Path = Path.Combine(author.Path, "Alien Ant Farm - 01 - Pilot.mp3"),
                                           Quality = new QualityModel(Quality.MP3),
                                           FileTrackInfo = new ParsedTrackInfo
                                           {
                                               ReleaseGroup = "DRONE"
                                           }
                                       }));

            Mocker.GetMock<IUpgradeMediaFiles>()
                  .Setup(s => s.UpgradeBookFile(It.IsAny<BookFile>(), It.IsAny<LocalBook>(), It.IsAny<bool>()))
                  .Returns(new BookFileMoveResult());

            _clientInfo = Builder<DownloadClientItemClientInfo>.CreateNew().Build();
            _downloadClientItem = Builder<DownloadClientItem>.CreateNew().With(x => x.DownloadClientInfo = _clientInfo).Build();

            Mocker.GetMock<IMediaFileService>()
                .Setup(s => s.GetFilesByBook(It.IsAny<int>()))
                .Returns(new List<BookFile>());

            Mocker.GetMock<IRootFolderService>()
                .Setup(s => s.GetBestRootFolder(It.IsAny<string>()))
                .Returns(rootFolder);

            Mocker.GetMock<IEditionService>()
                .Setup(s => s.SetMonitored(edition))
                .Returns(new List<Edition> { edition });
        }

        [Test]
        public void should_not_import_any_if_there_are_no_approved_decisions()
        {
            Subject.Import(_rejectedDecisions, false).Where(i => i.Result == ImportResultType.Imported).Should().BeEmpty();

            Mocker.GetMock<IMediaFileService>().Verify(v => v.Add(It.IsAny<BookFile>()), Times.Never());
        }

        [Test]
        public void should_import_each_approved()
        {
            Subject.Import(_approvedDecisions, false).Should().HaveCount(1);
        }

        [Test]
        public void should_only_import_approved()
        {
            var all = new List<ImportDecision<LocalBook>>();
            all.AddRange(_rejectedDecisions);
            all.AddRange(_approvedDecisions);

            var result = Subject.Import(all, false);

            result.Should().HaveCount(all.Count);
            result.Where(i => i.Result == ImportResultType.Imported).Should().HaveCount(_approvedDecisions.Count);
        }

        [Test]
        public void should_only_import_each_track_once()
        {
            var all = new List<ImportDecision<LocalBook>>();
            all.AddRange(_approvedDecisions);
            all.Add(new ImportDecision<LocalBook>(_approvedDecisions.First().Item));

            var result = Subject.Import(all, false);

            result.Where(i => i.Result == ImportResultType.Imported).Should().HaveCount(_approvedDecisions.Count);
        }

        [Test]
        public void should_move_new_downloads()
        {
            Subject.Import(new List<ImportDecision<LocalBook>> { _approvedDecisions.First() }, true);

            Mocker.GetMock<IUpgradeMediaFiles>()
                  .Verify(v => v.UpgradeBookFile(It.IsAny<BookFile>(), _approvedDecisions.First().Item, false),
                          Times.Once());
        }

        [Test]
        public void should_publish_TrackImportedEvent_for_new_downloads()
        {
            Subject.Import(new List<ImportDecision<LocalBook>> { _approvedDecisions.First() }, true);

            Mocker.GetMock<IEventAggregator>()
                .Verify(v => v.PublishEvent(It.IsAny<TrackImportedEvent>()), Times.Once());
        }

        [Test]
        public void should_not_move_existing_files()
        {
            var track = _approvedDecisions.First();
            track.Item.ExistingFile = true;
            Subject.Import(new List<ImportDecision<LocalBook>> { track }, false);

            Mocker.GetMock<IUpgradeMediaFiles>()
                  .Verify(v => v.UpgradeBookFile(It.IsAny<BookFile>(), _approvedDecisions.First().Item, false),
                          Times.Never());
        }

        [Test]
        public void should_import_higher_quality_files_first()
        {
            var lqDecision = _approvedDecisions.First();
            lqDecision.Item.Quality = new QualityModel(Quality.MOBI);
            lqDecision.Item.Size = 10.Megabytes();

            var hqDecision = new ImportDecision<LocalBook>(
                new LocalBook
                {
                    Author = lqDecision.Item.Author,
                    Book = lqDecision.Item.Book,
                    Edition = lqDecision.Item.Edition,
                    Part = 1,
                    Path = @"C:\Test\Music\Alien Ant Farm\Alien Ant Farm - 01 - Pilot.mp3".AsOsAgnostic(),
                    Quality = new QualityModel(Quality.AZW3),
                    Size = 1.Megabytes(),
                    FileTrackInfo = new ParsedTrackInfo
                    {
                        ReleaseGroup = "DRONE"
                    }
                });

            var all = new List<ImportDecision<LocalBook>>();
            all.Add(lqDecision);
            all.Add(hqDecision);

            var results = Subject.Import(all, false);

            results.Should().HaveCount(all.Count);
            results.Should().ContainSingle(d => d.Result == ImportResultType.Imported);
            results.Should().ContainSingle(d => d.Result == ImportResultType.Imported && d.ImportDecision.Item.Size == hqDecision.Item.Size);
        }

        [Test]
        public void should_import_larger_files_for_same_quality_first()
        {
            var fileDecision = _approvedDecisions.First();
            fileDecision.Item.Size = 1.Gigabytes();

            var sampleDecision = new ImportDecision<LocalBook>(
                new LocalBook
                {
                    Author = fileDecision.Item.Author,
                    Book = fileDecision.Item.Book,
                    Edition = fileDecision.Item.Edition,
                    Part = 1,
                    Path = @"C:\Test\Music\Alien Ant Farm\Alien Ant Farm - 01 - Pilot.mp3".AsOsAgnostic(),
                    Quality = new QualityModel(Quality.MP3),
                    Size = 80.Megabytes()
                });

            var all = new List<ImportDecision<LocalBook>>();
            all.Add(fileDecision);
            all.Add(sampleDecision);

            var results = Subject.Import(all, false);

            results.Should().HaveCount(all.Count);
            results.Should().ContainSingle(d => d.Result == ImportResultType.Imported);
            results.Should().ContainSingle(d => d.Result == ImportResultType.Imported && d.ImportDecision.Item.Size == fileDecision.Item.Size);
        }

        [Test]
        public void should_copy_when_cannot_move_files_downloads()
        {
            Subject.Import(new List<ImportDecision<LocalBook>> { _approvedDecisions.First() }, true, new DownloadClientItem { Title = "Alien.Ant.Farm-Truant", CanMoveFiles = false, DownloadClientInfo = _clientInfo });

            Mocker.GetMock<IUpgradeMediaFiles>()
                  .Verify(v => v.UpgradeBookFile(It.IsAny<BookFile>(), _approvedDecisions.First().Item, true), Times.Once());
        }

        [Test]
        public void should_use_override_importmode()
        {
            Subject.Import(new List<ImportDecision<LocalBook>> { _approvedDecisions.First() }, true, new DownloadClientItem { Title = "Alien.Ant.Farm-Truant", CanMoveFiles = false, DownloadClientInfo = _clientInfo }, ImportMode.Move);

            Mocker.GetMock<IUpgradeMediaFiles>()
                  .Verify(v => v.UpgradeBookFile(It.IsAny<BookFile>(), _approvedDecisions.First().Item, false), Times.Once());
        }

        // Three old parts in the library and the database, three new parts in the download folder
        private List<ImportDecision<LocalBook>> GivenMultiPartUpgrade(Dictionary<string, string> disk, List<BookFile> database)
        {
            var first = _approvedDecisions.First().Item;
            var book = first.Book;

            var oldFiles = Enumerable.Range(1, 3).Select(i => new BookFile
            {
                Id = i,
                EditionId = first.Edition.Id,
                Part = i,
                Path = Path.Combine(first.Author.Path, $"Book - Part {i}.mp3")
            }).ToList();

            database.AddRange(oldFiles);
            oldFiles.ForEach(x => disk[x.Path] = "old");

            // Identification loads the book's files once and every part shares the same Book
            book.BookFiles = oldFiles.ToList();

            var decisions = Enumerable.Range(1, 3).Select(i => new ImportDecision<LocalBook>(new LocalBook
            {
                Author = first.Author,
                Book = book,
                Edition = first.Edition,
                Part = i,
                PartCount = 3,
                Path = Path.Combine(@"C:\Test\Downloads\Book".AsOsAgnostic(), $"part{i}.mp3"),
                Quality = new QualityModel(Quality.MP3),
                FileTrackInfo = new ParsedTrackInfo()
            })).ToList();

            var diskProvider = Mocker.GetMock<IDiskProvider>();
            diskProvider.Setup(s => s.FolderExists(It.IsAny<string>())).Returns(true);
            diskProvider.Setup(s => s.GetParentFolder(It.IsAny<string>())).Returns<string>(p => Path.GetDirectoryName(p));
            diskProvider.Setup(s => s.FileExists(It.IsAny<string>())).Returns<string>(p => disk.ContainsKey(p));
            diskProvider.Setup(s => s.MoveFile(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<bool>()))
                .Callback<string, string, bool>((source, destination, overwrite) =>
                {
                    disk[destination] = disk[source];
                    disk.Remove(source);
                });

            Mocker.GetMock<IRecycleBinProvider>()
                .Setup(s => s.DeleteFile(It.IsAny<string>(), It.IsAny<string>()))
                .Callback<string, string>((path, subfolder) => disk.Remove(path));

            // The renamer puts each new part on the path the old part with the same number had
            Mocker.GetMock<IMoveBookFiles>()
                .Setup(s => s.MoveBookFile(It.IsAny<BookFile>(), It.IsAny<LocalBook>()))
                .Returns((BookFile file, LocalBook localBook) =>
                {
                    var destination = oldFiles.Single(o => o.Part == file.Part).Path;

                    if (disk.ContainsKey(destination))
                    {
                        throw new DestinationAlreadyExistsException($"Destination {destination} already exists.");
                    }

                    file.Path = destination;
                    disk[file.Path] = "new";
                    return file;
                });

            var mediaFileService = Mocker.GetMock<IMediaFileService>();
            mediaFileService.Setup(s => s.GetFilesByBook(book.Id)).Returns(() => database.ToList());
            mediaFileService.Setup(s => s.Delete(It.IsAny<BookFile>(), It.IsAny<DeleteMediaFileReason>()))
                .Callback<BookFile, DeleteMediaFileReason>((file, reason) => database.RemoveAll(x => x.Id == file.Id));
            mediaFileService.Setup(s => s.AddMany(It.IsAny<List<BookFile>>()))
                .Callback<List<BookFile>>(files => database.AddRange(files));

            Mocker.SetConstant<IUpgradeMediaFiles>(Mocker.Resolve<UpgradeMediaFileService>());

            return decisions;
        }

        [Test]
        public void should_remove_old_files_once_when_upgrading_a_multi_part_book()
        {
            var disk = new Dictionary<string, string>();
            var database = new List<BookFile>();
            var decisions = GivenMultiPartUpgrade(disk, database);

            Subject.Import(decisions, true);

            disk.Should().HaveCount(3);
            disk.Values.Should().OnlyContain(x => x == "new");

            Mocker.GetMock<IRecycleBinProvider>()
                .Verify(v => v.DeleteFile(It.IsAny<string>(), It.IsAny<string>()), Times.Exactly(3));

            // Each Delete publishes one BookFileDeletedEvent, which HistoryService writes as one history row
            Mocker.GetMock<IMediaFileService>().Verify(v => v.Delete(It.IsAny<BookFile>(), DeleteMediaFileReason.Upgrade), Times.Exactly(3));
        }

        [Test]
        public void should_keep_the_old_files_when_a_part_of_a_multi_part_upgrade_fails()
        {
            var disk = new Dictionary<string, string>();
            var database = new List<BookFile>();
            var decisions = GivenMultiPartUpgrade(disk, database);

            // The second part can't be moved, e.g. the disk filled up
            Mocker.GetMock<IMoveBookFiles>()
                .Setup(s => s.MoveBookFile(It.Is<BookFile>(f => f.Part == 2), It.IsAny<LocalBook>()))
                .Throws(new IOException("There is not enough space on the disk."));

            Subject.Import(decisions, true);

            disk.Values.Where(x => x == "old").Should().HaveCount(3);

            Mocker.GetMock<IRecycleBinProvider>()
                .Verify(v => v.DeleteFile(It.IsAny<string>(), It.IsAny<string>()), Times.Never());

            ExceptionVerification.ExpectedWarns(2);
        }

        [Test]
        public void should_delete_existing_trackfiles_with_the_same_path()
        {
            Mocker.GetMock<IMediaFileService>()
                .Setup(s => s.GetFileWithPath(It.IsAny<string>()))
                .Returns(Builder<BookFile>.CreateNew().Build());

            var track = _approvedDecisions.First();
            track.Item.ExistingFile = true;
            Subject.Import(new List<ImportDecision<LocalBook>> { track }, false);

            Mocker.GetMock<IMediaFileService>()
                .Verify(v => v.Delete(It.IsAny<BookFile>(), DeleteMediaFileReason.ManualOverride), Times.Once());
        }
    }
}
