import React, { useCallback, useState } from 'react';
import ProtocolLabel from 'Activity/Queue/ProtocolLabel';
import BookFormats from 'Book/BookFormats';
import BookQuality from 'Book/BookQuality';
import IndexerFlags from 'Book/IndexerFlags';
import Icon from 'Components/Icon';
import Link from 'Components/Link/Link';
import SpinnerIconButton from 'Components/Link/SpinnerIconButton';
import ConfirmModal from 'Components/Modal/ConfirmModal';
import TableRowCell from 'Components/Table/Cells/TableRowCell';
import TableRow from 'Components/Table/TableRow';
import Popover from 'Components/Tooltip/Popover';
import Tooltip from 'Components/Tooltip/Tooltip';
import { icons, kinds, tooltipPositions } from 'Helpers/Props';
import { useUiSettingsValues } from 'Settings/UI/useUiSettings';
import formatDateTime from 'Utilities/Date/formatDateTime';
import formatAge from 'Utilities/Number/formatAge';
import formatBytes from 'Utilities/Number/formatBytes';
import formatCustomFormatScore from 'Utilities/Number/formatCustomFormatScore';
import translate from 'Utilities/String/translate';
import InteractiveSearchPayload from './InteractiveSearchPayload';
import Peers from './Peers';
import { Release, useGrabRelease } from './useReleases';
import styles from './InteractiveSearchRow.module.css';

function getDownloadIcon(
  isGrabbing: boolean,
  isGrabbed: boolean,
  grabError?: string
) {
  if (isGrabbing) {
    return icons.SPINNER;
  } else if (isGrabbed) {
    return icons.DOWNLOADING;
  } else if (grabError) {
    return icons.DOWNLOADING;
  }

  return icons.DOWNLOAD;
}

function getDownloadKind(
  isGrabbed: boolean,
  downloadAllowed: boolean,
  grabError?: string
) {
  if (isGrabbed) {
    return kinds.SUCCESS;
  }

  if (grabError || !downloadAllowed) {
    return kinds.DANGER;
  }

  return kinds.DEFAULT;
}

function getDownloadTooltip(
  isGrabbing: boolean,
  isGrabbed: boolean,
  grabError?: string
) {
  if (isGrabbing) {
    return '';
  } else if (isGrabbed) {
    return translate('AddedToDownloadQueue');
  } else if (grabError) {
    return grabError;
  }

  return translate('AddToDownloadQueue');
}

interface InteractiveSearchRowProps {
  release: Release;
  searchPayload: InteractiveSearchPayload;
}

function InteractiveSearchRow({
  release,
  searchPayload,
}: InteractiveSearchRowProps) {
  const {
    guid,
    indexerId,
    protocol,
    age,
    ageHours,
    ageMinutes,
    publishDate,
    title,
    infoUrl,
    indexer,
    size,
    seeders,
    leechers,
    quality,
    customFormatScore,
    customFormats = [],
    indexerFlags = 0,
    rejections = [],
    downloadAllowed,
  } = release;

  const { longDateFormat, timeFormat } = useUiSettingsValues();
  const [isConfirmGrabModalOpen, setIsConfirmGrabModalOpen] = useState(false);
  const { grabRelease, isGrabbing, isGrabbed, grabError } = useGrabRelease();

  const handleGrabPress = useCallback(() => {
    if (downloadAllowed) {
      grabRelease({ guid, indexerId });

      return;
    }

    setIsConfirmGrabModalOpen(true);
  }, [guid, indexerId, downloadAllowed, grabRelease]);

  // A release the server can't place (unknown author or book) is grabbed for the
  // book or author being searched.
  const handleGrabConfirm = useCallback(() => {
    setIsConfirmGrabModalOpen(false);

    grabRelease({ guid, indexerId, ...searchPayload });
  }, [guid, indexerId, searchPayload, grabRelease]);

  const handleGrabCancel = useCallback(() => {
    setIsConfirmGrabModalOpen(false);
  }, []);

  return (
    <TableRow>
      <TableRowCell className={styles.protocol}>
        <ProtocolLabel protocol={protocol} />
      </TableRowCell>

      <TableRowCell
        className={styles.age}
        title={formatDateTime(publishDate, longDateFormat, timeFormat, {
          includeSeconds: true,
        })}
      >
        {formatAge(age, ageHours, ageMinutes)}
      </TableRowCell>

      <TableRowCell className={styles.title}>
        <div className={styles.titleContent}>
          <Link to={infoUrl}>{title}</Link>
        </div>
      </TableRowCell>

      <TableRowCell className={styles.indexer}>{indexer}</TableRowCell>

      <TableRowCell className={styles.size}>{formatBytes(size)}</TableRowCell>

      <TableRowCell className={styles.peers}>
        {protocol === 'torrent' ? (
          <Peers seeders={seeders} leechers={leechers} />
        ) : null}
      </TableRowCell>

      <TableRowCell className={styles.quality}>
        <BookQuality quality={quality} showRevision={true} />
      </TableRowCell>

      <TableRowCell className={styles.customFormatScore}>
        <Tooltip
          anchor={formatCustomFormatScore(
            customFormatScore,
            customFormats.length
          )}
          tooltip={<BookFormats formats={customFormats} />}
          position={tooltipPositions.LEFT}
        />
      </TableRowCell>

      <TableRowCell className={styles.indexerFlags}>
        {indexerFlags ? (
          <Popover
            anchor={<Icon name={icons.FLAG} kind={kinds.PRIMARY} />}
            title={translate('IndexerFlags')}
            body={<IndexerFlags indexerFlags={indexerFlags} />}
            position={tooltipPositions.LEFT}
          />
        ) : null}
      </TableRowCell>

      <TableRowCell className={styles.rejected}>
        {rejections.length ? (
          <Popover
            anchor={<Icon name={icons.DANGER} kind={kinds.DANGER} />}
            title={translate('ReleaseRejected')}
            body={
              <ul className={styles.rejections}>
                {rejections.map((rejection, index) => {
                  return <li key={index}>{rejection}</li>;
                })}
              </ul>
            }
            position={tooltipPositions.LEFT}
          />
        ) : null}
      </TableRowCell>

      <TableRowCell className={styles.download}>
        <SpinnerIconButton
          name={getDownloadIcon(isGrabbing, isGrabbed, grabError)}
          kind={getDownloadKind(isGrabbed, downloadAllowed, grabError)}
          title={getDownloadTooltip(isGrabbing, isGrabbed, grabError)}
          aria-label={translate('Grab')}
          isSpinning={isGrabbing}
          onPress={handleGrabPress}
        />
      </TableRowCell>

      <ConfirmModal
        isOpen={isConfirmGrabModalOpen}
        kind={kinds.WARNING}
        title={translate('GrabRelease')}
        message={translate('GrabReleaseMessageText', { 0: title })}
        confirmLabel={translate('Grab')}
        onConfirm={handleGrabConfirm}
        onCancel={handleGrabCancel}
      />
    </TableRow>
  );
}

export default InteractiveSearchRow;
