import React, { useMemo } from 'react';
import Button from 'Components/Link/Button';
import ModalBody from 'Components/Modal/ModalBody';
import ModalContent from 'Components/Modal/ModalContent';
import ModalFooter from 'Components/Modal/ModalFooter';
import ModalHeader from 'Components/Modal/ModalHeader';
import { scrollDirections } from 'Helpers/Props';
import InteractiveSearch from 'InteractiveSearch/InteractiveSearch';
import { useKeepReleases } from 'InteractiveSearch/useReleases';
import translate from 'Utilities/String/translate';

interface BookInteractiveSearchModalContentProps {
  bookId: number;
  bookTitle: string;
  authorName: string;
  onModalClose: () => void;
}

// The interactive search button of the author page's book rows and the wanted
// lists. Closing the modal cancels the search and drops its releases.
function BookInteractiveSearchModalContent({
  bookId,
  bookTitle,
  authorName,
  onModalClose,
}: BookInteractiveSearchModalContentProps) {
  const searchPayload = useMemo(() => ({ bookId }), [bookId]);

  useKeepReleases(searchPayload);

  return (
    <ModalContent onModalClose={onModalClose}>
      <ModalHeader>
        {translate('InteractiveSearchModalHeaderBookAuthor', {
          bookTitle,
          authorName,
        })}
      </ModalHeader>

      <ModalBody scrollDirection={scrollDirections.BOTH}>
        <InteractiveSearch searchPayload={searchPayload} />
      </ModalBody>

      <ModalFooter>
        <Button onPress={onModalClose}>{translate('Close')}</Button>
      </ModalFooter>
    </ModalContent>
  );
}

export default BookInteractiveSearchModalContent;
