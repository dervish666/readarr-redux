import React, { useCallback, useEffect, useState } from 'react';
import Alert from 'Components/Alert';
import FieldSet from 'Components/FieldSet';
import Form from 'Components/Form/Form';
import FormGroup from 'Components/Form/FormGroup';
import FormInputButton from 'Components/Form/FormInputButton';
import FormInputGroup from 'Components/Form/FormInputGroup';
import FormLabel from 'Components/Form/FormLabel';
import LoadingIndicator from 'Components/Loading/LoadingIndicator';
import useDebounce from 'Helpers/Hooks/useDebounce';
import useModalOpenState from 'Helpers/Hooks/useModalOpenState';
import { inputTypes, kinds, sizes } from 'Helpers/Props';
import { useShowAdvancedSettings } from 'Settings/advancedSettingsStore';
import { InputChanged } from 'typings/inputs';
import translate from 'Utilities/String/translate';
import NamingModal, { NamingModalOptions } from './NamingModal';
import {
  NamingSettingsModel,
  useManageNamingSettings,
  useNamingExamples,
} from './useNamingSettings';
import styles from './Naming.css';

export interface NamingStateChange {
  isSaving: boolean;
  hasPendingChanges: boolean;
}

interface NamingProps {
  setChildSave: (saveCallback: () => void) => void;
  onChildStateChange: (change: NamingStateChange) => void;
}

interface FormatMessage {
  message: string;
}

