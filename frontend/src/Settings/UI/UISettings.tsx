import React, { useCallback, useMemo } from 'react';
import Alert from 'Components/Alert';
import FieldSet from 'Components/FieldSet';
import Form from 'Components/Form/Form';
import FormGroup from 'Components/Form/FormGroup';
import FormInputGroup from 'Components/Form/FormInputGroup';
import FormLabel from 'Components/Form/FormLabel';
import LoadingIndicator from 'Components/Loading/LoadingIndicator';
import PageContent from 'Components/Page/PageContent';
import PageContentBody from 'Components/Page/PageContentBody';
import PageHeading from 'Components/Page/PageHeading';
import { inputTypes, kinds } from 'Helpers/Props';
import useLanguages from 'Language/useLanguages';
import SettingsToolbar from 'Settings/SettingsToolbar';
import translate from 'Utilities/String/translate';
import { UiSettingsModel, useManageUiSettings } from './useUiSettings';

const themeOptions = [
  {
    key: 'auto',
    get value() {
      return translate('Auto');
    },
  },
  {
    key: 'dark',
    get value() {
      return translate('Dark');
    },
  },
  {
    key: 'light',
    get value() {
      return translate('Light');
    },
  },
];

const headerColorOptions = [
  {
    key: 'fullColor',
    get value() {
      return translate('FullColor');
    },
  },
  {
    key: 'gradient',
    get value() {
      return translate('Gradient');
    },
  },
];

export const firstDayOfWeekOptions = [
  { key: 0, value: 'Sunday' },
  { key: 1, value: 'Monday' },
];

export const weekColumnOptions = [
  { key: 'ddd M/D', value: 'Tue 3/25', hint: 'ddd M/D' },
  { key: 'ddd MM/DD', value: 'Tue 03/25', hint: 'ddd MM/DD' },
  { key: 'ddd D/M', value: 'Tue 25/3', hint: 'ddd D/M' },
  { key: 'ddd DD/MM', value: 'Tue 25/03', hint: 'ddd DD/MM' },
];

const shortDateFormatOptions = [
  { key: 'MMM D YYYY', value: 'Mar 25 2014', hint: 'MMM D YYYY' },
  { key: 'DD MMM YYYY', value: '25 Mar 2014', hint: 'DD MMM YYYY' },
  { key: 'MM/D/YYYY', value: '03/25/2014', hint: 'MM/D/YYYY' },
  { key: 'MM/DD/YYYY', value: '03/25/2014', hint: 'MM/DD/YYYY' },
  { key: 'DD/MM/YYYY', value: '25/03/2014', hint: 'DD/MM/YYYY' },
  { key: 'YYYY-MM-DD', value: '2014-03-25', hint: 'YYYY-MM-DD' },
];

const longDateFormatOptions = [
  { key: 'dddd, MMMM D YYYY', value: 'Tuesday, March 25, 2014' },
  { key: 'dddd, D MMMM YYYY', value: 'Tuesday, 25 March, 2014' },
];

export const timeFormatOptions = [
  { key: 'h(:mm)a', value: '5pm/5:30pm' },
  { key: 'HH:mm', value: '17:00/17:30' },
];

// The language list without the entries a UI can't be shown in.
const HIDDEN_LANGUAGES = ['Any', 'Unknown', 'Original'];

