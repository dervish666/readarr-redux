import moment from 'moment';
import React, { ReactNode } from 'react';
import Icon from 'Components/Icon';
import { icons, kinds } from 'Helpers/Props';
import translate from 'Utilities/String/translate';

// The download state of one queue item, shown beside a book on the calendar and
// wanted pages (which read it from the redux queue details feed).
interface QueueDetailsProps {
  title: string;
  size: number;
  sizeleft: number;
  estimatedCompletionTime?: string;
  status: string;
  errorMessage?: string;
  progressBar: ReactNode;
}

function QueueDetails(props: QueueDetailsProps) {
  const {
    title,
    size,
    sizeleft,
    estimatedCompletionTime,
    status: queueStatus,
    errorMessage,
    progressBar,
  } = props;

  const status = queueStatus.toLowerCase();

  const progress = 100 - (sizeleft / size) * 100;

  if (status === 'pending') {
    return (
      <Icon
        name={icons.PENDING}
        title={translate('ReleaseWillBeProcessedInterp', {
          0: moment(estimatedCompletionTime).fromNow(),
        })}
      />
    );
  }

  if (status === 'completed' && errorMessage) {
    return (
      <Icon
        name={icons.DOWNLOAD}
        kind={kinds.DANGER}
        title={translate('ImportFailedInterp', { 0: errorMessage })}
      />
    );
  }

  if (errorMessage) {
    return (
      <Icon
        name={icons.DOWNLOADING}
        kind={kinds.DANGER}
        title={translate('DownloadFailedInterp', { 0: errorMessage })}
      />
    );
  }

  if (status === 'failed') {
    return (
      <Icon
        name={icons.DOWNLOADING}
        kind={kinds.DANGER}
        title={translate('DownloadFailedCheckDownloadClientForMoreDetails')}
      />
    );
  }

  if (status === 'warning') {
    return (
      <Icon
        name={icons.DOWNLOADING}
        kind={kinds.WARNING}
        title={translate('DownloadWarningCheckDownloadClientForMoreDetails')}
      />
    );
  }

  if (progress < 5) {
    return (
      <Icon
        name={icons.DOWNLOADING}
        title={translate('BookIsDownloadingInterp', {
          0: progress.toFixed(1),
          1: title,
        })}
      />
    );
  }

  return <>{progressBar}</>;
}

export default QueueDetails;
