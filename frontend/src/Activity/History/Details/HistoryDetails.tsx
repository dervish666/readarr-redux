import React from 'react';
import DescriptionList from 'Components/DescriptionList/DescriptionList';
import DescriptionListItem from 'Components/DescriptionList/DescriptionListItem';
import DescriptionListItemDescription from 'Components/DescriptionList/DescriptionListItemDescription';
import DescriptionListItemTitle from 'Components/DescriptionList/DescriptionListItemTitle';
import Icon from 'Components/Icon';
import Link from 'Components/Link/Link';
import { icons } from 'Helpers/Props';
import { useUiSettingsValues } from 'Settings/UI/useUiSettings';
import { HistoryData, HistoryEventType } from 'typings/History';
import formatDateTime from 'Utilities/Date/formatDateTime';
import formatAge from 'Utilities/Number/formatAge';
import formatCustomFormatScore from 'Utilities/Number/formatCustomFormatScore';
import translate from 'Utilities/String/translate';
import styles from './HistoryDetails.module.css';

interface StatusMessage {
  title: string;
  messages: string[];
}

interface RetagChange {
  field: string;
  oldValue?: string | number;
  newValue?: string | number;
}

function getDetailedList(statusMessages: StatusMessage[]) {
  return (
    <div>
      {statusMessages.map(({ title, messages }) => {
        return (
          <div key={title}>
            {title}
            <ul>
              {messages.map((message) => {
                return <li key={message}>{message}</li>;
              })}
            </ul>
          </div>
        );
      })}
    </div>
  );
}

function formatMissing(value?: string | number) {
  if (value === undefined || value === 0 || value === '0') {
    return <Icon name={icons.BAN} size={12} />;
  }

  return value;
}

function formatChange(oldValue?: string | number, newValue?: string | number) {
  return (
    <div>
      {' '}
      {formatMissing(oldValue)}{' '}
      <Icon name={icons.ARROW_RIGHT_NO_CIRCLE} size={12} />{' '}
      {formatMissing(newValue)}{' '}
    </div>
  );
}

function hasScore(customFormatScore?: string) {
  return !!customFormatScore && customFormatScore !== '0';
}

function InfoUrl({ url }: { url: string }) {
  return (
    <span>
      <DescriptionListItemTitle>
        {translate('InfoUrl')}
      </DescriptionListItemTitle>

      <DescriptionListItemDescription>
        <Link to={url}>{url}</Link>
      </DescriptionListItemDescription>
    </span>
  );
}

interface HistoryDetailsProps {
  eventType: HistoryEventType;
  sourceTitle: string;
  data: HistoryData;
}

