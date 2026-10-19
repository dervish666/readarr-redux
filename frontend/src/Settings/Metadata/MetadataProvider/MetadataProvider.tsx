import React, { useCallback } from 'react';
import Alert from 'Components/Alert';
import FieldSet from 'Components/FieldSet';
import Form from 'Components/Form/Form';
import FormGroup from 'Components/Form/FormGroup';
import FormInputGroup from 'Components/Form/FormInputGroup';
import FormLabel from 'Components/Form/FormLabel';
import LoadingIndicator from 'Components/Loading/LoadingIndicator';
import { inputTypes, kinds } from 'Helpers/Props';
import { PendingSection } from 'typings/pending';
import { ApiError } from 'Utilities/Fetch/fetchJson';
import translate from 'Utilities/String/translate';
import { MetadataProviderSettingsModel } from './useMetadataProviderSettings';

const writeAudioTagOptions = [
  {
    key: 'no',
    get value() {
      return translate('WriteTagsNo');
    },
  },
  {
    key: 'sync',
    get value() {
      return translate('WriteTagsSync');
    },
  },
  {
    key: 'allFiles',
    get value() {
      return translate('WriteTagsAll');
    },
  },
  {
    key: 'newFiles',
    get value() {
      return translate('WriteTagsNew');
    },
  },
];

const writeBookTagOptions = [
  {
    key: 'sync',
    get value() {
      return translate('WriteTagsSync');
    },
  },
  {
    key: 'allFiles',
    get value() {
      return translate('WriteTagsAll');
    },
  },
  {
    key: 'newFiles',
    get value() {
      return translate('WriteTagsNew');
    },
  },
];

interface MetadataProviderProps {
  isFetched: boolean;
  error: ApiError | null;
  settings: PendingSection<MetadataProviderSettingsModel>;
  hasSettings: boolean;
  onSettingChange: <K extends keyof MetadataProviderSettingsModel>(
    key: K,
    value: MetadataProviderSettingsModel[K]
  ) => void;
}

function MetadataProvider({
  isFetched,
  error,
  settings,
  hasSettings,
  onSettingChange,
}: MetadataProviderProps) {
  const handleInputChange = useCallback(
    ({ name, value }: { name: string; value: unknown }) => {
      onSettingChange(
        name as keyof MetadataProviderSettingsModel,
        value as MetadataProviderSettingsModel[keyof MetadataProviderSettingsModel]
      );
    },
    [onSettingChange]
  );

  if (!isFetched) {
    return <LoadingIndicator />;
  }

  if (error) {
    return (
      <Alert kind={kinds.DANGER}>
        {translate('UnableToLoadMetadataProviderSettings')}
      </Alert>
    );
  }

  if (!hasSettings) {
    return null;
  }

  return (
    <Form>
      <FieldSet legend={translate('CalibreMetadata')}>
        <FormGroup>
          <FormLabel>{translate('SendMetadataToCalibre')}</FormLabel>

          <FormInputGroup
            type={inputTypes.SELECT}
            name="writeBookTags"
            helpTextWarning={translate('WriteBookTagsHelpTextWarning')}
            helpLink="https://wiki.servarr.com/readarr/settings#write-metadata-to-book-files"
            values={writeBookTagOptions}
            onChange={handleInputChange}
            {...settings.writeBookTags}
          />
        </FormGroup>

        <FormGroup>
          <FormLabel>{translate('UpdateCovers')}</FormLabel>

          <FormInputGroup
            type={inputTypes.CHECK}
            name="updateCovers"
            helpText={translate('UpdateCoversHelpText')}
            onChange={handleInputChange}
            {...settings.updateCovers}
          />
        </FormGroup>

        <FormGroup>
          <FormLabel>{translate('EmbedMetadataInBookFiles')}</FormLabel>

          <FormInputGroup
            type={inputTypes.CHECK}
            name="embedMetadata"
            helpText={translate('EmbedMetadataHelpText')}
            onChange={handleInputChange}
            {...settings.embedMetadata}
          />
        </FormGroup>
      </FieldSet>

      <FieldSet legend={translate('AudioFileMetadata')}>
        <FormGroup>
          <FormLabel>{translate('WriteAudioTags')}</FormLabel>

          <FormInputGroup
            type={inputTypes.SELECT}
            name="writeAudioTags"
            helpTextWarning={translate('WriteBookTagsHelpTextWarning')}
            helpLink="https://wiki.servarr.com/readarr/settings#write-metadata-to-audio-files"
            values={writeAudioTagOptions}
            onChange={handleInputChange}
            {...settings.writeAudioTags}
          />
        </FormGroup>

        <FormGroup>
          <FormLabel>{translate('WriteAudioTagsScrub')}</FormLabel>

          <FormInputGroup
            type={inputTypes.CHECK}
            name="scrubAudioTags"
            helpTextWarning={translate('WriteAudioTagsScrubHelp')}
            onChange={handleInputChange}
            {...settings.scrubAudioTags}
          />
        </FormGroup>
      </FieldSet>
    </Form>
  );
}

export default MetadataProvider;
