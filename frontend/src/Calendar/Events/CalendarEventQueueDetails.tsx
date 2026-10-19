import React from 'react';
import QueueDetails from 'Activity/Queue/QueueDetails';
import CircularProgressBar from 'Components/CircularProgressBar';
import translate from 'Utilities/String/translate';

interface CalendarEventQueueDetailsProps {
  title: string;
  size: number;
  sizeleft: number;
  estimatedCompletionTime?: string;
  status: string;
  errorMessage?: string;
}

function CalendarEventQueueDetails({
  title,
  size,
  sizeleft,
  estimatedCompletionTime,
  status,
  errorMessage,
}: CalendarEventQueueDetailsProps) {
  const progress = size ? 100 - (sizeleft / size) * 100 : 0;

  return (
    <QueueDetails
      title={title}
      size={size}
      sizeleft={sizeleft}
      estimatedCompletionTime={estimatedCompletionTime}
      status={status}
      errorMessage={errorMessage}
      progressBar={
        <div
          title={translate('BookIsDownloadingInterp', {
            0: progress.toFixed(1),
            1: title,
          })}
        >
          <CircularProgressBar
            progress={progress}
            size={20}
            strokeWidth={2}
            strokeColor="#7a43b6"
          />
        </div>
      }
    />
  );
}

export default CalendarEventQueueDetails;
