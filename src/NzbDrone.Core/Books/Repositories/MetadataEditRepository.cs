using System;
using System.Collections.Generic;
using System.Data;
using Dapper;
using NzbDrone.Core.Datastore;
using NzbDrone.Core.Messaging.Events;

namespace NzbDrone.Core.Books
{
    public class MetadataSeriesPlan
    {
        public List<SeriesBookLink> Removed { get; } = new List<SeriesBookLink>();
        public List<SeriesBookLink> ToAdd { get; } = new List<SeriesBookLink>();
        public List<SeriesBookLink> ToUpdate { get; } = new List<SeriesBookLink>();
        public List<Tuple<Series, SeriesBookLink>> ToCreate { get; } = new List<Tuple<Series, SeriesBookLink>>();
        public Dictionary<int, Series> Series { get; set; }
    }

    public interface IMetadataEditRepository
    {
        void Save(Book book, List<Edition> editions, MetadataSeriesPlan plan);
    }

    public class MetadataEditRepository : IMetadataEditRepository
    {
        private readonly IMainDatabase _database;
        private readonly IEventAggregator _events;

        public MetadataEditRepository(IMainDatabase database, IEventAggregator events)
        {
            _database = database;
            _events = events;
        }

        public void Save(Book book, List<Edition> editions, MetadataSeriesPlan plan)
        {
            using var connection = _database.OpenConnection();
            using var transaction = connection.BeginTransaction(IsolationLevel.ReadCommitted);
            var books = new BasicRepository<Book>(_database, _events);
            var editionRepository = new BasicRepository<Edition>(_database, _events);
            var series = new BasicRepository<Series>(_database, _events);
            var links = new BasicRepository<SeriesBookLink>(_database, _events);

            books.UpdateMany(new List<Book> { book }, connection, transaction);
            editionRepository.UpdateMany(editions, connection, transaction);

            foreach (var (created, link) in plan.ToCreate)
            {
                series.InsertMany(new List<Series> { created }, connection, transaction);
                plan.Series[created.Id] = created;
                link.SeriesId = created.Id;
                plan.ToAdd.Add(link);
            }

            links.DeleteMany(plan.Removed, connection, transaction);
            links.InsertMany(plan.ToAdd, connection, transaction);
            links.UpdateMany(plan.ToUpdate, connection, transaction);

            foreach (var link in plan.Removed)
            {
                if (plan.Series.TryGetValue(link.SeriesId, out var s) &&
                    s.ForeignSeriesId.StartsWith(MetadataOverrideService.LocalSeriesPrefix) &&
                    connection.ExecuteScalar<int>("SELECT COUNT(*) FROM \"SeriesBookLink\" WHERE \"SeriesId\" = @Id", new { Id = s.Id }, transaction) == 0)
                {
                    series.DeleteMany(new List<Series> { s }, connection, transaction);
                }
            }

            transaction.Commit();
        }
    }
}
