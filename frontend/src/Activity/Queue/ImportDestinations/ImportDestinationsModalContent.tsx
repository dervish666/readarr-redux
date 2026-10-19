import classNames from 'classnames';
import React, { ReactNode, useCallback, useEffect, useState } from 'react';
import { useImportDestinations } from 'Activity/Queue/useQueue';
import Alert from 'Components/Alert';
import Button from 'Components/Link/Button';
import LoadingIndicator from 'Components/Loading/LoadingIndicator';
import ModalBody from 'Components/Modal/ModalBody';
import ModalContent from 'Components/Modal/ModalContent';
import ModalFooter from 'Components/Modal/ModalFooter';
import ModalHeader from 'Components/Modal/ModalHeader';
import usePrevious from 'Helpers/Hooks/usePrevious';
import { kinds } from 'Helpers/Props';
import { QueueImportDestination } from 'typings/Queue';
import formatDateTime from 'Utilities/Date/formatDateTime';
import { ApiError } from 'Utilities/Fetch/fetchJson';
import formatBytes from 'Utilities/Number/formatBytes';
import translate from 'Utilities/String/translate';
import styles from './ImportDestinationsModalContent.css';

const NONE = '-';

function splitPath(path?: string) {
  if (!path) {
    return { folder: '', name: '' };
  }

  const index = Math.max(path.lastIndexOf('/'), path.lastIndexOf('\\'));

  return {
    folder: path.substring(0, index),
    name: path.substring(index + 1),
  };
}

function formatTags(
  title?: string,
  author?: string,
  series?: string,
  seriesIndex?: string
) {
  const parts: string[] = [];

  if (author) {
    parts.push(author);
  }

  if (title) {
    parts.push(title);
  }

  if (series) {
    parts.push(seriesIndex ? `${series} #${seriesIndex}` : series);
  }

  return parts.length ? parts.join(' — ') : NONE;
}

export function getImportErrorMessage(error: ApiError | null | undefined) {
  if (!error) {
    return null;
  }

  return error.statusBody?.message || translate('QueueImportFailed');
}

interface CompareRowProps {
  title: string;
  source: ReactNode;
  destination: ReactNode;
  highlight?: boolean;
}

function CompareRow({
  title,
  source,
  destination,
  highlight,
}: CompareRowProps) {
  return (
    <tr className={highlight ? styles.differs : undefined}>
      <th className={styles.rowTitle}>{title}</th>
      <td className={styles.value}>{source}</td>
      <td className={styles.value}>{destination}</td>
    </tr>
  );
}

interface ImportDestinationItemProps {
  item: QueueImportDestination;
  shortDateFormat: string;
  timeFormat: string;
}

function ImportDestinationItem({
  item,
  shortDateFormat,
  timeFormat,
}: ImportDestinationItemProps) {
  const source = splitPath(item.sourcePath);
  const destination = splitPath(item.destinationPath);
  const exists = item.destinationExists;

  let inLibrary = translate('ImportDestinationNotInLibrary');

  if (item.destinationBookFileId) {
    inLibrary = item.destinationBookTitle
      ? `${item.destinationAuthorName || ''} — ${item.destinationBookTitle}`
      : translate('ImportDestinationUnmapped');
  }

  return (
    <div className={classNames(styles.file, exists && styles.collision)}>
      <div className={styles.target}>
        {item.bookTitle
          ? translate('ImportDestinationImportsAs', {
              author: item.authorName ?? '',
              book: item.bookTitle,
            })
          : translate('ImportDestinationNoBook')}
      </div>

      {item.rejections?.length ? (
        <div className={styles.rejections}>{item.rejections.join('; ')}</div>
      ) : null}

      <table className={styles.compare}>
        <thead>
          <tr>
            <th />
            <th className={styles.columnTitle}>
              {translate('ImportDestinationDownload')}
            </th>
            <th className={styles.columnTitle}>
              {exists
                ? translate('ImportDestinationAlreadyThere')
                : translate('ImportDestinationNothingThere')}
            </th>
          </tr>
        </thead>

        <tbody>
          <CompareRow
            title={translate('File')}
            source={source.name}
            destination={destination.name || NONE}
          />

          <CompareRow
            title={translate('Folder')}
            source={source.folder}
            destination={destination.folder || NONE}
          />

          <CompareRow
            title={translate('Size')}
            source={formatBytes(item.sourceSize)}
            destination={exists ? formatBytes(item.destinationSize) : NONE}
            highlight={exists && item.sourceSize !== item.destinationSize}
          />

          <CompareRow
            title={translate('Modified')}
            source={formatDateTime(
              item.sourceModified,
              shortDateFormat,
              timeFormat
            )}
            destination={
              exists && item.destinationModified
                ? formatDateTime(
                    item.destinationModified,
                    shortDateFormat,
                    timeFormat
                  )
                : NONE
            }
          />

          <CompareRow
            title={translate('Quality')}
            source={item.sourceQuality?.quality?.name || NONE}
            destination={item.destinationQuality?.quality?.name || NONE}
          />

          <CompareRow
            title={translate('Tags')}
            source={formatTags(
              item.sourceTagTitle,
              item.sourceTagAuthor,
              item.sourceTagSeries,
              item.sourceTagSeriesIndex
            )}
            destination={
              exists
                ? formatTags(
                    item.destinationTagTitle,
                    item.destinationTagAuthor,
                    item.destinationTagSeries,
                    item.destinationTagSeriesIndex
                  )
                : NONE
            }
            highlight={
              exists &&
              (item.sourceTagTitle !== item.destinationTagTitle ||
                item.sourceTagSeriesIndex !== item.destinationTagSeriesIndex)
            }
          />

          {exists ? (
            <CompareRow
              title={translate('ImportDestinationInLibraryAs')}
              source={NONE}
              destination={inLibrary}
            />
          ) : null}
        </tbody>
      </table>
    </div>
  );
}

