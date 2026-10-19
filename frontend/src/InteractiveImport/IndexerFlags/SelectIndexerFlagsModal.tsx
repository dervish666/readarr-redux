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
import styles from './SelectIndexerFlagsModal.css';

interface SelectIndexerFlagsModalContentProps {
  indexerFlags: number;
  modalTitle: string;
  onIndexerFlagsSelect(indexerFlags: number): void;
  onModalClose(): void;
}

function SelectIndexerFlagsModalContent(
  props: SelectIndexerFlagsModalContentProps
) {
  const { modalTitle, onIndexerFlagsSelect, onModalClose } = props;
  const [indexerFlags, setIndexerFlags] = useState(props.indexerFlags);

  const handleIndexerFlagsChange = useCallback(
    ({ value }: InputChanged<number>) => {
      setIndexerFlags(value);
    },
    []
  );

  const handleIndexerFlagsSelect = useCallback(() => {
    onIndexerFlagsSelect(indexerFlags);
  }, [indexerFlags, onIndexerFlagsSelect]);

  return (
    <ModalContent onModalClose={onModalClose}>
      <ModalHeader>
        {modalTitle} - {translate('SetIndexerFlags')}
      </ModalHeader>

      <ModalBody
        className={styles.modalBody}
        scrollDirection={scrollDirections.NONE}
      >
        <Form>
          <FormGroup>
            <FormLabel>{translate('IndexerFlags')}</FormLabel>

            <FormInputGroup
              type={inputTypes.INDEXER_FLAGS_SELECT}
              name="indexerFlags"
              {...{ indexerFlags }}
              autoFocus={true}
              onChange={handleIndexerFlagsChange}
            />
          </FormGroup>
        </Form>
      </ModalBody>

      <ModalFooter>
        <Button onPress={onModalClose}>{translate('Cancel')}</Button>

        <Button kind={kinds.SUCCESS} onPress={handleIndexerFlagsSelect}>
          {translate('SetIndexerFlags')}
        </Button>
      </ModalFooter>
    </ModalContent>
  );
}

interface SelectIndexerFlagsModalProps
  extends SelectIndexerFlagsModalContentProps {
  isOpen: boolean;
}

function SelectIndexerFlagsModal({
  isOpen,
  onModalClose,
  ...otherProps
}: SelectIndexerFlagsModalProps) {
  return (
    <Modal isOpen={isOpen} onModalClose={onModalClose}>
      <SelectIndexerFlagsModalContent
        {...otherProps}
        onModalClose={onModalClose}
      />
    </Modal>
  );
}

export default SelectIndexerFlagsModal;