// Shared with the author history popover.
function HistoryDetails({ eventType, sourceTitle, data }: HistoryDetailsProps) {
  const { shortDateFormat, timeFormat } = useUiSettingsValues();

  if (eventType === 'grabbed' || eventType === 'downloadImported') {
    const {
      indexer,
      releaseGroup,
      customFormatScore,
      nzbInfoUrl,
      downloadClient,
      downloadClientName,
      downloadId,
      age,
      ageHours,
      ageMinutes,
      publishedDate,
    } = data;

    const downloadClientNameInfo =
      eventType === 'grabbed'
        ? downloadClientName ?? downloadClient
        : downloadClient;

    return (
      <DescriptionList>
        <DescriptionListItem
          descriptionClassName={styles.description}
          title={translate('Name')}
          data={sourceTitle}
        />

        {indexer ? (
          <DescriptionListItem title={translate('Indexer')} data={indexer} />
        ) : null}

        {releaseGroup ? (
          <DescriptionListItem
            descriptionClassName={styles.description}
            title={translate('ReleaseGroup')}
            data={releaseGroup}
          />
        ) : null}

        {eventType === 'grabbed' && hasScore(customFormatScore) ? (
          <DescriptionListItem
            title={translate('CustomFormatScore')}
            data={formatCustomFormatScore(Number(customFormatScore))}
          />
        ) : null}

        {nzbInfoUrl ? <InfoUrl url={nzbInfoUrl} /> : null}

        {downloadClientNameInfo ? (
          <DescriptionListItem
            title={translate('DownloadClient')}
            data={downloadClientNameInfo}
          />
        ) : null}

        {downloadId ? (
          <DescriptionListItem title={translate('GrabID')} data={downloadId} />
        ) : null}

        {indexer ? (
          <DescriptionListItem
            title={translate('AgeWhenGrabbed')}
            data={formatAge(age, ageHours, ageMinutes)}
          />
        ) : null}

        {publishedDate ? (
          <DescriptionListItem
            title={translate('PublishedDate')}
            data={formatDateTime(publishedDate, shortDateFormat, timeFormat, {
              includeSeconds: true,
            })}
          />
        ) : null}
      </DescriptionList>
    );
  }

  if (eventType === 'downloadFailed') {
    const { message, indexer } = data;

    return (
      <DescriptionList>
        <DescriptionListItem
          descriptionClassName={styles.description}
          title={translate('Name')}
          data={sourceTitle}
        />

        {indexer ? (
          <DescriptionListItem title={translate('Indexer')} data={indexer} />
        ) : null}

        {message ? (
          <DescriptionListItem title={translate('Message')} data={message} />
        ) : null}
      </DescriptionList>
    );
  }

  if (eventType === 'bookFileImported') {
    const { customFormatScore, droppedPath, importedPath } = data;

    return (
      <DescriptionList>
        <DescriptionListItem
          descriptionClassName={styles.description}
          title={translate('Name')}
          data={sourceTitle}
        />

        {droppedPath ? (
          <DescriptionListItem
            descriptionClassName={styles.description}
            title={translate('Source')}
            data={droppedPath}
          />
        ) : null}

        {importedPath ? (
          <DescriptionListItem
            descriptionClassName={styles.description}
            title={translate('ImportedTo')}
            data={importedPath}
          />
        ) : null}

        {hasScore(customFormatScore) ? (
          <DescriptionListItem
            title={translate('CustomFormatScore')}
            data={formatCustomFormatScore(Number(customFormatScore))}
          />
        ) : null}
      </DescriptionList>
    );
  }

  if (eventType === 'bookFileDeleted') {
    const { reason, customFormatScore } = data;

    let reasonMessage = '';

    switch (reason) {
      case 'Manual':
        reasonMessage = translate('FileWasDeletedByViaUI');
        break;
      case 'MissingFromDisk':
        reasonMessage = translate('MissingFromDisk');
        break;
      case 'Upgrade':
        reasonMessage = translate('FileWasDeletedByUpgrade');
        break;
      default:
        reasonMessage = '';
    }

    return (
      <DescriptionList>
        <DescriptionListItem title={translate('Name')} data={sourceTitle} />

        <DescriptionListItem title={translate('Reason')} data={reasonMessage} />

        {hasScore(customFormatScore) ? (
          <DescriptionListItem
            title={translate('CustomFormatScore')}
            data={formatCustomFormatScore(Number(customFormatScore))}
          />
        ) : null}
      </DescriptionList>
    );
  }

  if (eventType === 'bookFileRenamed') {
    const { sourcePath, path } = data;

    return (
      <DescriptionList>
        <DescriptionListItem
          title={translate('SourcePath')}
          data={sourcePath}
        />

        <DescriptionListItem title={translate('DestinationPath')} data={path} />
      </DescriptionList>
    );
  }

  if (eventType === 'bookFileRetagged') {
    const { diff, tagsScrubbed } = data;
    const changes: RetagChange[] = diff ? JSON.parse(diff) : [];

    return (
      <DescriptionList>
        <DescriptionListItem title={translate('Path')} data={sourceTitle} />

        {changes.map(({ field, oldValue, newValue }) => {
          return (
            <DescriptionListItem
              key={field}
              title={field}
              data={formatChange(oldValue, newValue)}
            />
          );
        })}

        <DescriptionListItem
          title={translate('ExistingTagsScrubbed')}
          data={
            tagsScrubbed === 'True' ? (
              <Icon name={icons.CHECK} />
            ) : (
              <Icon name={icons.REMOVE} />
            )
          }
        />
      </DescriptionList>
    );
  }

  if (eventType === 'bookImportIncomplete') {
    const { statusMessages } = data;

    return (
      <DescriptionList>
        <DescriptionListItem title={translate('Name')} data={sourceTitle} />

        {statusMessages ? (
          <DescriptionListItem
            title={translate('ImportFailures')}
            data={getDetailedList(JSON.parse(statusMessages))}
          />
        ) : null}
      </DescriptionList>
    );
  }

  if (eventType === 'downloadIgnored') {
    const { message } = data;

    return (
      <DescriptionList>
        <DescriptionListItem
          descriptionClassName={styles.description}
          title={translate('Name')}
          data={sourceTitle}
        />

        {message ? (
          <DescriptionListItem title={translate('Message')} data={message} />
        ) : null}
      </DescriptionList>
    );
  }

  return (
    <DescriptionList>
      <DescriptionListItem
        descriptionClassName={styles.description}
        title={translate('Name')}
        data={sourceTitle}
      />
    </DescriptionList>
  );
}

export default HistoryDetails;
