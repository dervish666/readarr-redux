import React, { useCallback } from 'react';
import Alert from 'Components/Alert';
import FieldSet from 'Components/FieldSet';
import Form from 'Components/Form/Form';
import FormGroup from 'Components/Form/FormGroup';
import FormInputGroup from 'Components/Form/FormInputGroup';
import FormLabel from 'Components/Form/FormLabel';
import LoadingIndicator from 'Components/Loading/LoadingIndicator';
import { inputTypes, kinds, sizes } from 'Helpers/Props';
import { PendingSection } from 'typings/pending';
import { ApiError } from 'Utilities/Fetch/fetchJson';
import translate from 'Utilities/String/translate';
import { DownloadClientSettingsModel } from './useDownloadClientSettings';

interface DownloadClientOptionsProps {
  advancedSettings: boolean;
  isFetched: boolean;
  error: ApiError | null;
  settings: PendingSection<DownloadClientSettingsModel>;
  hasSettings: boolean;
  onSettingChange: <K extends keyof DownloadClientSettingsModel>(
    key: K,
    value: DownloadClientSettingsModel[K]
  ) => void;
}

// Every option here is advanced, so the section only shows with advanced settings.
function DownloadClientOptions({
  advancedSettings,
  isFetched,
  error,
  settings,
  hasSettings,
  onSettingChange,
}: DownloadClientOptionsProps) {
  const handleInputChange = useCallback(
    ({ name, value }: { name: string; value: unknown }) => {
      onSettingChange(
        name as keyof DownloadClientSettingsModel,
        value as DownloadClientSettingsModel[keyof DownloadClientSettingsModel]
      );
    },
    [onSettingChange]
  );

  return (
    <div>
      {isFetched ? null : <LoadingIndicator />}

      {isFetched && error ? (
        <Alert kind={kinds.DANGER}>
          {translate('UnableToLoadDownloadClientOptions')}
        </Alert>
      ) : null}

      {hasSettings && isFetched && !error && advancedSettings ? (
        <div>
          <FieldSet legend={translate('CompletedDownloadHandling')}>
            <Form>
              <FormGroup
                advancedSettings={advancedSettings}
                isAdvanced={true}
                size={sizes.MEDIUM}
              >
                <FormLabel>{translate('Enable')}</FormLabel>

                <FormInputGroup
                  type={inputTypes.CHECK}
                  name="enableCompletedDownloadHandling"
                  helpText={translate(
                    'EnableCompletedDownloadHandlingHelpText'
                  )}
                  onChange={handleInputChange}
                  {...settings.enableCompletedDownloadHandling}
                />
              </FormGroup>
            </Form>
          </FieldSet>

          <FieldSet legend={translate('FailedDownloadHandling')}>
            <Form>
              <FormGroup
                advancedSettings={advancedSettings}
                isAdvanced={true}
                size={sizes.MEDIUM}
              >
                <FormLabel>{translate('AutoRedownloadFailed')}</FormLabel>

                <FormInputGroup
                  type={inputTypes.CHECK}
                  name="autoRedownloadFailed"
                  helpText={translate('AutoRedownloadFailedHelpText')}
                  onChange={handleInputChange}
                  {...settings.autoRedownloadFailed}
                />
              </FormGroup>

              {settings.autoRedownloadFailed.value ? (
                <FormGroup
                  advancedSettings={advancedSettings}
                  isAdvanced={true}
                  size={sizes.MEDIUM}
                >
                  <FormLabel>
                    {translate('AutoRedownloadFailedFromInteractiveSearch')}
                  </FormLabel>

                  <FormInputGroup
                    type={inputTypes.CHECK}
                    name="autoRedownloadFailedFromInteractiveSearch"
                    helpText={translate(
                      'AutoRedownloadFailedFromInteractiveSearchHelpText'
                    )}
                    onChange={handleInputChange}
                    {...settings.autoRedownloadFailedFromInteractiveSearch}
                  />
                </FormGroup>
              ) : null}
            </Form>

            <Alert kind={kinds.INFO}>{translate('RemoveDownloadsAlert')}</Alert>
          </FieldSet>
        </div>
      ) : null}
    </div>
  );
}

export default DownloadClientOptions;
