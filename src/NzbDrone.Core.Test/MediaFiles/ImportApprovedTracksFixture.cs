using System;
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
                  .Setup(s => s.UpgradeBookFile(It.IsAny<BookFile>(), It.IsAny<LocalBook>(), It.IsAny<bool>(), It.IsAny<ICollection<string>>()))
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
                  .Verify(v => v.UpgradeBookFile(It.IsAny<BookFile>(), _approvedDecisions.First().Item, false, It.IsAny<ICollection<string>>()),
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
                  .Verify(v => v.UpgradeBookFile(It.IsAny<BookFile>(), _approvedDecisions.First().Item, false, It.IsAny<ICollection<string>>()),
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
                  .Verify(v => v.UpgradeBookFile(It.IsAny<BookFile>(), _approvedDecisions.First().Item, true, It.IsAny<ICollection<string>>()), Times.Once());
        }

        [Test]
        public void should_use_override_importmode()
        {
            Subject.Import(new List<ImportDecision<LocalBook>> { _approvedDecisions.First() }, true, new DownloadClientItem { Title = "Alien.Ant.Farm-Truant", CanMoveFiles = false, DownloadClientInfo = _clientInfo }, ImportMode.Move);

            Mocker.GetMock<IUpgradeMediaFiles>()
                  .Verify(v => v.UpgradeBookFile(It.IsAny<BookFile>(), _approvedDecisions.First().Item, false, It.IsAny<ICollection<string>>()), Times.Once());
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
            diskProvider.Setup(s => s.TryCreateHardLink(It.IsAny<string>(), It.IsAny<string>()))
                .Returns<string, string>((source, destination) =>
                {
                    if (disk.ContainsKey(destination))
                    {
                        return false;
                    }

                    disk[destination] = disk[source];
                    return true;
                });
            diskProvider.Setup(s => s.DeleteFile(It.IsAny<string>())).Callback<string>(p => disk.Remove(p));

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

            ExceptionVerification.ExpectedWarns(4);
        }

        [Test]
        public void should_keep_the_old_files_when_the_new_rows_cannot_be_saved()
        {
            var disk = new Dictionary<string, string>();
            var database = new List<BookFile>();
            var decisions = GivenMultiPartUpgrade(disk, database);

            Mocker.GetMock<IMediaFileService>()
                .Setup(s => s.AddMany(It.IsAny<List<BookFile>>()))
                .Throws(new InvalidOperationException("database or disk is full"));

            Assert.Throws<InvalidOperationException>(() => Subject.Import(decisions, true));

            disk.Values.Where(x => x == "old").Should().HaveCount(3);

            Mocker.GetMock<IRecycleBinProvider>()
                .Verify(v => v.DeleteFile(It.IsAny<string>(), It.IsAny<string>()), Times.Never());

            ExceptionVerification.ExpectedErrors(1);
            ExceptionVerification.ExpectedWarns(3);
        }

        [Test]
        public void should_keep_the_old_files_when_a_part_of_a_multi_part_upgrade_was_rejected()
        {
            var disk = new Dictionary<string, string>();
            var database = new List<BookFile>();
            var decisions = GivenMultiPartUpgrade(disk, database);
            var oldPart3 = database.Single(x => x.Part == 3).Path;

            // The third part never reaches the import, e.g. FreeSpaceSpecification rejected it
            decisions[2].Reject(new Rejection("Not enough free space"));

            Subject.Import(decisions, true);

            disk.Values.Where(x => x == "old").Should().HaveCount(3);
            disk.Should().Contain(oldPart3, "old");

            Mocker.GetMock<IRecycleBinProvider>()
                .Verify(v => v.DeleteFile(It.IsAny<string>(), It.IsAny<string>()), Times.Never());

            ExceptionVerification.ExpectedWarns(3);
        }

        [Test]
        public void should_keep_the_old_files_when_a_file_in_the_batch_could_not_be_identified()
        {
            var disk = new Dictionary<string, string>();
            var database = new List<BookFile>();
            var decisions = GivenMultiPartUpgrade(disk, database);

            // The third part failed before identification, so it has no book to mark incomplete
            var unidentified = new ImportDecision<LocalBook>(new LocalBook { Path = decisions[2].Item.Path }, new Rejection("Unable to parse file"));
            decisions[2] = unidentified;

            Subject.Import(decisions, true);

            disk.Values.Where(x => x == "old").Should().HaveCount(3);

            Mocker.GetMock<IRecycleBinProvider>()
                .Verify(v => v.DeleteFile(It.IsAny<string>(), It.IsAny<string>()), Times.Never());

            ExceptionVerification.ExpectedWarns(3);
        }

        [Test]
        public void should_keep_the_old_files_when_a_part_of_a_multi_part_upgrade_vanished_before_it_was_read()
        {
            var disk = new Dictionary<string, string>();
            var database = new List<BookFile>();
            var decisions = GivenMultiPartUpgrade(disk, database);

            // Part 3 is deleted between the folder listing and reading it. Take its decision from the real
            // ImportDecisionMaker, so a change there that drops or reshapes it shows up here.
            var file = new Mock<System.IO.Abstractions.IFileInfo>();
            file.SetupGet(f => f.FullName).Returns(decisions[2].Item.Path);
            file.SetupGet(f => f.Extension).Returns(".mp3");

            var mediaFiles = new Mock<IMediaFileService>();
            mediaFiles.Setup(s => s.FilterUnchangedFiles(It.IsAny<List<System.IO.Abstractions.IFileInfo>>(), It.IsAny<FilterFilesType>()))
                .Returns((List<System.IO.Abstractions.IFileInfo> files, FilterFilesType filter) => files);

            var tags = new Mock<IMetadataTagService>();
            tags.Setup(s => s.ReadTags(It.IsAny<System.IO.Abstractions.IFileInfo>())).Returns(new ParsedTrackInfo());

            var augmenting = new Mock<NzbDrone.Core.MediaFiles.BookImport.Aggregation.IAugmentingService>();
            augmenting.Setup(s => s.Augment(It.IsAny<LocalBook>(), It.IsAny<bool>()))
                .Throws(new FileNotFoundException("File doesn't exist: " + decisions[2].Item.Path));

            var decisionMaker = new ImportDecisionMaker(new List<IImportDecisionEngineSpecification<LocalBook>>(),
                                                        new List<IImportDecisionEngineSpecification<LocalEdition>>(),
                                                        mediaFiles.Object,
                                                        tags.Object,
                                                        augmenting.Object,
                                                        new Mock<NzbDrone.Core.MediaFiles.BookImport.Identification.IIdentificationService>().Object,
                                                        new Mock<IRootFolderService>().Object,
                                                        new Mock<IQualityProfileService>().Object,
                                                        TestLogger);

            var vanished = decisionMaker.GetLocalTracks(new List<System.IO.Abstractions.IFileInfo> { file.Object }, null, null, FilterFilesType.None).Item2;

            decisions.RemoveAt(2);
            decisions.AddRange(vanished);

            Subject.Import(decisions, true);

            disk.Values.Where(x => x == "old").Should().HaveCount(3);

            Mocker.GetMock<IRecycleBinProvider>()
                .Verify(v => v.DeleteFile(It.IsAny<string>(), It.IsAny<string>()), Times.Never());

            ExceptionVerification.ExpectedWarns(4);
        }

        [Test]
        public void should_keep_the_old_files_when_a_part_is_missing_from_the_download()
        {
            var disk = new Dictionary<string, string>();
            var database = new List<BookFile>();
            var decisions = GivenMultiPartUpgrade(disk, database);

            // Parts 1 and 3 arrived, part 2 never did
            decisions.RemoveAt(1);

            Subject.Import(decisions, true);

            disk.Values.Where(x => x == "old").Should().HaveCount(3);

            Mocker.GetMock<IRecycleBinProvider>()
                .Verify(v => v.DeleteFile(It.IsAny<string>(), It.IsAny<string>()), Times.Never());

            ExceptionVerification.ExpectedWarns(3);
        }

        [Test]
        public void should_replace_every_old_part_when_the_tags_of_a_multi_part_upgrade_repeat_a_part()
        {
            var disk = new Dictionary<string, string>();
            var database = new List<BookFile>();
            var decisions = GivenMultiPartUpgrade(disk, database);

            // part2.mp3 and part3.mp3 are both tagged track 2, so the parts are numbered from the filenames
            decisions[2].Item.Part = 2;

            var results = Subject.Import(decisions, true);

            results.Should().OnlyContain(r => r.Result == ImportResultType.Imported);
            decisions.Select(d => d.Item.Part).Should().Equal(1, 2, 3);
            disk.Should().HaveCount(3);
            disk.Values.Should().OnlyContain(x => x == "new");
        }

        // The Autumn Republic, a DrunkenSlug MP3 release of 56 files named "BMAR01-56 ..." to "BMAR56-56 ...".
        // Every real import put BMARnn on part nn-1 from BMAR02 on, so the tags run one behind the filenames
        // and BMAR01 claims a part another, larger, file also claims. It was skipped as already imported each time.
        private List<ImportDecision<LocalBook>> GivenTheAutumnRepublic(List<BookFile> saved)
        {
            var first = _approvedDecisions.First().Item;
            var folder = @"C:\Test\Downloads\Brian McClellan - The Autumn Republic - Book Three of the Powder Mage Trilogy (2015) MP3".AsOsAgnostic();

            Mocker.GetMock<IMediaFileService>()
                .Setup(s => s.AddMany(It.IsAny<List<BookFile>>()))
                .Callback<List<BookFile>>(files => saved.AddRange(files));

            return Enumerable.Range(1, 56).Select(i => new ImportDecision<LocalBook>(new LocalBook
            {
                Author = first.Author,
                Book = first.Book,
                Edition = first.Edition,
                Part = i == 1 ? 1 : i - 1,
                PartCount = 56,
                Size = i == 1 ? 2.Megabytes() : (8 + (i % 10)).Megabytes(),
                Path = Path.Combine(folder, $"BMAR{i:00}-56 Brian McClellan - The Autumn Republic.mp3"),
                Quality = new QualityModel(Quality.MP3),
                FileTrackInfo = new ParsedTrackInfo()
            })).ToList();
        }

        [Test]
        public void should_import_every_part_when_two_files_are_tagged_with_the_same_part()
        {
            var saved = new List<BookFile>();
            var decisions = GivenTheAutumnRepublic(saved);

            var results = Subject.Import(decisions, false);

            results.Should().HaveCount(56);
            results.Should().OnlyContain(r => r.Result == ImportResultType.Imported);

            saved.Select(f => f.Part).Should().BeEquivalentTo(Enumerable.Range(1, 56));
            saved.Should().OnlyContain(f => f.PartCount == 56);
        }

        [Test]
        public void should_number_parts_in_filename_order_when_the_tags_repeat_a_part()
        {
            var saved = new List<BookFile>();
            var decisions = GivenTheAutumnRepublic(saved);

            Subject.Import(decisions, false);

            foreach (var file in saved)
            {
                var number = int.Parse(Path.GetFileName(file.Path).Substring(4, 2));
                file.Part.Should().Be(number, Path.GetFileName(file.Path));
            }
        }

        [Test]
        public void should_keep_tagged_part_numbers_that_are_unique()
        {
            var saved = new List<BookFile>();
            var decisions = GivenTheAutumnRepublic(saved);

            // BMAR01 tagged as the opening credits, part 56, so every file has its own number
            decisions[0].Item.Part = 56;

            Subject.Import(decisions, false);

            saved.Should().HaveCount(56);
            saved.Single(f => f.Path.Contains("BMAR01-56")).Part.Should().Be(56);
            saved.Single(f => f.Path.Contains("BMAR02-56")).Part.Should().Be(1);
        }

        [Test]
        public void should_still_import_one_ebook_when_two_formats_claim_the_same_part()
        {
            var first = _approvedDecisions.First().Item;
            var folder = @"C:\Test\Downloads\Book".AsOsAgnostic();

            var decisions = new[] { ("Book.epub", Quality.EPUB), ("Book.azw3", Quality.AZW3) }
                .Select(x => new ImportDecision<LocalBook>(new LocalBook
                {
                    Author = first.Author,
                    Book = first.Book,
                    Edition = first.Edition,
                    Part = 1,
                    PartCount = 2,
                    Path = Path.Combine(folder, x.Item1),
                    Quality = new QualityModel(x.Item2),
                    FileTrackInfo = new ParsedTrackInfo()
                }))
                .ToList();

            var results = Subject.Import(decisions, false);

            results.Should().ContainSingle(r => r.Result == ImportResultType.Imported);
            decisions.Select(d => d.Item.Part).Should().Equal(1, 1);

            ExceptionVerification.ExpectedWarns(1);
        }

        // Audio files of the fixture's book under one download folder, as "Folder/Name.mp3" with their tagged part
        private List<ImportDecision<LocalBook>> GivenAudioParts(List<BookFile> saved, params (string Path, int Part)[] files)
        {
            var first = _approvedDecisions.First().Item;
            var folder = @"C:\Test\Downloads\Book".AsOsAgnostic();

            Mocker.GetMock<IMediaFileService>()
                .Setup(s => s.AddMany(It.IsAny<List<BookFile>>()))
                .Callback<List<BookFile>>(added => saved.AddRange(added));

            return files.Select(f => new ImportDecision<LocalBook>(new LocalBook
            {
                Author = first.Author,
                Book = first.Book,
                Edition = first.Edition,
                Part = f.Part,
                PartCount = files.Length,
                Size = 10.Megabytes(),
                Path = Path.Combine(new[] { folder }.Concat(f.Path.Split('/')).ToArray()),
                Quality = new QualityModel(Quality.MP3),
                FileTrackInfo = new ParsedTrackInfo()
            })).ToList();
        }

        // Without a provable numbering the tagged parts stand: the first file for each part imports and every
        // other file claiming it is skipped, with a warning rather than silently
        private void AssertNotRenumbered(List<ImportDecision<LocalBook>> decisions, List<ImportResult> results, int[] tagged, int skipped)
        {
            decisions.Select(d => d.Item.Part).Should().Equal(tagged);
            results.Should().NotContain(r => r.Result == ImportResultType.Rejected);
            results.Where(r => r.Result == ImportResultType.Skipped).Should().HaveCount(skipped)
                .And.OnlyContain(r => r.Errors.Contains("Book has already been imported"));

            ExceptionVerification.ExpectedWarns(skipped);
        }

        [Test]
        public void should_not_renumber_clashing_parts_when_the_filenames_skip_a_number()
        {
            var saved = new List<BookFile>();
            var decisions = GivenAudioParts(saved, ("Book - Part 1.mp3", 1), ("Book - Part 2.mp3", 1), ("Book - Part 4.mp3", 4));

            var results = Subject.Import(decisions, false);

            AssertNotRenumbered(decisions, results, new[] { 1, 1, 4 }, 1);
            saved.Select(f => f.Part).Should().BeEquivalentTo(new[] { 1, 4 });
        }

        [Test]
        public void should_not_renumber_clashing_parts_when_a_tag_claims_a_part_beyond_the_file_count()
        {
            // The names run 1 to 3 but a tag says part 4, so a part is missing and numbering by name would hide it
            var saved = new List<BookFile>();
            var decisions = GivenAudioParts(saved, ("Book - Part 1.mp3", 1), ("Book - Part 2.mp3", 1), ("Book - Part 3.mp3", 4));

            var results = Subject.Import(decisions, false);

            AssertNotRenumbered(decisions, results, new[] { 1, 1, 4 }, 1);
        }

        [Test]
        public void should_keep_the_old_files_when_an_upgrade_has_clashing_parts_its_names_cannot_number()
        {
            var disk = new Dictionary<string, string>();
            var database = new List<BookFile>();
            var decisions = GivenMultiPartUpgrade(disk, database);

            // Tagged 1, 1, 3 and named part1, part2, part4
            decisions[1].Item.Part = 1;
            decisions[2].Item.Path = decisions[2].Item.Path.Replace("part3", "part4");

            var results = Subject.Import(decisions, true);

            decisions.Select(d => d.Item.Part).Should().Equal(1, 1, 3);
            results.Should().ContainSingle(r => r.Result == ImportResultType.Skipped);
            disk.Values.Where(x => x == "old").Should().HaveCount(3);

            Mocker.GetMock<IRecycleBinProvider>()
                .Verify(v => v.DeleteFile(It.IsAny<string>(), It.IsAny<string>()), Times.Never());

            ExceptionVerification.ExpectedWarns(4);
        }

        [Test]
        public void should_not_number_two_editions_together()
        {
            var saved = new List<BookFile>();
            var decisions = GivenAudioParts(saved,
                ("Book 1.mp3", 1),
                ("Book 2.mp3", 2),
                ("Book 3.mp3", 3),
                ("Book 4.mp3", 1),
                ("Book 5.mp3", 2),
                ("Book 6.mp3", 3));

            var otherEdition = Builder<Edition>.CreateNew()
                .With(e => e.Id = 2)
                .With(e => e.ForeignEditionId = "other edition")
                .With(e => e.Book = decisions[0].Item.Book)
                .Build();

            decisions.Skip(3).ToList().ForEach(d => d.Item.Edition = otherEdition);

            var results = Subject.Import(decisions, false);

            AssertNotRenumbered(decisions, results, new[] { 1, 2, 3, 1, 2, 3 }, 3);
        }

        [Test]
        public void should_not_number_parts_across_disc_folders()
        {
            var saved = new List<BookFile>();
            var decisions = GivenAudioParts(saved,
                ("Disc 1/Track 1.mp3", 1),
                ("Disc 1/Track 2.mp3", 2),
                ("CD 2/Track 1.mp3", 1),
                ("CD 2/Track 2.mp3", 2));

            var results = Subject.Import(decisions, false);

            AssertNotRenumbered(decisions, results, new[] { 1, 2, 1, 2 }, 2);
        }

        [Test]
        public void should_not_number_parts_across_disc_folders_even_when_the_names_count_up()
        {
            var saved = new List<BookFile>();
            var decisions = GivenAudioParts(saved,
                ("Disc 1/01.mp3", 1),
                ("Disc 1/02.mp3", 2),
                ("Disc 2/03.mp3", 1),
                ("Disc 2/04.mp3", 2));

            var results = Subject.Import(decisions, false);

            AssertNotRenumbered(decisions, results, new[] { 1, 2, 1, 2 }, 2);
        }

        [Test]
        public void should_not_renumber_when_two_numbers_in_the_names_give_different_orders()
        {
            var saved = new List<BookFile>();
            var decisions = GivenAudioParts(saved, ("01 Chapter 03.mp3", 1), ("02 Chapter 02.mp3", 1), ("03 Chapter 01.mp3", 3));

            var results = Subject.Import(decisions, false);

            AssertNotRenumbered(decisions, results, new[] { 1, 1, 3 }, 1);
        }

        [Test]
        public void should_not_renumber_when_the_names_count_more_parts_than_there_are_files()
        {
            // Part 4 of 4 is missing, so numbering 1 to 3 by name would hide the gap
            var saved = new List<BookFile>();
            var decisions = GivenAudioParts(saved, ("Book 01 of 04.mp3", 1), ("Book 02 of 04.mp3", 1), ("Book 03 of 04.mp3", 3));

            var results = Subject.Import(decisions, false);

            AssertNotRenumbered(decisions, results, new[] { 1, 1, 3 }, 1);
        }

        [Test]
        public void should_not_renumber_when_another_number_in_the_names_counts_past_the_files()
        {
            var saved = new List<BookFile>();
            var decisions = GivenAudioParts(saved, ("01 Chapter 10.mp3", 1), ("02 Chapter 09.mp3", 1), ("03 Chapter 08.mp3", 3));

            var results = Subject.Import(decisions, false);

            AssertNotRenumbered(decisions, results, new[] { 1, 1, 3 }, 1);
        }

        [Test]
        public void should_renumber_when_two_numbers_in_the_names_give_the_same_order()
        {
            var saved = new List<BookFile>();
            var decisions = GivenAudioParts(saved, ("Book 01 (01 of 03).mp3", 1), ("Book 02 (02 of 03).mp3", 1), ("Book 03 (03 of 03).mp3", 3));

            var results = Subject.Import(decisions, false);

            decisions.Select(d => d.Item.Part).Should().Equal(1, 2, 3);
            results.Should().OnlyContain(r => r.Result == ImportResultType.Imported);
        }

        [Test]
        public void should_not_let_a_rejected_preview_reorder_correctly_tagged_parts()
        {
            var saved = new List<BookFile>();
            var decisions = GivenAudioParts(saved, ("Opening.mp3", 1), ("Closing.mp3", 2), ("Preview.mp3", 0));

            decisions[2].Reject(new Rejection("Not an upgrade for existing book file(s)"));

            Subject.Import(decisions, false);

            saved.Should().HaveCount(2);
            saved.Single(f => f.Path.EndsWith("Opening.mp3")).Part.Should().Be(1);
            saved.Single(f => f.Path.EndsWith("Closing.mp3")).Part.Should().Be(2);
        }

        // Books A and B have the same title, so both are renamed onto one path. Book B still has a row for that
        // path from a file that has since gone missing. A is imported first.
        private List<ImportDecision<LocalBook>> GivenTwoBooksSharingAPath(Dictionary<string, string> disk, List<BookFile> database, out string sharedPath, out BookFile staleRow)
        {
            var first = _approvedDecisions.First().Item;
            var author = first.Author;
            sharedPath = Path.Combine(author.Path, "Visitors", "Orson Scott Card - Visitors.m4b");

            var bookA = Builder<Book>.CreateNew().With(b => b.Id = 65263).With(b => b.ForeignBookId = "A").With(b => b.Author = author).Build();
            var bookB = Builder<Book>.CreateNew().With(b => b.Id = 97553).With(b => b.ForeignBookId = "B").With(b => b.Author = author).Build();
            var editionA = Builder<Edition>.CreateNew().With(e => e.Id = 1).With(e => e.Book = bookA).With(e => e.Monitored = true).Build();
            var editionB = Builder<Edition>.CreateNew().With(e => e.Id = 2).With(e => e.Book = bookB).With(e => e.Monitored = true).Build();
            bookA.Editions = new List<Edition> { editionA };
            bookB.Editions = new List<Edition> { editionB };

            staleRow = new BookFile { Id = 10, EditionId = editionB.Id, Path = sharedPath };
            database.Add(staleRow);

            var decisionA = new ImportDecision<LocalBook>(new LocalBook
            {
                Author = author,
                Book = bookA,
                Edition = editionA,
                Part = 1,
                Size = 200,
                Path = Path.Combine(@"C:\Test\Downloads\A".AsOsAgnostic(), "a.m4b"),
                Quality = new QualityModel(Quality.MP3),
                FileTrackInfo = new ParsedTrackInfo()
            });

            var decisionB = new ImportDecision<LocalBook>(new LocalBook
            {
                Author = author,
                Book = bookB,
                Edition = editionB,
                Part = 1,
                Size = 100,
                Path = Path.Combine(@"C:\Test\Downloads\B".AsOsAgnostic(), "b.m4b"),
                Quality = new QualityModel(Quality.MP3),
                FileTrackInfo = new ParsedTrackInfo()
            });

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
            diskProvider.Setup(s => s.TryCreateHardLink(It.IsAny<string>(), It.IsAny<string>()))
                .Returns<string, string>((source, destination) =>
                {
                    if (disk.ContainsKey(destination))
                    {
                        return false;
                    }

                    disk[destination] = disk[source];
                    return true;
                });
            diskProvider.Setup(s => s.DeleteFile(It.IsAny<string>())).Callback<string>(p => disk.Remove(p));

            Mocker.GetMock<IRecycleBinProvider>()
                .Setup(s => s.DeleteFile(It.IsAny<string>(), It.IsAny<string>()))
                .Callback<string, string>((path, subfolder) => disk.Remove(path));

            var shared = sharedPath;

            // A is renamed onto the shared path, B onto its own
            Mocker.GetMock<IMoveBookFiles>()
                .Setup(s => s.MoveBookFile(It.IsAny<BookFile>(), It.IsAny<LocalBook>()))
                .Returns((BookFile file, LocalBook localBook) =>
                {
                    file.Path = localBook.Book.ForeignBookId == "A" ? shared : Path.Combine(author.Path, "Visitors (2)", "Orson Scott Card - Visitors.m4b");
                    disk[file.Path] = localBook.Book.ForeignBookId;
                    return file;
                });

            Mocker.GetMock<IEditionService>()
                .Setup(s => s.SetMonitored(It.IsAny<Edition>()))
                .Returns<Edition>(e => new List<Edition> { e });

            var mediaFileService = Mocker.GetMock<IMediaFileService>();
            mediaFileService.Setup(s => s.GetFilesByBook(It.IsAny<int>()))
                .Returns<int>(id => database.Where(f => f.EditionId == (id == bookA.Id ? editionA.Id : editionB.Id)).ToList());
            mediaFileService.Setup(s => s.Delete(It.IsAny<BookFile>(), It.IsAny<DeleteMediaFileReason>()))
                .Callback<BookFile, DeleteMediaFileReason>((file, reason) => database.RemoveAll(x => x.Id == file.Id));

            Mocker.SetConstant<IUpgradeMediaFiles>(Mocker.Resolve<UpgradeMediaFileService>());

            return new List<ImportDecision<LocalBook>> { decisionA, decisionB };
        }

        [Test]
        public void should_not_remove_a_file_another_book_just_imported_to_a_path_in_its_stale_rows()
        {
            var disk = new Dictionary<string, string>();
            var database = new List<BookFile>();
            var decisions = GivenTwoBooksSharingAPath(disk, database, out var sharedPath, out var staleRow);

            Subject.Import(decisions, true);

            disk.Should().Contain(sharedPath, "A");

            // The stale row still goes, so A's new row can take the path
            database.Should().NotContain(staleRow);

            ExceptionVerification.ExpectedWarns(1);
        }

        [Test]
        public void should_not_remove_a_file_another_book_left_behind_when_its_import_failed()
        {
            var disk = new Dictionary<string, string>();
            var database = new List<BookFile>();
            var decisions = GivenTwoBooksSharingAPath(disk, database, out var sharedPath, out _);
            var sourceA = decisions[0].Item.Path;
            disk[sourceA] = "A";

            // A lands on the shared path, then the date read after the move fails...
            Mocker.GetMock<IMoveBookFiles>()
                .Setup(s => s.MoveBookFile(It.Is<BookFile>(f => f.Path == sourceA), It.IsAny<LocalBook>()))
                .Callback<BookFile, LocalBook>((file, localBook) =>
                {
                    disk[sharedPath] = disk[file.Path];
                    disk.Remove(file.Path);
                    file.Path = sharedPath;
                })
                .Throws(new IOException("Input/output error"));

            // ...and so does moving it back to the download folder
            Mocker.GetMock<IDiskProvider>()
                .Setup(s => s.MoveFile(sharedPath, sourceA, It.IsAny<bool>()))
                .Throws(new IOException("Input/output error"));

            Subject.Import(decisions, true);

            disk.Should().Contain(sharedPath, "A");

            ExceptionVerification.ExpectedErrors(1);
            ExceptionVerification.ExpectedWarns(2);
        }

        [Test]
        public void should_not_remove_a_file_another_book_moved_before_its_transfer_failed()
        {
            var disk = new Dictionary<string, string>();
            var database = new List<BookFile>();
            var decisions = GivenTwoBooksSharingAPath(disk, database, out var sharedPath, out _);
            var sourceA = decisions[0].Item.Path;
            disk[sourceA] = "A";

            Mocker.GetMock<IMoveBookFiles>()
                .Setup(s => s.GetBookFilePath(It.IsAny<BookFile>(), It.IsAny<LocalBook>()))
                .Returns((BookFile file, LocalBook localBook) => localBook.Book.ForeignBookId == "A" ? sharedPath : Path.Combine(Path.GetDirectoryName(sharedPath), "Other.m4b"));

            // The transfer moves A onto the shared path and then fails, before bookFile.Path is updated
            Mocker.GetMock<IMoveBookFiles>()
                .Setup(s => s.MoveBookFile(It.Is<BookFile>(f => f.Path == sourceA), It.IsAny<LocalBook>()))
                .Callback<BookFile, LocalBook>((file, localBook) =>
                {
                    disk[sharedPath] = disk[file.Path];
                    disk.Remove(file.Path);
                })
                .Throws(new IOException("Input/output error"));

            Subject.Import(decisions, true);

            disk.Should().Contain(sharedPath, "A");

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

        [Test]
        public void should_keep_an_existing_file_mapped_when_writing_its_tags_fails()
        {
            Mocker.GetMock<IMediaFileService>()
                .Setup(s => s.GetFileWithPath(It.IsAny<string>()))
                .Returns(Builder<BookFile>.CreateNew().Build());

            Mocker.GetMock<IMetadataTagService>()
                .Setup(s => s.WriteTags(It.IsAny<BookFile>(), It.IsAny<bool>(), It.IsAny<bool>()))
                .Throws(new InvalidOperationException("Nullable object must have a value."));

            var track = _approvedDecisions.First();
            track.Item.ExistingFile = true;

            var results = Subject.Import(new List<ImportDecision<LocalBook>> { track }, false);

            results.Should().ContainSingle(r => r.Result == ImportResultType.Imported);

            Mocker.GetMock<IMediaFileService>()
                .Verify(v => v.AddMany(It.Is<List<BookFile>>(l => l.Count == 1 && l[0].Path == track.Item.Path)), Times.Once());

            ExceptionVerification.ExpectedWarns(1);
        }
    }
}
