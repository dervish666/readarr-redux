import React, { useCallback, useState } from 'react';
import Form from 'Components/Form/Form';
import FormGroup from 'Components/Form/FormGroup';
import FormInputGroup from 'Components/Form/FormInputGroup';
import FormLabel from 'Components/Form/FormLabel';
import Button from 'Components/Link/Button';
import Modal from 'Components/Modal/Modal';
import ModalBody from 'Components/Modal/ModalBody';
import ModalContent from 'Components/Modal/ModalContent';
import ModalFooter from 'Components/Modal/ModalFooter';
import ModalHeader from 'Components/Modal/ModalHeader';
import { inputTypes, kinds, scrollDirections } from 'Helpers/Props';
import { InputChanged } from 'typings/inputs';
import translate from 'Utilities/String/translate';
import styles from './SelectReleaseGroupModal.module.css';

interface SelectReleaseGroupModalContentProps {
  releaseGroup: string;
  modalTitle: string;
  onReleaseGroupSelect(releaseGroup: string): void;
  onModalClose(): void;
}

function SelectReleaseGroupModalContent(
  props: SelectReleaseGroupModalContentProps
) {
  const { modalTitle, onReleaseGroupSelect, onModalClose } = props;
  const [releaseGroup, setReleaseGroup] = useState(props.releaseGroup);

  const handleReleaseGroupChange = useCallback(
    ({ value }: InputChanged<string>) => {
      setReleaseGroup(value);
    },
    []
  );

  const handleReleaseGroupSelect = useCallback(() => {
    onReleaseGroupSelect(releaseGroup);
  }, [releaseGroup, onReleaseGroupSelect]);

  return (
    <ModalContent onModalClose={onModalClose}>
      <ModalHeader>
        {modalTitle} - {translate('SetReleaseGroup')}
      </ModalHeader>

      <ModalBody
        className={styles.modalBody}
        scrollDirection={scrollDirections.NONE}
      >
        <Form>
          <FormGroup>
            <FormLabel>{translate('ReleaseGroup')}</FormLabel>

            <FormInputGroup
              type={inputTypes.TEXT}
              name="releaseGroup"
              value={releaseGroup}
              autoFocus={true}
              onChange={handleReleaseGroupChange}
            />
          </FormGroup>
        </Form>
      </ModalBody>

      <ModalFooter>
        <Button onPress={onModalClose}>{translate('Cancel')}</Button>

        <Button kind={kinds.SUCCESS} onPress={handleReleaseGroupSelect}>
          {translate('SetReleaseGroup')}
        </Button>
      </ModalFooter>
    </ModalContent>
  );
}

interface SelectReleaseGroupModalProps
  extends SelectReleaseGroupModalContentProps {
  isOpen: boolean;
}

function SelectReleaseGroupModal({
  isOpen,
  onModalClose,
  ...otherProps
}: SelectReleaseGroupModalProps) {
  return (
    <Modal isOpen={isOpen} onModalClose={onModalClose}>
      <SelectReleaseGroupModalContent
        {...otherProps}
        onModalClose={onModalClose}
      />
    </Modal>
  );
}

export default SelectReleaseGroupModal;
