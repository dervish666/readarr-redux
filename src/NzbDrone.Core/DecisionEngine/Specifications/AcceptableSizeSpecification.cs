using NLog;
using NzbDrone.Common.Extensions;
using NzbDrone.Core.IndexerSearch.Definitions;
using NzbDrone.Core.Parser.Model;
using NzbDrone.Core.Qualities;

namespace NzbDrone.Core.DecisionEngine.Specifications
{
    // Rejects audiobook releases smaller than their quality's MinSize, which catches single chapters and
    // partial uploads. MinSize is a total release size here, not a per-second rate. MaxSize is ignored.
    public class AcceptableSizeSpecification : IDecisionEngineSpecification
    {
        private readonly IQualityDefinitionService _qualityDefinitionService;
        private readonly Logger _logger;

        public AcceptableSizeSpecification(IQualityDefinitionService qualityDefinitionService, Logger logger)
        {
            _qualityDefinitionService = qualityDefinitionService;
            _logger = logger;
        }

        public SpecificationPriority Priority => SpecificationPriority.Default;
        public RejectionType Type => RejectionType.Permanent;

        public Decision IsSatisfiedBy(RemoteBook subject, SearchCriteriaBase searchCriteria)
        {
            var quality = subject.ParsedBookInfo.Quality.Quality;

            // Ebooks are often well under a megabyte, so only audio releases get a minimum
            if (!Quality.IsAudio(quality))
            {
                _logger.Debug("{0} is not an audio quality, skipping size check", quality);
                return Decision.Accept();
            }

            if (subject.Release.Size <= 0)
            {
                _logger.Debug("Release has unknown size, skipping size check");
                return Decision.Accept();
            }

            var minSize = _qualityDefinitionService.Get(quality).MinSize;

            if (!minSize.HasValue || minSize.Value <= 0)
            {
                _logger.Debug("No minimum size for {0}, skipping size check", quality);
                return Decision.Accept();
            }

            var minBytes = minSize.Value.Kilobits();

            if (subject.Release.Size < minBytes)
            {
                _logger.Debug("Item: {0}, Size: {1} is smaller than minimum allowed size ({2} bytes), rejecting.", subject, subject.Release.Size, minBytes);
                return Decision.Reject("Release is {0}, smaller than the minimum size for {1} ({2})", subject.Release.Size.SizeSuffix(), quality.Name, minBytes.SizeSuffix());
            }

            _logger.Debug("Item: {0}, meets minimum size of {1}", subject, minBytes.SizeSuffix());
            return Decision.Accept();
        }
    }
}
