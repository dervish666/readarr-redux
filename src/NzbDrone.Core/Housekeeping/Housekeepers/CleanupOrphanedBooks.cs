using System;
using System.Linq;
using Dapper;
using NLog;
using NzbDrone.Common.Extensions;
using NzbDrone.Common.Serializer;
using NzbDrone.Core.Books;
using NzbDrone.Core.Datastore;

namespace NzbDrone.Core.Housekeeping.Housekeepers
{
    public class CleanupOrphanedBooks : IHousekeepingTask
    {
        private readonly IMainDatabase _database;
        private readonly Logger _logger;

        public CleanupOrphanedBooks(IMainDatabase database, Logger logger)
        {
            _database = database;
            _logger = logger;
        }

        // Deleting an author deletes its books directly, so a book with no author got here by
        // accident, such as a refresh that moved the author to a new metadata id without its books.
        // A book with files, or one the user added by hand, is kept and reported instead.
        public void Clean()
        {
            using var mapper = _database.OpenConnection();

            var orphans = mapper.Query<OrphanedBook>(@"SELECT ""Books"".""Id"", ""Books"".""Title"", ""Books"".""AddOptions"",
                             CASE WHEN EXISTS (
                                 SELECT 1 FROM ""Editions""
                                 INNER JOIN ""BookFiles"" ON ""BookFiles"".""EditionId"" = ""Editions"".""Id""
                                 WHERE ""Editions"".""BookId"" = ""Books"".""Id"") THEN 1 ELSE 0 END AS ""HasFiles""
                             FROM ""Books""
                             LEFT OUTER JOIN ""Authors""
                             ON ""Books"".""AuthorMetadataId"" = ""Authors"".""AuthorMetadataId""
                             WHERE ""Authors"".""Id"" IS NULL").ToList();

            var kept = orphans.Where(x => x.HasFiles != 0 || IsManual(x.AddOptions)).ToList();
            var ids = orphans.Except(kept).Select(x => x.Id).ToList();

            foreach (var batch in ids.Chunk(500))
            {
                mapper.Execute(@"DELETE FROM ""Books"" WHERE ""Id"" IN @Ids", new { Ids = batch });
            }

            if (kept.Any())
            {
                _logger.Warn("Kept {0} book(s) that belong to no author because they have files or were added by hand: {1}",
                    kept.Count,
                    string.Join(", ", kept.Select(x => $"{x.Title} ({x.Id})")));
            }
        }

        private bool IsManual(string addOptions)
        {
            if (addOptions.IsNullOrWhiteSpace())
            {
                return false;
            }

            try
            {
                return STJson.Deserialize<AddBookOptions>(addOptions)?.AddType == BookAddType.Manual;
            }
            catch (Exception ex)
            {
                // Unreadable options: keep the book, it is reported with the others below
                _logger.Debug(ex, "Unable to read AddOptions {0}", addOptions);
                return true;
            }
        }

        private class OrphanedBook
        {
            public int Id { get; set; }
            public string Title { get; set; }
            public string AddOptions { get; set; }
            public int HasFiles { get; set; }
        }
    }
}