// Book naming, saved by the Media Management toolbar together with the media
// management settings (Sonarr's setChildSave pattern).
function Naming({ setChildSave, onChildStateChange }: NamingProps) {
  const advancedSettings = useShowAdvancedSettings();

  const {
    settings,
    hasSettings,
    hasPendingChanges,
    isFetching,
    isFetched,
    isSaving,
    error,
    updateSetting,
    saveSettings,
  } = useManageNamingSettings();

  const debouncedSettings = useDebounce(settings, 300);
  const { examples } = useNamingExamples(debouncedSettings);

  const [isNamingModalOpen, setNamingModalOpen, setNamingModalClosed] =
    useModalOpenState(false);
  const [namingModalOptions, setNamingModalOptions] =
    useState<NamingModalOptions | null>(null);

  const handleInputChange = useCallback(
    ({ name, value }: InputChanged) => {
      updateSetting(
        name as keyof NamingSettingsModel,
        value as NamingSettingsModel[keyof NamingSettingsModel]
      );
    },
    [updateSetting]
  );

  const handleStandardNamingModalOpenClick = useCallback(() => {
    setNamingModalOptions({
      name: 'standardBookFormat',
      book: true,
      additional: true,
    });

    setNamingModalOpen();
  }, [setNamingModalOpen]);

  const handleAuthorFolderNamingModalOpenClick = useCallback(() => {
    setNamingModalOptions({ name: 'authorFolderFormat' });
    setNamingModalOpen();
  }, [setNamingModalOpen]);

  useEffect(() => {
    onChildStateChange({ isSaving, hasPendingChanges });
  }, [isSaving, hasPendingChanges, onChildStateChange]);

  useEffect(() => {
    setChildSave(saveSettings);
  }, [setChildSave, saveSettings]);

  const renameBooks = hasSettings && settings.renameBooks.value;
  const replaceIllegalCharacters =
    hasSettings && settings.replaceIllegalCharacters.value;

  const colonReplacementOptions = [
    { key: 0, value: translate('Delete') },
    { key: 1, value: translate('ReplaceWithDash') },
    { key: 2, value: translate('ReplaceWithSpaceDash') },
    { key: 3, value: translate('ReplaceWithSpaceDashSpace') },
    {
      key: 4,
      value: translate('SmartReplace'),
      hint: translate('DashOrSpaceDashDependingOnName'),
    },
  ];

  const standardBookFormatHelpTexts: string[] = [];
  const standardBookFormatErrors: FormatMessage[] = [];
  const authorFolderFormatHelpTexts: string[] = [];
  const authorFolderFormatErrors: FormatMessage[] = [];

  if (examples) {
    if (examples.singleBookExample) {
      standardBookFormatHelpTexts.push(
        `Single Book: ${examples.singleBookExample}`
      );
    } else {
      standardBookFormatErrors.push({ message: 'Single Book: Invalid Format' });
    }

    if (examples.multiPartBookExample) {
      standardBookFormatHelpTexts.push(
        `Multi-part Book: ${examples.multiPartBookExample}`
      );
    } else {
      standardBookFormatErrors.push({
        message: 'Multi-part Book: Invalid Format',
      });
    }

    if (examples.authorFolderExample) {
      authorFolderFormatHelpTexts.push(
        `Example: ${examples.authorFolderExample}`
      );
    } else {
      authorFolderFormatErrors.push({ message: 'Invalid Format' });
    }
  }

  return (
    <FieldSet legend={translate('BookNaming')}>
      {isFetching && !isFetched ? <LoadingIndicator /> : null}

      {isFetched && error ? (
        <Alert kind={kinds.DANGER}>
          {translate('UnableToLoadNamingSettings')}
        </Alert>
      ) : null}

      {hasSettings && isFetched && !error ? (
        <Form>
          <FormGroup size={sizes.MEDIUM}>
            <FormLabel>{translate('RenameBooks')}</FormLabel>

            <FormInputGroup
              type={inputTypes.CHECK}
              name="renameBooks"
              helpText={translate('RenameBooksHelpText')}
              onChange={handleInputChange}
              {...settings.renameBooks}
            />
          </FormGroup>

          <FormGroup size={sizes.MEDIUM}>
            <FormLabel>{translate('ReplaceIllegalCharacters')}</FormLabel>

            <FormInputGroup
              type={inputTypes.CHECK}
              name="replaceIllegalCharacters"
              helpText={translate('ReplaceIllegalCharactersHelpText')}
              onChange={handleInputChange}
              {...settings.replaceIllegalCharacters}
            />
          </FormGroup>

          {replaceIllegalCharacters ? (
            <FormGroup>
              <FormLabel>{translate('ColonReplacement')}</FormLabel>

              <FormInputGroup
                type={inputTypes.SELECT}
                name="colonReplacementFormat"
                values={colonReplacementOptions}
                onChange={handleInputChange}
                {...settings.colonReplacementFormat}
              />
            </FormGroup>
          ) : null}

          {renameBooks ? (
            <FormGroup size={sizes.LARGE}>
              <FormLabel>{translate('StandardBookFormat')}</FormLabel>

              <FormInputGroup
                inputClassName={styles.namingInput}
                type={inputTypes.TEXT}
                name="standardBookFormat"
                buttons={
                  <FormInputButton
                    aria-label={translate('FileNameTokens')}
                    onPress={handleStandardNamingModalOpenClick}
                  >
                    ?
                  </FormInputButton>
                }
                onChange={handleInputChange}
                {...settings.standardBookFormat}
                helpTexts={standardBookFormatHelpTexts}
                errors={[
                  ...standardBookFormatErrors,
                  ...settings.standardBookFormat.errors,
                ]}
              />
            </FormGroup>
          ) : null}

          <FormGroup advancedSettings={advancedSettings} isAdvanced={true}>
            <FormLabel>{translate('AuthorFolderFormat')}</FormLabel>

            <FormInputGroup
              inputClassName={styles.namingInput}
              type={inputTypes.TEXT}
              name="authorFolderFormat"
              buttons={
                <FormInputButton
                  aria-label={translate('FolderNameTokens')}
                  onPress={handleAuthorFolderNamingModalOpenClick}
                >
                  ?
                </FormInputButton>
              }
              onChange={handleInputChange}
              {...settings.authorFolderFormat}
              helpTexts={[
                'Used when adding a new author or moving an author via the author editor',
                ...authorFolderFormatHelpTexts,
              ]}
              errors={[
                ...authorFolderFormatErrors,
                ...settings.authorFolderFormat.errors,
              ]}
            />
          </FormGroup>

          {namingModalOptions ? (
            <NamingModal
              isOpen={isNamingModalOpen}
              advancedSettings={advancedSettings}
              {...namingModalOptions}
              value={settings[namingModalOptions.name].value}
              onInputChange={handleInputChange}
              onModalClose={setNamingModalClosed}
            />
          ) : null}
        </Form>
      ) : null}
    </FieldSet>
  );
}

export default Naming;
