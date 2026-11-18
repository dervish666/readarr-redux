using System;
using System.Collections.Generic;
using System.Linq;
using NzbDrone.Common.Extensions;
using NzbDrone.Core.Books.Events;
using NzbDrone.Core.Datastore;
using NzbDrone.Core.Download;
using NzbDrone.Core.Indexers;
using NzbDrone.Core.Messaging.Commands;
using NzbDrone.Core.Messaging.Events;
using NzbDrone.Core.Parser.Model;

namespace NzbDrone.Core.Blocklisting
{
    public interface IBlocklistService
    {
        bool Blocklisted(int authorId, ReleaseInfo release);
        bool BlocklistedTorrentHash(int authorId, string hash);
        PagingSpec<Blocklist> Paged(PagingSpec<Blocklist> pagingSpec);
        void Block(RemoteBook remoteEpisode, string message);
        void Delete(int id);
        void Delete(List<int> ids);
    }

    public class BlocklistService : IBlocklistService,

                                    IExecute<ClearBlocklistCommand>,
                                    IHandle<DownloadFailedEvent>,
                                    IHandleAsync<AuthorDeletedEvent>
    {
        private readonly IBlocklistRepository _blocklistRepository;

        public BlocklistService(IBlocklistRepository blocklistRepository)
        {
            _blocklistRepository = blocklistRepository;
        }

        public bool Blocklisted(int authorId, ReleaseInfo release)
        {
            if (release.DownloadProtocol == DownloadProtocol.Torrent)
            {
                if (release is not TorrentInfo torrentInfo)
                {
                    return false;
                }

                if (torrentInfo.InfoHash.IsNotNullOrWhiteSpace())
                {
                    var blocklistedByTorrentInfohash = _blocklistRepository.BlocklistedByTorrentInfoHash(authorId, torrentInfo.InfoHash);

                    return blocklistedByTorrentInfohash.Any(b => SameTorrent(b, torrentInfo));
                }

                return _blocklistRepository.BlocklistedByTitle(authorId, release.Title)
                    .Where(b => b.Protocol == DownloadProtocol.Torrent)
                    .Any(b => SameTorrent(b, torrentInfo));
            }

            return _blocklistRepository.BlocklistedByTitle(authorId, release.Title)
                .Where(b => b.Protocol == DownloadProtocol.Usenet)
                .Any(b => SameNzb(b, release));
        }

        public bool BlocklistedTorrentHash(int authorId, string hash)
        {
            return _blocklistRepository.BlocklistedByTorrentInfoHash(authorId, hash).Any(b =>
                b.TorrentInfoHash.Equals(hash, StringComparison.InvariantCultureIgnoreCase));
        }

        public PagingSpec<Blocklist> Paged(PagingSpec<Blocklist> pagingSpec)
        {
            return _blocklistRepository.GetPaged(pagingSpec);
        }

        public void Block(RemoteBook remoteEpisode, string message)
        {
            var blocklist = new Blocklist
                            {
                                AuthorId = remoteEpisode.Author.Id,
                                BookIds = remoteEpisode.Books.Select(e => e.Id).ToList(),
                                SourceTitle =  remoteEpisode.Release.Title,
                                Quality = remoteEpisode.ParsedBookInfo.Quality,
                                Date = DateTime.UtcNow,
                                PublishedDate = remoteEpisode.Release.PublishDate,
                                Size = remoteEpisode.Release.Size,
                                Indexer = remoteEpisode.Release.Indexer,
                                Protocol = remoteEpisode.Release.DownloadProtocol,
                                Message = message
                            };

            if (remoteEpisode.Release is TorrentInfo torrentRelease)
            {
                blocklist.TorrentInfoHash = torrentRelease.InfoHash;
            }

            _blocklistRepository.Insert(blocklist);
        }

        public void Delete(int id)
        {
            _blocklistRepository.Delete(id);
        }

        public void Delete(List<int> ids)
        {
            _blocklistRepository.DeleteMany(ids);
        }

        // A failed NZB only blocks the same post from the same indexer. Another indexer's copy with the same title
        // is a separate grab, so a failure on one indexer no longer hides the release everywhere else.
        private bool SameNzb(Blocklist item, ReleaseInfo release)
        {
            if (!HasSameIndexer(item, release.Indexer))
            {
                return false;
            }

            return item.PublishedDate == release.PublishDate;
        }

        private bool SameTorrent(Blocklist item, TorrentInfo release)
        {
            if (release.InfoHash.IsNotNullOrWhiteSpace())
            {
                return release.InfoHash.Equals(item.TorrentInfoHash, StringComparison.InvariantCultureIgnoreCase);
            }

            return HasSameIndexer(item, release.Indexer);
        }

        private bool HasSameIndexer(Blocklist item, string indexer)
        {
            if (item.Indexer.IsNullOrWhiteSpace())
            {
                return true;
            }

            return item.Indexer.Equals(indexer, StringComparison.InvariantCultureIgnoreCase);
        }

        public void Execute(ClearBlocklistCommand message)
        {
            _blocklistRepository.Purge();
        }

        public void Handle(DownloadFailedEvent message)
        {
            var blocklist = new Blocklist
            {
                AuthorId = message.AuthorId,
                BookIds = message.BookIds,
                SourceTitle = message.SourceTitle,
                Quality = message.Quality,
                Date = DateTime.UtcNow,
                PublishedDate = DateTime.Parse(message.Data.GetValueOrDefault("publishedDate")),
                Size = long.Parse(message.Data.GetValueOrDefault("size", "0")),
                Indexer = message.Data.GetValueOrDefault("indexer"),
                Protocol = (DownloadProtocol)Convert.ToInt32(message.Data.GetValueOrDefault("protocol")),
                Message = message.Message,
                TorrentInfoHash = message.Data.GetValueOrDefault("torrentInfoHash")
            };

            if (Enum.TryParse(message.Data.GetValueOrDefault("indexerFlags"), true, out IndexerFlags flags))
            {
                blocklist.IndexerFlags = flags;
            }

            _blocklistRepository.Insert(blocklist);
        }

        public void HandleAsync(AuthorDeletedEvent message)
        {
            var blocklisted = _blocklistRepository.BlocklistedByAuthor(message.Author.Id);

            _blocklistRepository.DeleteMany(blocklisted);
        }
    }
}
