import React, { useCallback, useMemo, useState } from 'react';
import Alert from 'Components/Alert';
import Form from 'Components/Form/Form';
import FormGroup from 'Components/Form/FormGroup';
import FormInputGroup from 'Components/Form/FormInputGroup';
import FormLabel from 'Components/Form/FormLabel';
import Button from 'Components/Link/Button';
import LoadingIndicator from 'Components/Loading/LoadingIndicator';
import Modal from 'Components/Modal/Modal';
import ModalBody from 'Components/Modal/ModalBody';
import ModalContent from 'Components/Modal/ModalContent';
import ModalFooter from 'Components/Modal/ModalFooter';
import ModalHeader from 'Components/Modal/ModalHeader';
import { inputTypes, kinds } from 'Helpers/Props';
import { Quality, QualityModel } from 'Quality/Quality';
import { useQualityProfileSchema } from 'Settings/Profiles/Quality/useQualityProfiles';
import { InputChanged } from 'typings/inputs';
import getQualities from 'Utilities/Quality/getQualities';
import translate from 'Utilities/String/translate';

interface SelectQualityModalContentProps {
  qualityId: number;
  proper: boolean;
  real: boolean;
  modalTitle: string;
  onQualitySelect(quality: QualityModel): void;
  onModalClose(): void;
}

function SelectQualityModalContent(props: SelectQualityModalContentProps) {
  const { modalTitle, onQualitySelect, onModalClose } = props;

  const [qualityId, setQualityId] = useState(props.qualityId);
  const [proper, setProper] = useState(props.proper);
  const [real, setReal] = useState(props.real);

  const { schema, isSchemaLoading, isSchemaFetched, schemaError } =
    useQualityProfileSchema(true);

  const items: Quality[] = useMemo(() => getQualities(schema.items), [schema]);

  const qualityOptions = useMemo(() => {
    return items.map(({ id, name }) => ({ key: id, value: name }));
  }, [items]);

  const handleQualityChange = useCallback(({ value }: InputChanged<string>) => {
    setQualityId(parseInt(value));
  }, []);

  const handleProperChange = useCallback(({ value }: InputChanged<boolean>) => {
    setProper(value);
  }, []);

  const handleRealChange = useCallback(({ value }: InputChanged<boolean>) => {
    setReal(value);
  }, []);

  const handleQualitySelect = useCallback(() => {
    const quality = items.find((item) => item.id === qualityId);

    if (!quality) {
      return;
    }

    // The redux modal sent version and real only; RevisionResource's isRepack
    // defaults to false on the server.
    onQualitySelect({
      quality,
      revision: {
        version: proper ? 2 : 1,
        real: real ? 1 : 0,
      },
    } as QualityModel);
  }, [items, qualityId, proper, real, onQualitySelect]);

  return (
    <ModalContent onModalClose={onModalClose}>
      <ModalHeader>
        {modalTitle} - {translate('SelectQuality')}
      </ModalHeader>

      <ModalBody>
        {isSchemaLoading ? <LoadingIndicator /> : null}

        {!isSchemaLoading && schemaError ? (
          <Alert kind={kinds.DANGER}>
            {translate('UnableToLoadQualities')}
          </Alert>
        ) : null}

        {isSchemaFetched && !schemaError ? (
          <Form>
            <FormGroup>
              <FormLabel>{translate('Quality')}</FormLabel>

              <FormInputGroup
                type={inputTypes.SELECT}
                name="quality"
                value={qualityId}
                values={qualityOptions}
                onChange={handleQualityChange}
              />
            </FormGroup>

            <FormGroup>
              <FormLabel>{translate('Proper')}</FormLabel>

              <FormInputGroup
                type={inputTypes.CHECK}
                name="proper"
                value={proper}
                onChange={handleProperChange}
              />
            </FormGroup>

            <FormGroup>
              <FormLabel>{translate('Real')}</FormLabel>

              <FormInputGroup
                type={inputTypes.CHECK}
                name="real"
                value={real}
                onChange={handleRealChange}
              />
            </FormGroup>
          </Form>
        ) : null}
      </ModalBody>

      <ModalFooter>
        <Button onPress={onModalClose}>{translate('Cancel')}</Button>

        <Button kind={kinds.SUCCESS} onPress={handleQualitySelect}>
          {translate('SelectQuality')}
        </Button>
      </ModalFooter>
    </ModalContent>
  );
}

interface SelectQualityModalProps extends SelectQualityModalContentProps {
  isOpen: boolean;
}

function SelectQualityModal({
  isOpen,
  onModalClose,
  ...otherProps
}: SelectQualityModalProps) {
  return (
    <Modal isOpen={isOpen} onModalClose={onModalClose}>
      <SelectQualityModalContent {...otherProps} onModalClose={onModalClose} />
    </Modal>
  );
}

export default SelectQualityModal;
