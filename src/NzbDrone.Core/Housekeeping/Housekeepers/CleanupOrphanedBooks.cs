using System;
using System.Collections.Generic;
using System.Data;
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

            DeleteIfStillOrphaned(mapper, orphans.Except(kept).ToList());

            if (kept.Any())
            {
                _logger.Warn("Kept {0} book(s) that belong to no author because they have files or were added by hand: {1}",
                    kept.Count,
                    string.Join(", ", kept.Select(x => $"{x.Title} ({x.Id})")));
            }
        }

        // An import can attach a file, a refresh can give the book an author back, or the user can add it by
        // hand between the query above and here. So the delete itself repeats every condition: still no
        // author, still no file, and AddOptions unchanged from the value judged automatic.
        internal int DeleteIfStillOrphaned(IDbConnection mapper, List<OrphanedBook> candidates)
        {
            const string stillOrphaned = @"
                AND NOT EXISTS (SELECT 1 FROM ""Authors"" WHERE ""Authors"".""AuthorMetadataId"" = ""Books"".""AuthorMetadataId"")
                AND NOT EXISTS (
                    SELECT 1 FROM ""Editions""
                    INNER JOIN ""BookFiles"" ON ""BookFiles"".""EditionId"" = ""Editions"".""Id""
                    WHERE ""Editions"".""BookId"" = ""Books"".""Id"")";

            var deleted = 0;

            var withOptions = candidates.Where(x => x.AddOptions != null).ToList();
            var withoutOptions = candidates.Where(x => x.AddOptions == null).ToList();

            if (withOptions.Any())
            {
                deleted += mapper.Execute(@"DELETE FROM ""Books"" WHERE ""Id"" = @Id AND ""AddOptions"" = @AddOptions" + stillOrphaned,
                    withOptions.Select(x => new { x.Id, x.AddOptions }));
            }

            if (withoutOptions.Any())
            {
                deleted += mapper.Execute(@"DELETE FROM ""Books"" WHERE ""Id"" = @Id AND ""AddOptions"" IS NULL" + stillOrphaned,
                    withoutOptions.Select(x => new { x.Id }));
            }

            return deleted;
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

        internal class OrphanedBook
        {
            public int Id { get; set; }
            public string Title { get; set; }
            public string AddOptions { get; set; }
            public int HasFiles { get; set; }
        }
    }
}
