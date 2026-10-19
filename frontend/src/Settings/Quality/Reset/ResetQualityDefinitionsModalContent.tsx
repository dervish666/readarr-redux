import React, { useCallback, useState } from 'react';
import FormGroup from 'Components/Form/FormGroup';
import FormInputGroup from 'Components/Form/FormInputGroup';
import FormLabel from 'Components/Form/FormLabel';
import Button from 'Components/Link/Button';
import ModalBody from 'Components/Modal/ModalBody';
import ModalContent from 'Components/Modal/ModalContent';
import ModalFooter from 'Components/Modal/ModalFooter';
import ModalHeader from 'Components/Modal/ModalHeader';
import { inputTypes, kinds } from 'Helpers/Props';
import translate from 'Utilities/String/translate';
import styles from './ResetQualityDefinitionsModalContent.css';

export interface ResetQualityDefinitionsModalContentProps {
  isResettingQualityDefinitions: boolean;
  onResetQualityDefinitions: (resetTitles: boolean) => void;
  onModalClose: () => void;
}

function ResetQualityDefinitionsModalContent({
  isResettingQualityDefinitions,
  onResetQualityDefinitions,
  onModalClose,
}: ResetQualityDefinitionsModalContentProps) {
  const [resetDefinitionTitles, setResetDefinitionTitles] = useState(false);

  const handleResetDefinitionTitlesChange = useCallback(
    ({ value }: { value: boolean }) => {
      setResetDefinitionTitles(value);
    },
    []
  );

  const handleResetPress = useCallback(() => {
    setResetDefinitionTitles(false);
    onResetQualityDefinitions(resetDefinitionTitles);
  }, [resetDefinitionTitles, onResetQualityDefinitions]);

  return (
    <ModalContent onModalClose={onModalClose}>
      <ModalHeader>{translate('ResetQualityDefinitions')}</ModalHeader>

      <ModalBody>
        <div className={styles.messageContainer}>
          {translate('ResetQualityDefinitionsMessageText')}
        </div>

        <FormGroup>
          <FormLabel>{translate('ResetTitles')}</FormLabel>

          <FormInputGroup
            type={inputTypes.CHECK}
            name="resetDefinitionTitles"
            value={resetDefinitionTitles}
            helpText={translate('ResetDefinitionTitlesHelpText')}
            onChange={handleResetDefinitionTitlesChange}
          />
        </FormGroup>
      </ModalBody>

      <ModalFooter>
        <Button onPress={onModalClose}>{translate('Cancel')}</Button>

        <Button
          kind={kinds.DANGER}
          isDisabled={isResettingQualityDefinitions}
          onPress={handleResetPress}
        >
          {translate('Reset')}
        </Button>
      </ModalFooter>
    </ModalContent>
  );
}

export default ResetQualityDefinitionsModalContent;
