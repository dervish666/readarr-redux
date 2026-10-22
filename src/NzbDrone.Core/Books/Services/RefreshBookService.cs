using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Linq;
using NLog;
using NzbDrone.Common.Extensions;
using NzbDrone.Common.Instrumentation.Extensions;
using NzbDrone.Core.Books.Commands;
using NzbDrone.Core.Books.Events;
using NzbDrone.Core.Exceptions;
using NzbDrone.Core.History;
using NzbDrone.Core.MediaCover;
using NzbDrone.Core.MediaFiles;
using NzbDrone.Core.Messaging.Commands;
using NzbDrone.Core.Messaging.Events;
using NzbDrone.Core.MetadataSource;
using NzbDrone.Core.MetadataSource.BookInfo;

namespace NzbDrone.Core.Books
{
    public interface IRefreshBookService
    {
        bool RefreshBookInfo(Book book, List<Book> remoteBooks, Author remoteData, bool forceUpdateFileTags);
        bool RefreshBookInfo(List<Book> books, List<Book> remoteBooks, Author remoteData, bool forceBookRefresh, bool forceUpdateFileTags, DateTime? lastUpdate);
    }

    public class RefreshBookService : RefreshEntityServiceBase<Book, Edition>,
        IRefreshBookService,
        IExecute<RefreshBookCommand>,
        IExecute<BulkRefreshBookCommand>
    {
        private const int MaxFailedLookupsPerRefresh = 3;
        private const int MaxRejectedWorksPerRefresh = 20;

        private readonly IBookService _bookService;
        private readonly IAuthorService _authorService;
        private readonly IEditionService _editionService;
        private readonly IProvideAuthorInfo _authorInfo;
        private readonly IProvideBookInfo _bookInfo;
        private readonly IRefreshEditionService _refreshEditionService;
        private readonly IMediaFileService _mediaFileService;
        private readonly IHistoryService _historyService;
        private readonly IEventAggregator _eventAggregator;
        private readonly ICheckIfBookShouldBeRefreshed _checkIfBookShouldBeRefreshed;
        private readonly IMapCoversToLocal _mediaCoverService;
        private readonly ISeriesBookLinkService _seriesBookLinkService;
        private readonly IMissingBookTracker _missingBookTracker;
        private readonly Logger _logger;

        public RefreshBookService(IBookService bookService,
                                  IAuthorService authorService,
                                  IEditionService editionService,
                                  IAuthorMetadataService authorMetadataService,
                                  IProvideAuthorInfo authorInfo,
                                  IProvideBookInfo bookInfo,
                                  IRefreshEditionService refreshEditionService,
                                  IMediaFileService mediaFileService,
                                  IHistoryService historyService,
                                  IEventAggregator eventAggregator,
                                  ICheckIfBookShouldBeRefreshed checkIfBookShouldBeRefreshed,
                                  IMapCoversToLocal mediaCoverService,
                                  ISeriesBookLinkService seriesBookLinkService,
                                  IMissingBookTracker missingBookTracker,
                                  Logger logger)
        : base(logger, authorMetadataService)
        {
            _bookService = bookService;
            _authorService = authorService;
            _editionService = editionService;
            _authorInfo = authorInfo;
            _bookInfo = bookInfo;
            _refreshEditionService = refreshEditionService;
            _mediaFileService = mediaFileService;
            _historyService = historyService;
            _eventAggregator = eventAggregator;
            _checkIfBookShouldBeRefreshed = checkIfBookShouldBeRefreshed;
            _mediaCoverService = mediaCoverService;
            _seriesBookLinkService = seriesBookLinkService;
            _missingBookTracker = missingBookTracker;
            _logger = logger;
        }

        private Author GetSkyhookData(Book book)
        {
            try
            {
                var tuple = _bookInfo.GetBookInfo(book.ForeignBookId);

                // The metadata source's author object is cached and shared with the next author refresh. Setting its
                // Books to this one book left that refresh a works list of one, so every other book looked missing.
                var author = _authorInfo.GetAuthorInfo(tuple.Item1).ShallowCopy();
                var newbook = tuple.Item2;

                newbook.Author = author;
                newbook.AuthorMetadata = author.Metadata.Value;
                newbook.AuthorMetadataId = book.AuthorMetadataId;
                newbook.AuthorMetadata.Value.Id = book.AuthorMetadataId;

                author.Books = new List<Book> { newbook };
                return author;
            }
            catch (BookNotFoundException)
            {
                _logger.Debug("Could not find book with id {0}", book.ForeignBookId);
            }

            return null;
        }

        protected override RemoteData GetRemoteData(Book local, List<Book> remote, Author data)
        {
            var result = new RemoteData();

            var book = remote.SingleOrDefault(x => x.ForeignBookId == local.ForeignBookId);

            // Still in the author's works list but left out by the metadata profile or an import list exclusion: the
            // user doesn't want it, so it goes the way of a book the source no longer has, with no lookup of its own
            if (book == null && InWorksList(data, local))
            {
                return result;
            }

            // Metadata sources can truncate an author's works list, so a book missing from it may still exist.
            // Look the book up itself: only a not-found from that lookup leaves the entity null for deletion,
            // and any other error propagates so the book is kept.
            if (book == null)
            {
                data = GetSkyhookData(local);

                if (data == null)
                {
                    return FollowMergedWork(local);
                }

                book = data.Books.Value.SingleOrDefault(x => x.ForeignBookId == local.ForeignBookId);

                // The lookup found the work under another id (a Goodreads merge or canonical redirect). Merging
                // would delete this book, so keep it as it is and leave the merge to the user.
                if (book == null && data != null)
                {
                    _logger.Warn("Book {0} is now {1} in the metadata, keeping it under its old id", local, data.Books.Value.FirstOrDefault()?.ForeignBookId);
                    result.Keep = true;
                }
            }

            result.Entity = book;
            if (result.Entity != null)
            {
                result.Entity.Id = local.Id;
                _missingBookTracker.Found(local);
            }

            return result;
        }

        // The author's whole works list, before the metadata profile and exclusions filter it
        private static IEnumerable<string> WorksListIds(Author data)
        {
            var books = data?.Books?.IsLoaded == true ? data.Books.Value : null;

            return books?.Select(x => x.ForeignBookId) ?? Enumerable.Empty<string>();
        }

        private static bool InWorksList(Author data, Book local)
        {
            return WorksListIds(data).Contains(local.ForeignBookId);
        }

        // True to go ahead with deleting a book the metadata no longer has. The first time, the book is kept, and only
        // a refresh at least MissingBookTracker.Grace later that still can't find it deletes it.
        private bool PastDeleteGrace(Book local, RemoteData result)
        {
            if (_missingBookTracker.MissingLongEnough(local, DateTime.UtcNow))
            {
                return true;
            }

            KeptBooks.Pending(local, _missingBookTracker.DeleteAfter(local), _logger);
            result.Keep = true;

            return false;
        }

        // The work 404'd. Goodreads merges works without leaving a redirect, so before the book is deleted ask where
        // its monitored edition lives now. An empty result lets the base class delete as before; any lookup error
        // propagates, so the book is kept and the failure counts against the author's lookup bound.
        private RemoteData FollowMergedWork(Book local)
        {
            var result = new RemoteData();

            // Books with files or added by hand are never deleted, so leave them as they were. Usually Goodreads merged
            // the work into one already in the library, and moving the files across is for a person to do.
            if (!ShouldDelete(local))
            {
                KeptBooks.NotFound(local, _logger);
                result.Keep = true;
                return result;
            }

            var edition = _editionService.GetEditionsByBook(local.Id).FirstOrDefault(x => x.Monitored && x.ForeignEditionId.IsNotNullOrWhiteSpace());

            if (edition == null)
            {
                PastDeleteGrace(local, result);
                return result;
            }

            string workId;

            try
            {
                workId = _bookInfo.GetWorkIdForEdition(edition.ForeignEditionId);
            }
            catch (EditionNotFoundException)
            {
                _logger.Debug("Edition {0} of {1} is gone too", edition.ForeignEditionId, local);
                PastDeleteGrace(local, result);
                return result;
            }

            if (workId == local.ForeignBookId)
            {
                _logger.Warn("Book {0} was not found, but its edition {1} still points at it. Keeping it", local, edition.ForeignEditionId);
                result.Keep = true;
                return result;
            }

            var existing = _bookService.FindById(workId);

            if (existing != null)
            {
                if (!PastDeleteGrace(local, result))
                {
                    return result;
                }

                // A duplicate now with no files to move, so the base class deletes it. If it was the wanted copy,
                // pass that on first, with its edition, which would otherwise be deleted along with it.
                if (local.Monitored && !existing.Monitored)
                {
                    edition.BookId = existing.Id;
                    _editionService.UpdateMany(new List<Edition> { edition });
                    _editionService.SetMonitored(edition);
                    _bookService.SetBookMonitored(existing.Id, true);

                    _logger.Info("Monitoring {0} and its edition {1} in place of {2}", existing, edition, local);
                }

                _logger.Info("Book {0} was merged into {1}, which is already in the library", local, existing);
                return result;
            }

            // Books.TitleSlug is unique and is the work id, so another book holding it would fail this save
            var slugOwner = _bookService.FindBySlug(workId);

            if (slugOwner != null && slugOwner.Id != local.Id)
            {
                _logger.Warn("Book {0} moved to new work {1}, but {2} already uses that as its slug. Keeping it under its old id", local, workId, slugOwner);
                result.Keep = true;
                return result;
            }

            // A refresh keeps the book's AuthorMetadataId whoever the work credits, so a book moved onto another
            // author's work would sit under the wrong author for good. Leave that move to the user.
            var newWork = _bookInfo.GetBookInfo(workId);
            var authorId = local.AuthorMetadata.Value.ForeignAuthorId;

            if (newWork.Item1 != authorId)
            {
                var newAuthor = newWork.Item3.FirstOrDefault(x => x.ForeignAuthorId == newWork.Item1);

                _logger.Warn("Book {0} moved to new work {1} by {2} [{3}], not {4} [{5}]. Keeping it under its old id; add that author to follow the new work",
                    local,
                    workId,
                    newAuthor?.Name,
                    newWork.Item1,
                    local.AuthorMetadata.Value.Name,
                    authorId);

                result.Keep = true;
                return result;
            }

            _logger.Info("Book {0} moved to new work {1}. The next refresh fills in its details", local, workId);

            if (local.TitleSlug == local.ForeignBookId)
            {
                local.TitleSlug = workId;
            }

            local.ForeignBookId = workId;
            _bookService.UpdateMany(new List<Book> { local });

            result.Keep = true;
            return result;
        }

        protected override void EnsureNewParent(Book local, Book remote)
        {
            // The metadata can credit a book to someone else: a narrator, publisher or duplicate profile listed
            // first. A book may move to an author already in the library, but a refresh never adds one. Adding
            // them filled the library with narrators and publishers, monitored and grabbing.
            var credited = remote.AuthorMetadata.Value;

            _logger.Trace($"Ensuring parent author exists [{credited.ForeignAuthorId}]");

            if (_authorService.FindById(credited.ForeignAuthorId) != null)
            {
                return;
            }

            _logger.Warn("Book {0} is credited to {1} [{2}] in the metadata, who is not in the library. Keeping it under {3}; add that author by hand if the credit is right",
                local,
                credited.Name,
                credited.ForeignAuthorId,
                local.AuthorMetadata.Value.Name);

            remote.AuthorMetadata = local.AuthorMetadata.Value;
        }

        protected override bool ShouldDelete(Book local)
        {
            // Not added by hand, no files, and nothing the user changed by hand: deleting a book with metadata
            // overrides or series links the user made would lose that work for good
            return local.AddOptions.AddType != BookAddType.Manual &&
                !_mediaFileService.GetFilesByBook(local.Id).Any() &&
                !HasManualEdits(local);
        }

        private bool HasManualEdits(Book local)
        {
            if (local.MetadataOverrides != null && !local.MetadataOverrides.IsEmpty)
            {
                return true;
            }

            return _seriesBookLinkService.GetLinksByBook(new List<int> { local.Id })?.Any(x => x.IsManual) == true;
        }

        protected override void LogProgress(Book local)
        {
            _logger.ProgressInfo("Updating Info for {0}", local.Title);
        }

        protected override bool IsMerge(Book local, Book remote)
        {
            return local.ForeignBookId != remote.ForeignBookId;
        }

        protected override UpdateResult UpdateEntity(Book local, Book remote)
        {
            UpdateResult result;

            remote.UseDbFieldsFrom(local);

            // Put the user's values over the source's before comparing, so a kept override reads as no change and
            // doesn't retag the book's files on every refresh
            remote.MetadataOverrides?.ApplyTo(remote);

            if (local.Title != (remote.Title ?? "Unknown") ||
                local.ForeignBookId != remote.ForeignBookId ||
                local.AuthorMetadata.Value.ForeignAuthorId != remote.AuthorMetadata.Value.ForeignAuthorId)
            {
                result = UpdateResult.UpdateTags;
            }
            else if (!local.Equals(remote))
            {
                result = UpdateResult.Standard;
            }
            else
            {
                result = UpdateResult.None;
            }

            // Force update and fetch covers if images have changed so that we can write them into tags
            // if (remote.Images.Any() && !local.Images.SequenceEqual(remote.Images))
            // {
            //     _mediaCoverService.EnsureBookCovers(remote);
            //     result = UpdateResult.UpdateTags;
            // }
            local.UseMetadataFrom(remote);

            local.AuthorMetadataId = remote.AuthorMetadata.Value.Id;
            local.LastInfoSync = DateTime.UtcNow;

            return result;
        }

        protected override UpdateResult MergeEntity(Book local, Book target, Book remote)
        {
            _logger.Warn($"Book {local} was merged with {remote} because the original was a duplicate.");

            // Update book ids for trackfiles
            var files = _mediaFileService.GetFilesByBook(local.Id);
            files.ForEach(x => x.EditionId = target.Editions.Value.Single(e => e.Monitored).Id);
            _mediaFileService.Update(files);

            // Update book ids for history
            var items = _historyService.GetByBook(local.Id, null);
            items.ForEach(x => x.BookId = target.Id);
            _historyService.UpdateMany(items);

            // Finally delete the old book
            _bookService.DeleteMany(new List<Book> { local });

            return UpdateResult.UpdateTags;
        }

        protected override Book GetEntityByForeignId(Book local)
        {
            return _bookService.FindById(local.ForeignBookId);
        }

        protected override void SaveEntity(Book local)
        {
            // Use UpdateMany to avoid firing the book edited event
            _bookService.UpdateMany(new List<Book> { local });
        }

        protected override void DeleteEntity(Book local, bool deleteFiles)
        {
            _bookService.DeleteBook(local.Id, deleteFiles);
        }

        protected override List<Edition> GetRemoteChildren(Book local, Book remote)
        {
            return remote.Editions.Value.DistinctBy(m => m.ForeignEditionId).ToList();
        }

        protected override List<Edition> GetLocalChildren(Book entity, List<Edition> remoteChildren)
        {
            return _editionService.GetEditionsForRefresh(entity.Id, remoteChildren.Select(x => x.ForeignEditionId).ToList());
        }

        protected override Tuple<Edition, List<Edition>> GetMatchingExistingChildren(List<Edition> existingChildren, Edition remote)
        {
            var existingChild = existingChildren.SingleOrDefault(x => x.ForeignEditionId == remote.ForeignEditionId);
            return Tuple.Create(existingChild, new List<Edition>());
        }

        protected override void PrepareNewChild(Edition child, Book entity)
        {
            child.BookId = entity.Id;
            child.Book = entity;

            entity.MetadataOverrides?.ApplyTo(child);
        }

        protected override void PrepareExistingChild(Edition local, Edition remote, Book entity)
        {
            local.BookId = entity.Id;
            local.Book = entity;

            remote.UseDbFieldsFrom(local);
            entity.MetadataOverrides?.ApplyTo(remote);
        }

        protected override void ProcessChildren(Book entity, SortedChildren children)
        {
            // Keep editions that still have files when the metadata source drops them. Deleting one orphans its
            // files, and the book then reads as missing and gets grabbed again.
            var withFiles = children.Deleted.Where(x => _mediaFileService.GetFilesByEdition(x.Id).Any()).ToList();

            foreach (var edition in withFiles)
            {
                _logger.Warn("Edition {0} of {1} is no longer in the metadata but has files, keeping it", edition, entity);
                children.Deleted.Remove(edition);
                children.UpToDate.Add(edition);
            }
        }

        protected override void AddChildren(List<Edition> children)
        {
            // hack - add the chilren in refresh children so we can control monitored status
        }

        private void MonitorSingleEdition(SortedChildren children)
        {
            children.Old.ForEach(x => x.Monitored = false);
            var monitored = children.Future.Where(x => x.Monitored).ToList();

            if (monitored.Count == 1)
            {
                return;
            }

            if (monitored.Count == 0)
            {
                monitored = children.Future;
            }

            if (monitored.Count == 0)
            {
                // there are no future children so nothing to do
                return;
            }

            var toMonitor = monitored.OrderByDescending(x => x.Id > 0 ? _mediaFileService.GetFilesByEdition(x.Id).Count : 0)
                .ThenByDescending(x => x.Ratings.Popularity).First();

            monitored.ForEach(x => x.Monitored = false);
            toMonitor.Monitored = true;

            // force update of anything we've messed with
            var extraToUpdate = children.UpToDate.Where(x => monitored.Contains(x));
            children.UpToDate = children.UpToDate.Except(extraToUpdate).ToList();
            children.Updated.AddRange(extraToUpdate);

            Debug.Assert(!children.Future.Any() || children.Future.Count(x => x.Monitored) == 1, "one edition monitored");
        }

        protected override bool RefreshChildren(SortedChildren localChildren, List<Edition> remoteChildren, Author remoteData, bool forceChildRefresh, bool forceUpdateFileTags, DateTime? lastUpdate)
        {
            // make sure only one of the releases ends up monitored
            MonitorSingleEdition(localChildren);

            localChildren.All.ForEach(x => _logger.Trace($"release: {x} monitored: {x.Monitored}"));

            _editionService.InsertMany(localChildren.Added);

            return _refreshEditionService.RefreshEditionInfo(localChildren.Added, localChildren.Updated, localChildren.Merged, localChildren.Deleted, localChildren.UpToDate, remoteChildren, forceUpdateFileTags);
        }

        protected override void PublishEntityUpdatedEvent(Book entity)
        {
            // Fetch fresh from DB so all lazy loads are available
            _eventAggregator.PublishEvent(new BookUpdatedEvent(_bookService.GetBook(entity.Id)));
        }

        public bool RefreshBookInfo(List<Book> books, List<Book> remoteBooks, Author remoteData, bool forceBookRefresh, bool forceUpdateFileTags, DateTime? lastUpdate)
        {
            var updated = false;
            var remoteIds = remoteBooks.Select(x => x.ForeignBookId).ToHashSet();
            remoteIds.UnionWith(WorksListIds(remoteData));
            var failedLookups = 0;
            var rejectedWorks = 0;
            var skippedLookups = 0;

            foreach (var book in books)
            {
                if (forceBookRefresh || _checkIfBookShouldBeRefreshed.ShouldRefresh(book))
                {
                    // A book missing from the author's works list costs a lookup of its own, each retrying through
                    // rate limits. Once a few of those have failed the metadata source is struggling, so keep the
                    // rest as they are rather than queue more lookups behind it. Lookups also stop once the command
                    // has spent its time on the metadata source.
                    var needsLookup = !remoteIds.Contains(book.ForeignBookId);

                    if (needsLookup && (failedLookups >= MaxFailedLookupsPerRefresh || MetadataRetryBudget.Exhausted))
                    {
                        skippedLookups++;
                        continue;
                    }

                    var stopwatch = Stopwatch.StartNew();

                    try
                    {
                        updated |= RefreshBookInfo(book, remoteBooks, remoteData, forceUpdateFileTags);
                    }
                    catch (Exception e)
                    {
                        // A work the source rejects every time says nothing about whether it is struggling, and
                        // counting it let three bad works stop the rest of an author's missing books refreshing for
                        // good. Past MaxRejectedWorksPerRefresh it counts again, in case it is the source after all.
                        if (e is WorkErrorException && ++rejectedWorks <= MaxRejectedWorksPerRefresh)
                        {
                            KeptBooks.Failed(book, e, _logger);
                        }
                        else
                        {
                            // Keep the book and carry on, so one failed lookup doesn't stop the whole author refreshing
                            _logger.Error(e, "Couldn't refresh info for book {0}", book);

                            if (needsLookup)
                            {
                                failedLookups++;
                            }
                        }
                    }
                    finally
                    {
                        if (needsLookup)
                        {
                            MetadataRetryBudget.Charge(stopwatch.Elapsed);
                        }
                    }
                }
                else
                {
                    _logger.Debug("Skipping refresh of book: {0}", book.Title);
                }
            }

            if (skippedLookups > 0 && failedLookups >= MaxFailedLookupsPerRefresh)
            {
                _logger.Warn("Stopped looking up books missing from {0}'s works list after {1} failed lookups. Kept {2} more as they are until the next refresh.",
                    remoteData,
                    failedLookups,
                    skippedLookups);
            }
            else if (skippedLookups > 0)
            {
                _logger.Warn("Stopped looking up books missing from {0}'s works list, as this command has spent its time on the metadata source. Kept {1} more as they are until the next refresh.",
                    remoteData,
                    skippedLookups);
            }

            return updated;
        }

        public bool RefreshBookInfo(Book book, List<Book> remoteBooks, Author remoteData, bool forceUpdateFileTags)
        {
            using (BookEditLock.Take(book.Id))
            {
                // The book may have been loaded long before this point in an author refresh. An edit saved since
                // then must win, or this refresh writes the old overrides back and keeps applying them.
                var stored = _bookService.FindById(book.ForeignBookId);

                if (stored != null && stored.Id == book.Id)
                {
                    book.MetadataOverrides = stored.MetadataOverrides;
                }

                return RefreshEntityInfo(book, remoteBooks, remoteData, true, forceUpdateFileTags, null);
            }
        }

        public bool RefreshBookInfo(Book book)
        {
            var data = GetSkyhookData(book);

            if (data == null)
            {
                _logger.Warn("Book {0} wasn't found in the metadata, keeping it as it is", book);
                return false;
            }

            return RefreshBookInfo(book, data.Books, data, false);
        }

        public void Execute(BulkRefreshBookCommand message)
        {
            var books = _bookService.GetBooks(message.BookIds);

            foreach (var book in books)
            {
                try
                {
                    RefreshBookInfo(book);
                }
                catch (Exception e)
                {
                    // Keep the book and carry on with the rest
                    _logger.Error(e, "Couldn't refresh info for book {0}", book);
                }
            }
        }

        public void Execute(RefreshBookCommand message)
        {
            if (message.BookId.HasValue)
            {
                var book = _bookService.GetBook(message.BookId.Value);

                RefreshBookInfo(book);
            }
        }
    }
}