function UISettings() {
  const { data: languages } = useLanguages();

  const {
    settings,
    hasSettings,
    hasPendingChanges,
    validationErrors,
    validationWarnings,
    isFetching,
    isFetched,
    isSaving,
    error,
    updateSetting,
    saveSettings,
  } = useManageUiSettings();

  const uiLanguages = useMemo(() => {
    return languages
      .filter((language) => !HIDDEN_LANGUAGES.includes(language.name))
      .map((language) => ({ key: language.id, value: language.name }));
  }, [languages]);

  const handleInputChange = useCallback(
    ({ name, value }: { name: string; value: unknown }) => {
      updateSetting(
        name as keyof UiSettingsModel,
        value as UiSettingsModel[keyof UiSettingsModel]
      );
    },
    [updateSetting]
  );

  const uiLanguageErrors = useMemo(() => {
    if (!hasSettings) {
      return [];
    }

    const { uiLanguage } = settings;

    return uiLanguages.some((language) => language.key === uiLanguage.value)
      ? uiLanguage.errors
      : [...uiLanguage.errors, { message: translate('InvalidUILanguage') }];
  }, [hasSettings, settings, uiLanguages]);

  return (
    <PageContent title={translate('UISettings')}>
      <SettingsToolbar
        isSaving={isSaving}
        hasPendingChanges={hasPendingChanges}
        onSavePress={saveSettings}
      />

      <PageContentBody>
        <PageHeading scope={translate('Settings')} title={translate('Ui')} />

        {isFetching && !isFetched ? <LoadingIndicator /> : null}

        {isFetched && error ? (
          <Alert kind={kinds.DANGER}>
            {translate('UnableToLoadUISettings')}
          </Alert>
        ) : null}

        {hasSettings && isFetched && !error ? (
          <Form
            validationErrors={validationErrors}
            validationWarnings={validationWarnings}
          >
            <FieldSet legend={translate('Calendar')}>
              <FormGroup>
                <FormLabel>{translate('FirstDayOfWeek')}</FormLabel>

                <FormInputGroup
                  type={inputTypes.SELECT}
                  name="firstDayOfWeek"
                  values={firstDayOfWeekOptions}
                  onChange={handleInputChange}
                  {...settings.firstDayOfWeek}
                />
              </FormGroup>

              <FormGroup>
                <FormLabel>{translate('WeekColumnHeader')}</FormLabel>

                <FormInputGroup
                  type={inputTypes.SELECT}
                  name="calendarWeekColumnHeader"
                  values={weekColumnOptions}
                  helpText={translate('CalendarWeekColumnHeaderHelpText')}
                  onChange={handleInputChange}
                  {...settings.calendarWeekColumnHeader}
                />
              </FormGroup>
            </FieldSet>

            <FieldSet legend={translate('Dates')}>
              <FormGroup>
                <FormLabel>{translate('ShortDateFormat')}</FormLabel>

                <FormInputGroup
                  type={inputTypes.SELECT}
                  name="shortDateFormat"
                  values={shortDateFormatOptions}
                  onChange={handleInputChange}
                  {...settings.shortDateFormat}
                />
              </FormGroup>

              <FormGroup>
                <FormLabel>{translate('LongDateFormat')}</FormLabel>

                <FormInputGroup
                  type={inputTypes.SELECT}
                  name="longDateFormat"
                  values={longDateFormatOptions}
                  onChange={handleInputChange}
                  {...settings.longDateFormat}
                />
              </FormGroup>

              <FormGroup>
                <FormLabel>{translate('TimeFormat')}</FormLabel>

                <FormInputGroup
                  type={inputTypes.SELECT}
                  name="timeFormat"
                  values={timeFormatOptions}
                  onChange={handleInputChange}
                  {...settings.timeFormat}
                />
              </FormGroup>

              <FormGroup>
                <FormLabel>{translate('ShowRelativeDates')}</FormLabel>

                <FormInputGroup
                  type={inputTypes.CHECK}
                  name="showRelativeDates"
                  helpText={translate('ShowRelativeDatesHelpText')}
                  onChange={handleInputChange}
                  {...settings.showRelativeDates}
                />
              </FormGroup>
            </FieldSet>

            <FieldSet legend={translate('Style')}>
              <FormGroup>
                <FormLabel>{translate('Theme')}</FormLabel>

                <FormInputGroup
                  type={inputTypes.SELECT}
                  name="theme"
                  helpText={translate('ThemeHelpText')}
                  values={themeOptions}
                  onChange={handleInputChange}
                  {...settings.theme}
                />
              </FormGroup>

              <FormGroup>
                <FormLabel>{translate('HeaderColor')}</FormLabel>

                <FormInputGroup
                  type={inputTypes.SELECT}
                  name="headerColor"
                  helpText={translate('HeaderColorHelpText')}
                  values={headerColorOptions}
                  onChange={handleInputChange}
                  {...settings.headerColor}
                />
              </FormGroup>

              <FormGroup>
                <FormLabel>{translate('EnableColorImpairedMode')}</FormLabel>

                <FormInputGroup
                  type={inputTypes.CHECK}
                  name="enableColorImpairedMode"
                  helpText={translate('EnableColorImpairedModeHelpText')}
                  onChange={handleInputChange}
                  {...settings.enableColorImpairedMode}
                />
              </FormGroup>
            </FieldSet>

            <FieldSet legend={translate('Language')}>
              <FormGroup>
                <FormLabel>{translate('UILanguage')}</FormLabel>

                <FormInputGroup
                  type={inputTypes.SELECT}
                  name="uiLanguage"
                  values={uiLanguages}
                  helpText={translate('UILanguageHelpText')}
                  helpTextWarning={translate('UILanguageHelpTextWarning')}
                  onChange={handleInputChange}
                  {...settings.uiLanguage}
                  errors={uiLanguageErrors}
                />
              </FormGroup>
            </FieldSet>
          </Form>
        ) : null}
      </PageContentBody>
    </PageContent>
  );
}

export default UISettings;
