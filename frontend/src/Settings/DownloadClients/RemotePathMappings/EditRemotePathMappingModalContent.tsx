import React, { useCallback, useEffect } from 'react';
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
import translate from 'Utilities/String/translate';
import useDownloadClientHostOptions from './useDownloadClientHostOptions';
import {
  RemotePathMappingModel,
  useManageRemotePathMapping,
} from './useRemotePathMappings';
import styles from './EditRemotePathMappingModalContent.module.css';

export interface EditRemotePathMappingModalContentProps {
  id?: number;
  onDeleteRemotePathMappingPress?: () => void;
  onModalClose: () => void;
}

function EditRemotePathMappingModalContent({
  id,
  onDeleteRemotePathMappingPress,
  onModalClose,
}: EditRemotePathMappingModalContentProps) {
  const downloadClientHosts = useDownloadClientHostOptions();

  const {
    item,
    isSaving,
    saveError,
    validationErrors,
    validationWarnings,
    updateValue,
    saveProvider,
  } = useManageRemotePathMapping(id);

  const { host, remotePath, localPath } = item;
  const wasSaving = usePrevious(isSaving);

  const handleInputChange = useCallback(
    ({ name, value }: { name: string; value: unknown }) => {
      updateValue(name as keyof RemotePathMappingModel, value as string);
    },
    [updateValue]
  );

  useEffect(() => {
    if (wasSaving && !isSaving && !saveError) {
      onModalClose();
    }
  }, [isSaving, wasSaving, saveError, onModalClose]);

  return (
    <ModalContent onModalClose={onModalClose}>
      <ModalHeader>
        {id
          ? translate('EditRemotePathMapping')
          : translate('AddRemotePathMapping')}
      </ModalHeader>

      <ModalBody className={styles.body}>
        <Form
          validationErrors={validationErrors}
          validationWarnings={validationWarnings}
        >
          <FormGroup>
            <FormLabel>{translate('Host')}</FormLabel>

            <FormInputGroup
              type={inputTypes.SELECT}
              name="host"
              helpText={translate('HostHelpText')}
              {...host}
              values={downloadClientHosts}
              onChange={handleInputChange}
            />
          </FormGroup>

          <FormGroup>
            <FormLabel>
              {translate('SettingsRemotePathMappingRemotePath')}
            </FormLabel>

            <FormInputGroup
              type={inputTypes.TEXT}
              name="remotePath"
              helpText={translate(
                'SettingsRemotePathMappingRemotePathHelpText'
              )}
              {...remotePath}
              onChange={handleInputChange}
            />
          </FormGroup>

          <FormGroup>
            <FormLabel>
              {translate('SettingsRemotePathMappingLocalPath')}
            </FormLabel>

            <FormInputGroup
              type={inputTypes.PATH}
              name="localPath"
              helpText={translate('SettingsRemotePathMappingLocalPathHelpText')}
              {...localPath}
              onChange={handleInputChange}
            />
          </FormGroup>
        </Form>
      </ModalBody>

      <ModalFooter>
        {id ? (
          <Button
            className={styles.deleteButton}
            kind={kinds.DANGER}
            onPress={onDeleteRemotePathMappingPress}
          >
            {translate('Delete')}
          </Button>
        ) : null}

        <Button onPress={onModalClose}>{translate('Cancel')}</Button>

        <SpinnerErrorButton
          isSpinning={isSaving}
          error={saveError}
          onPress={saveProvider}
        >
          {translate('Save')}
        </SpinnerErrorButton>
      </ModalFooter>
    </ModalContent>
  );
}

export default EditRemotePathMappingModalContent;