export interface ImportDestinationsModalContentProps {
  id: number;
  title: string;
  shortDateFormat: string;
  timeFormat: string;
  isImporting: boolean;
  importError?: ApiError | null;
  onImportAndReplacePress: () => void;
  onRemovePress: () => void;
  onModalClose: () => void;
}

function ImportDestinationsModalContent(
  props: ImportDestinationsModalContentProps
) {
  const {
    id,
    title,
    shortDateFormat,
    timeFormat,
    isImporting,
    importError,
    onImportAndReplacePress,
    onRemovePress,
    onModalClose,
  } = props;

  const { data: items = [], isFetching, error } = useImportDestinations(id);

  const [isSubmitted, setIsSubmitted] = useState(false);
  const wasImporting = usePrevious(isImporting);

  // The modal stays open until the request is accepted, so a failure is shown here rather than lost
  useEffect(() => {
    if (!isSubmitted || !wasImporting || isImporting) {
      return;
    }

    if (importError) {
      setIsSubmitted(false);
    } else {
      onModalClose();
    }
  }, [isSubmitted, wasImporting, isImporting, importError, onModalClose]);

  const handleImportAndReplacePress = useCallback(() => {
    setIsSubmitted(true);
    onImportAndReplacePress();
  }, [onImportAndReplacePress]);

  const collisions = items.filter((i) => i.destinationExists).length;
  const importErrorMessage = getImportErrorMessage(importError);

  return (
    <ModalContent onModalClose={onModalClose}>
      <ModalHeader>
        {translate('ImportDestinationsTitle', { title })}
      </ModalHeader>

      <ModalBody>
        {importErrorMessage ? (
          <Alert kind={kinds.DANGER}>{importErrorMessage}</Alert>
        ) : null}

        {isFetching ? <LoadingIndicator /> : null}

        {!isFetching && error ? (
          <Alert kind={kinds.DANGER}>
            {translate('ImportDestinationsLoadError')}
          </Alert>
        ) : null}

        {!isFetching && !error && !items.length ? (
          <Alert kind={kinds.INFO}>
            {translate('ImportDestinationsNoFiles')}
          </Alert>
        ) : null}

        {!isFetching && !error && items.length > 0 ? (
          <div>
            <Alert kind={collisions ? kinds.WARNING : kinds.INFO}>
              {collisions
                ? translate('ImportDestinationsCollisions', {
                    count: collisions,
                  })
                : translate('ImportDestinationsNoCollisions')}
            </Alert>

            {items.map((item) => (
              <ImportDestinationItem
                key={item.sourcePath}
                item={item}
                shortDateFormat={shortDateFormat}
                timeFormat={timeFormat}
              />
            ))}
          </div>
        ) : null}
      </ModalBody>

      <ModalFooter>
        <Button onPress={onModalClose}>{translate('Close')}</Button>

        <Button kind={kinds.WARNING} onPress={onRemovePress}>
          {translate('RemoveFromQueue')}
        </Button>

        <Button
          kind={kinds.DANGER}
          isDisabled={isFetching || !!error || !items.length || isImporting}
          title={translate('ImportAndReplaceHelpText')}
          onPress={handleImportAndReplacePress}
        >
          {translate('ImportAndReplace')}
        </Button>
      </ModalFooter>
    </ModalContent>
  );
}

export default ImportDestinationsModalContent;
