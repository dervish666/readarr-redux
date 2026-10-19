import React, { useCallback, useEffect } from 'react';
import Button from 'Components/Link/Button';
import SpinnerButton from 'Components/Link/SpinnerButton';
import Modal from 'Components/Modal/Modal';
import ModalBody from 'Components/Modal/ModalBody';
import ModalContent from 'Components/Modal/ModalContent';
import ModalFooter from 'Components/Modal/ModalFooter';
import ModalHeader from 'Components/Modal/ModalHeader';
import usePrevious from 'Helpers/Hooks/usePrevious';
import { kinds } from 'Helpers/Props';
import { HistoryData, HistoryEventType } from 'typings/History';
import translate from 'Utilities/String/translate';
import { useMarkAsFailed } from '../useHistory';
import HistoryDetails from './HistoryDetails';
import styles from './HistoryDetailsModal.css';

function getHeaderTitle(eventType: HistoryEventType) {
  switch (eventType) {
    case 'grabbed':
      return translate('Grabbed');
    case 'downloadFailed':
      return translate('DownloadFailed');
    case 'bookFileImported':
      return translate('BookImported');
    case 'bookFileDeleted':
      return translate('BookFileDeleted');
    case 'bookFileRenamed':
      return translate('BookFileRenamed');
    case 'bookFileRetagged':
      return translate('BookFileTagsUpdated');
    case 'bookImportIncomplete':
      return translate('BookImportIncomplete');
    case 'downloadImported':
      return translate('DownloadCompleted');
    case 'downloadIgnored':
      return translate('DownloadIgnored');
    default:
      return translate('Unknown');
  }
}

interface HistoryDetailsModalProps {
  isOpen: boolean;
  id: number;
  eventType: HistoryEventType;
  sourceTitle: string;
  data: HistoryData;
  onModalClose: () => void;
}

function HistoryDetailsModal({
  isOpen,
  id,
  eventType,
  sourceTitle,
  data,
  onModalClose,
}: HistoryDetailsModalProps) {
  const { markAsFailed, isMarkingAsFailed, markAsFailedError } =
    useMarkAsFailed(id);

  const wasMarkingAsFailed = usePrevious(isMarkingAsFailed);

  const handleMarkAsFailedPress = useCallback(() => {
    markAsFailed();
  }, [markAsFailed]);

  // Close once the item is marked failed; stay open on an error.
  useEffect(() => {
    if (wasMarkingAsFailed && !isMarkingAsFailed && !markAsFailedError) {
      onModalClose();
    }
  }, [wasMarkingAsFailed, isMarkingAsFailed, markAsFailedError, onModalClose]);

  return (
    <Modal isOpen={isOpen} onModalClose={onModalClose}>
      <ModalContent onModalClose={onModalClose}>
        <ModalHeader>{getHeaderTitle(eventType)}</ModalHeader>

        <ModalBody>
          <HistoryDetails
            eventType={eventType}
            sourceTitle={sourceTitle}
            data={data}
          />
        </ModalBody>

        <ModalFooter>
          {eventType === 'grabbed' ? (
            <SpinnerButton
              className={styles.markAsFailedButton}
              kind={kinds.DANGER}
              isSpinning={isMarkingAsFailed}
              onPress={handleMarkAsFailedPress}
            >
              {translate('MarkAsFailed')}
            </SpinnerButton>
          ) : null}

          <Button onPress={onModalClose}>{translate('Close')}</Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

export default HistoryDetailsModal;
