using System;
using System.Collections.Generic;
using System.Linq;
using System.Net;
using FluentValidation.Results;
using NLog;
using NzbDrone.Common.Extensions;
using NzbDrone.Common.Http;
using NzbDrone.Core.Configuration;
using NzbDrone.Core.MetadataSource;
using NzbDrone.Core.MetadataSource.BookInfo;
using NzbDrone.Core.Parser;
using NzbDrone.Core.Parser.Model;

namespace NzbDrone.Core.ImportLists.Goodreads
{
    public class GoodreadsSeriesImportList : ImportListBase<GoodreadsSeriesImportListSettings>
    {
        private readonly IProvideSeriesInfo _seriesInfo;

        public override string Name => "Goodreads Series";
        public override ImportListType ListType => ImportListType.Goodreads;
        public override TimeSpan MinRefreshInterval => TimeSpan.FromHours(12);

        public GoodreadsSeriesImportList(IProvideSeriesInfo seriesInfo,
            IImportListStatusService importListStatusService,
            IConfigService configService,
            IParsingService parsingService,
            Logger logger)
            : base(importListStatusService, configService, parsingService, logger)
        {
            _seriesInfo = seriesInfo;
        }

        public override IList<ImportListItemInfo> Fetch()
        {
            var result = new List<ImportListItemInfo>();

            try
            {
                var series = _seriesInfo.GetSeriesInfo(Settings.SeriesId);

                // The metadata source lists the series' works by ID only. The sync looks up each one it doesn't have.
                foreach (var work in series.LinkItems ?? new List<SeriesWorkLinkResource>())
                {
                    result.Add(new ImportListItemInfo
                    {
                        BookGoodreadsId = work.ForeignWorkId.ToString()
                    });
                }

                _importListStatusService.RecordSuccess(Definition.Id);
            }
            catch (Exception ex)
            {
                _logger.Warn(ex, "Unable to fetch series {0} from the metadata source", Settings.SeriesId);
                _importListStatusService.RecordFailure(Definition.Id);
            }

            return CleanupListItems(result);
        }

        // Items carry only a work ID, so the base class's de-duplication by author and title would merge them all
        protected override IList<ImportListItemInfo> CleanupListItems(IEnumerable<ImportListItemInfo> releases)
        {
            var result = releases.DistinctBy(r => r.BookGoodreadsId).ToList();

            result.ForEach(c =>
            {
                c.ImportListId = Definition.Id;
                c.ImportList = Definition.Name;
            });

            return result;
        }

        protected override void Test(List<ValidationFailure> failures)
        {
            failures.AddIfNotNull(TestConnection());
        }

        private ValidationFailure TestConnection()
        {
            try
            {
                _seriesInfo.GetSeriesInfo(Settings.SeriesId);
                return null;
            }
            catch (HttpException e)
            {
                _logger.Warn(e, "Metadata source error fetching series {0}", Settings.SeriesId);
                if (e.Response.StatusCode == HttpStatusCode.NotFound)
                {
                    return new ValidationFailure(nameof(Settings.SeriesId), $"Series {Settings.SeriesId} not found");
                }

                return new ValidationFailure(nameof(Settings.SeriesId), $"Could not get series data");
            }
            catch (Exception ex)
            {
                _logger.Warn(ex, "Unable to connect to the metadata source");

                return new ValidationFailure(string.Empty, "Unable to connect to import list, check the log for more details");
            }
        }
    }
}
