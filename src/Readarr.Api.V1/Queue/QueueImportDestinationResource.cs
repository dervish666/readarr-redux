using System;
using System.Collections.Generic;
using System.Linq;
using NzbDrone.Core.Download;
using NzbDrone.Core.Qualities;

namespace Readarr.Api.V1.Queue
{
    public class QueueImportDestinationResource
    {
        public string SourcePath { get; set; }
        public long SourceSize { get; set; }
        public DateTime SourceModified { get; set; }
        public QualityModel SourceQuality { get; set; }
        public string SourceTagTitle { get; set; }
        public string SourceTagAuthor { get; set; }
        public string SourceTagSeries { get; set; }
        public string SourceTagSeriesIndex { get; set; }
        public string AuthorName { get; set; }
        public string BookTitle { get; set; }
        public List<string> Rejections { get; set; }

        public string DestinationPath { get; set; }
        public bool DestinationExists { get; set; }
        public long DestinationSize { get; set; }
        public DateTime? DestinationModified { get; set; }
        public string DestinationTagTitle { get; set; }
        public string DestinationTagAuthor { get; set; }
        public string DestinationTagSeries { get; set; }
        public string DestinationTagSeriesIndex { get; set; }
        public int? DestinationBookFileId { get; set; }
        public QualityModel DestinationQuality { get; set; }
        public string DestinationAuthorName { get; set; }
        public string DestinationBookTitle { get; set; }
    }

    public static class QueueImportDestinationResourceMapper
    {
        public static QueueImportDestinationResource ToResource(this ImportDestination model)
        {
            var tags = model.SourceTags;
            var destinationTags = model.DestinationTags;

            return new QueueImportDestinationResource
            {
                SourcePath = model.SourcePath,
                SourceSize = model.SourceSize,
                SourceModified = model.SourceModified,
                SourceQuality = model.SourceQuality,
                SourceTagTitle = tags?.BookTitle ?? tags?.Title,
                SourceTagAuthor = tags?.Authors?.FirstOrDefault(),
                SourceTagSeries = tags?.SeriesTitle,
                SourceTagSeriesIndex = tags?.SeriesIndex,
                AuthorName = model.AuthorName,
                BookTitle = model.BookTitle,
                Rejections = model.Rejections,
                DestinationPath = model.DestinationPath,
                DestinationExists = model.DestinationExists,
                DestinationSize = model.DestinationSize,
                DestinationModified = model.DestinationModified,
                DestinationTagTitle = destinationTags?.BookTitle ?? destinationTags?.Title,
                DestinationTagAuthor = destinationTags?.Authors?.FirstOrDefault(),
                DestinationTagSeries = destinationTags?.SeriesTitle,
                DestinationTagSeriesIndex = destinationTags?.SeriesIndex,
                DestinationBookFileId = model.DestinationBookFileId,
                DestinationQuality = model.DestinationQuality,
                DestinationAuthorName = model.DestinationAuthorName,
                DestinationBookTitle = model.DestinationBookTitle
            };
        }
    }
}
