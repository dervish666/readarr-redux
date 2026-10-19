import React, { useCallback, useEffect, useState } from 'react';
import { AuthorMonitor } from 'Author/Author';
import { useUpdateAuthorMonitor } from 'Author/useAuthors';
import Alert from 'Components/Alert';
import Form from 'Components/Form/Form';
import FormGroup from 'Components/Form/FormGroup';
import FormInputGroup from 'Components/Form/FormInputGroup';
import FormLabel from 'Components/Form/FormLabel';
import Button from 'Components/Link/Button';
import SpinnerErrorButton from 'Components/Link/SpinnerErrorButton';
import ModalBody from 'Components/Modal/ModalBody';
import ModalContent from 'Components/Modal/ModalContent';
import ModalFooter from 'Components/Modal/ModalFooter';
import ModalHeader from 'Components/Modal/ModalHeader';
import usePrevious from 'Helpers/Hooks/usePrevious';
import { inputTypes, kinds } from 'Helpers/Props';
import { InputChanged } from 'typings/inputs';
import translate from 'Utilities/String/translate';

const NO_CHANGE = 'noChange';

export interface MonitoringOptionsModalContentProps {
  authorId: number;
  onModalClose: () => void;
}

// POST /bookshelf { authors: [{ id }], monitoringOptions: { monitor } }, the same body
// the redux updateBookMonitor thunk sent. Which books change is decided on the server,
// so the hook refetches the book lists.
function MonitoringOptionsModalContent({
  authorId,
  onModalClose,
}: MonitoringOptionsModalContentProps) {
  const [monitor, setMonitor] = useState<AuthorMonitor | typeof NO_CHANGE>(
    NO_CHANGE
  );

  const {
    updateAuthorMonitor,
    isUpdatingAuthorMonitor,
    updateAuthorMonitorError,
  } = useUpdateAuthorMonitor();

  const wasSaving = usePrevious(isUpdatingAuthorMonitor);

  const handleMonitorChange = useCallback(({ value }: InputChanged) => {
    setMonitor(value as AuthorMonitor);
  }, []);

  const handleSavePress = useCallback(() => {
    if (monitor === NO_CHANGE) {
      onModalClose();
      return;
    }

    updateAuthorMonitor({
      authors: [{ id: authorId }],
      monitoringOptions: { monitor },
    });
  }, [authorId, monitor, onModalClose, updateAuthorMonitor]);

  useEffect(() => {
    if (wasSaving && !isUpdatingAuthorMonitor && !updateAuthorMonitorError) {
      setMonitor(NO_CHANGE);
      onModalClose();
    }
  }, [
    wasSaving,
    isUpdatingAuthorMonitor,
    updateAuthorMonitorError,
    onModalClose,
  ]);

  return (
    <ModalContent onModalClose={onModalClose}>
      <ModalHeader>{translate('MonitorBook')}</ModalHeader>

      <ModalBody>
        <Alert kind={kinds.INFO}>
          <div>{translate('MonitorBookExistingOnlyWarning')}</div>
        </Alert>

        <Form>
          <FormGroup>
            <FormLabel>{translate('Monitoring')}</FormLabel>

            <FormInputGroup
              type={inputTypes.MONITOR_BOOKS_SELECT}
              name="monitor"
              value={monitor}
              {...{ includeNoChange: true }}
              onChange={handleMonitorChange}
            />
          </FormGroup>
        </Form>
      </ModalBody>

      <ModalFooter>
        <Button onPress={onModalClose}>{translate('Cancel')}</Button>

        <SpinnerErrorButton
          error={updateAuthorMonitorError}
          isSpinning={isUpdatingAuthorMonitor}
          onPress={handleSavePress}
        >
          {translate('Save')}
        </SpinnerErrorButton>
      </ModalFooter>
    </ModalContent>
  );
}

export default MonitoringOptionsModalContent;
