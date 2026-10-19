import { useQueueOption } from 'Activity/Queue/queueOptionsStore';
import useApiQuery from 'Helpers/Hooks/useApiQuery';
import { QueueStatus } from 'typings/Queue';

// The sidebar count. SignalR's queue/status message writes straight into this cache.
export default function useQueueStatus() {
  const { data } = useApiQuery<QueueStatus>({
    path: '/queue/status',
  });

  const includeUnknownAuthorItems = useQueueOption('includeUnknownAuthorItems');

  if (!data) {
    return {
      count: 0,
      errors: false,
      warnings: false,
    };
  }

  const {
    errors,
    warnings,
    unknownErrors,
    unknownWarnings,
    count,
    totalCount,
  } = data;

  if (includeUnknownAuthorItems) {
    return {
      count: totalCount,
      errors: errors || unknownErrors,
      warnings: warnings || unknownWarnings,
    };
  }

  return {
    count,
    errors,
    warnings,
  };
}
