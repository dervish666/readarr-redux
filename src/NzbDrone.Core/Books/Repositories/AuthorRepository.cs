using System.Collections.Generic;
using System.Data;
using System.Linq;
using Dapper;
using NzbDrone.Common.Extensions;
using NzbDrone.Core.Datastore;
using NzbDrone.Core.Messaging.Events;

namespace NzbDrone.Core.Books
{
    public interface IAuthorRepository : IBasicRepository<Author>
    {
        bool AuthorPathExists(string path);
        Author FindByName(string cleanName);
        Author FindById(string foreignAuthorId);
        Dictionary<int, string> AllAuthorPaths();
        Dictionary<int, List<int>> AllAuthorTags();
        Author GetAuthorByMetadataId(int authorMetadataId);
        List<Author> GetAuthorsByMetadataId(IEnumerable<int> authorMetadataId);
        int MoveToAuthorMetadata(int authorId, int oldMetadataId, int newMetadataId);
    }

    public class AuthorRepository : BasicRepository<Author>, IAuthorRepository
    {
        public AuthorRepository(IMainDatabase database,
                                IEventAggregator eventAggregator)
            : base(database, eventAggregator)
        {
        }

        protected override SqlBuilder Builder() => new SqlBuilder(_database.DatabaseType)
            .Join<Author, AuthorMetadata>((a, m) => a.AuthorMetadataId == m.Id);

        protected override List<Author> Query(SqlBuilder builder) => Query(_database, builder).ToList();

        public static IEnumerable<Author> Query(IDatabase database, SqlBuilder builder)
        {
            return database.QueryJoined<Author, AuthorMetadata>(builder, (author, metadata) =>
                    {
                        author.Metadata = metadata;
                        return author;
                    });
        }

        public bool AuthorPathExists(string path)
        {
            return Query(c => c.Path == path).Any();
        }

        public Author FindById(string foreignAuthorId)
        {
            return Query(Builder().Where<AuthorMetadata>(m => m.ForeignAuthorId == foreignAuthorId)).SingleOrDefault();
        }

        public Author FindByName(string cleanName)
        {
            cleanName = cleanName.ToLowerInvariant();

            return Query(s => s.CleanName == cleanName).ExclusiveOrDefault();
        }

        // Points the author and every book on its old metadata at the new metadata in one transaction.
        // Done as two separate saves, either order leaves a moment where the books belong to no author,
        // and Cleanup Orphaned Books deletes books in that state.
        public int MoveToAuthorMetadata(int authorId, int oldMetadataId, int newMetadataId)
        {
            using var conn = _database.OpenConnection();
            using var transaction = conn.BeginTransaction(IsolationLevel.ReadCommitted);

            var books = conn.Execute(@"UPDATE ""Books"" SET ""AuthorMetadataId"" = @NewMetadataId WHERE ""AuthorMetadataId"" = @OldMetadataId",
                new { OldMetadataId = oldMetadataId, NewMetadataId = newMetadataId },
                transaction);

            conn.Execute(@"UPDATE ""Authors"" SET ""AuthorMetadataId"" = @NewMetadataId WHERE ""Id"" = @AuthorId",
                new { AuthorId = authorId, NewMetadataId = newMetadataId },
                transaction);

            transaction.Commit();

            return books;
        }

        public Dictionary<int, string> AllAuthorPaths()
        {
            using (var conn = _database.OpenConnection())
            {
                var strSql = "SELECT \"Id\" AS \"Key\", \"Path\" AS \"Value\" FROM \"Authors\"";
                return conn.Query<KeyValuePair<int, string>>(strSql).ToDictionary(x => x.Key, x => x.Value);
            }
        }

        public Dictionary<int, List<int>> AllAuthorTags()
        {
            using (var conn = _database.OpenConnection())
            {
                var strSql = "SELECT \"Id\" AS \"Key\", \"Tags\" AS \"Value\" FROM \"Authors\" WHERE \"Tags\" IS NOT NULL";
                return conn.Query<KeyValuePair<int, List<int>>>(strSql).ToDictionary(x => x.Key, x => x.Value);
            }
        }

        public Author GetAuthorByMetadataId(int authorMetadataId)
        {
            return Query(s => s.AuthorMetadataId == authorMetadataId).SingleOrDefault();
        }

        public List<Author> GetAuthorsByMetadataId(IEnumerable<int> authorMetadataIds)
        {
            return Query(s => authorMetadataIds.Contains(s.AuthorMetadataId));
        }
    }
}
