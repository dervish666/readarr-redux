import React from 'react';
import Alert from 'Components/Alert';
import Button from 'Components/Link/Button';
import LoadingIndicator from 'Components/Loading/LoadingIndicator';
import Modal from 'Components/Modal/Modal';
import ModalBody from 'Components/Modal/ModalBody';
import ModalContent from 'Components/Modal/ModalContent';
import ModalFooter from 'Components/Modal/ModalFooter';
import ModalHeader from 'Components/Modal/ModalHeader';
import useApiQuery from 'Helpers/Hooks/useApiQuery';
import { kinds } from 'Helpers/Props';
import translate from 'Utilities/String/translate';
import BookFile from './BookFile';
import FileDetails from './FileDetails';

interface FileDetailsModalContentProps {
  id: number;
}

// Only GET /bookfile/{id} reads the file's tags (audioTags); lists leave them out.
function FileDetailsModalContent({ id }: FileDetailsModalContentProps) {
  const { data, isFetching, error } = useApiQuery<BookFile>({
    path: `/bookfile/${id}`,
    queryOptions: {
      gcTime: 0,
    },
  });

  if (error) {
    return (
      <Alert kind={kinds.DANGER}>{translate('LoadingBookFilesFailed')}</Alert>
    );
  }

  if (isFetching || !data?.audioTags) {
    return <LoadingIndicator />;
  }

  return <FileDetails audioTags={data.audioTags} filename={data.path} />;
}

interface FileDetailsModalProps {
  isOpen: boolean;
  id: number;
  onModalClose: () => void;
}

function FileDetailsModal({ isOpen, id, onModalClose }: FileDetailsModalProps) {
  return (
    <Modal isOpen={isOpen} onModalClose={onModalClose}>
      <ModalContent onModalClose={onModalClose}>
        <ModalHeader>{translate('Details')}</ModalHeader>

        <ModalBody>
          {isOpen ? <FileDetailsModalContent id={id} /> : null}
        </ModalBody>

        <ModalFooter>
          <Button onPress={onModalClose}>{translate('Close')}</Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

export default FileDetailsModal;
