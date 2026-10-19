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
import { IndexerSettingsModel } from './useIndexerSettings';

interface IndexerOptionsProps {
  advancedSettings: boolean;
  isFetched: boolean;
  error: ApiError | null;
  settings: PendingSection<IndexerSettingsModel>;
  hasSettings: boolean;
  onSettingChange: <K extends keyof IndexerSettingsModel>(
    key: K,
    value: IndexerSettingsModel[K]
  ) => void;
}

function IndexerOptions({
  advancedSettings,
  isFetched,
  error,
  settings,
  hasSettings,
  onSettingChange,
}: IndexerOptionsProps) {
  const handleInputChange = useCallback(
    ({ name, value }: { name: string; value: unknown }) => {
      onSettingChange(
        name as keyof IndexerSettingsModel,
        value as IndexerSettingsModel[keyof IndexerSettingsModel]
      );
    },
    [onSettingChange]
  );

  return (
    <FieldSet legend={translate('Options')}>
      {isFetched ? null : <LoadingIndicator />}

      {isFetched && error ? (
        <Alert kind={kinds.DANGER}>
          {translate('UnableToLoadIndexerOptions')}
        </Alert>
      ) : null}

      {hasSettings && isFetched && !error ? (
        <Form>
          <FormGroup>
            <FormLabel>{translate('MinimumAge')}</FormLabel>

            <FormInputGroup
              type={inputTypes.NUMBER}
              name="minimumAge"
              min={0}
              unit="minutes"
              helpText={translate('MinimumAgeHelpText')}
              onChange={handleInputChange}
              {...settings.minimumAge}
            />
          </FormGroup>

          <FormGroup>
            <FormLabel>{translate('MaximumSize')}</FormLabel>

            <FormInputGroup
              type={inputTypes.NUMBER}
              name="maximumSize"
              min={0}
              unit="MB"
              helpText={translate('MaximumSizeHelpText')}
              onChange={handleInputChange}
              {...settings.maximumSize}
            />
          </FormGroup>

          <FormGroup>
            <FormLabel>{translate('Retention')}</FormLabel>

            <FormInputGroup
              type={inputTypes.NUMBER}
              name="retention"
              min={0}
              unit="days"
              helpText={translate('RetentionHelpText')}
              onChange={handleInputChange}
              {...settings.retention}
            />
          </FormGroup>

          <FormGroup advancedSettings={advancedSettings} isAdvanced={true}>
            <FormLabel>{translate('RSSSyncInterval')}</FormLabel>

            <FormInputGroup
              type={inputTypes.NUMBER}
              name="rssSyncInterval"
              min={0}
              unit="minutes"
              helpText={translate('RssSyncIntervalHelpText')}
              helpTextWarning={translate(
                'ThisWillApplyToAllIndexersPleaseFollowTheRulesSetForthByThem'
              )}
              helpLink="https://wiki.servarr.com/readarr/faq#how-does-readarr-work"
              onChange={handleInputChange}
              {...settings.rssSyncInterval}
            />
          </FormGroup>
        </Form>
      ) : null}
    </FieldSet>
  );
}

export default IndexerOptions;
