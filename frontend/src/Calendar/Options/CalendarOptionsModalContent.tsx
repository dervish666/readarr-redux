import React, { useCallback, useEffect, useState } from 'react';
import {
  CalendarOptions,
  setCalendarOption,
  useCalendarOptions,
} from 'Calendar/calendarOptionsStore';
import FieldSet from 'Components/FieldSet';
import Form from 'Components/Form/Form';
import FormGroup from 'Components/Form/FormGroup';
import FormInputGroup from 'Components/Form/FormInputGroup';
import FormLabel from 'Components/Form/FormLabel';
import Button from 'Components/Link/Button';
import ModalBody from 'Components/Modal/ModalBody';
import ModalContent from 'Components/Modal/ModalContent';
import ModalFooter from 'Components/Modal/ModalFooter';
import ModalHeader from 'Components/Modal/ModalHeader';
import { inputTypes } from 'Helpers/Props';
import {
  firstDayOfWeekOptions,
  timeFormatOptions,
  weekColumnOptions,
} from 'Settings/UI/UISettings';
import {
  UiSettingsModel,
  useSaveUiSettings,
  useUiSettingsValues,
} from 'Settings/UI/useUiSettings';
import { InputChanged } from 'typings/inputs';
import translate from 'Utilities/String/translate';

type GlobalOptions = Pick<
  UiSettingsModel,
  | 'firstDayOfWeek'
  | 'calendarWeekColumnHeader'
  | 'timeFormat'
  | 'enableColorImpairedMode'
>;

interface CalendarOptionsModalContentProps {
  onModalClose: () => void;
}

// Local options live in the calendar's zustand store; the global ones are UI settings,
// saved at once through react-query (which also copies them into the redux feed).
function CalendarOptionsModalContent({
  onModalClose,
}: CalendarOptionsModalContentProps) {
  const { collapseMultipleBooks, showCutoffUnmetIcon } = useCalendarOptions();
  const {
    firstDayOfWeek,
    calendarWeekColumnHeader,
    timeFormat,
    enableColorImpairedMode,
  } = useUiSettingsValues();
  const saveUiSettings = useSaveUiSettings();

  const [state, setState] = useState<GlobalOptions>({
    firstDayOfWeek,
    calendarWeekColumnHeader,
    timeFormat,
    enableColorImpairedMode,
  });

  useEffect(() => {
    setState({
      firstDayOfWeek,
      calendarWeekColumnHeader,
      timeFormat,
      enableColorImpairedMode,
    });
  }, [
    firstDayOfWeek,
    calendarWeekColumnHeader,
    timeFormat,
    enableColorImpairedMode,
  ]);

  const handleOptionInputChange = useCallback(
    ({ name, value }: InputChanged) => {
      setCalendarOption(
        name as keyof CalendarOptions,
        value as CalendarOptions[keyof CalendarOptions]
      );
    },
    []
  );

  const handleGlobalInputChange = useCallback(
    ({ name, value }: InputChanged) => {
      const setting = { [name]: value } as Partial<GlobalOptions>;

      setState((prevState) => ({ ...prevState, ...setting }));
      saveUiSettings(setting);
    },
    [saveUiSettings]
  );

  return (
    <ModalContent onModalClose={onModalClose}>
      <ModalHeader>{translate('CalendarOptions')}</ModalHeader>

      <ModalBody>
        <FieldSet legend={translate('Local')}>
          <Form>
            <FormGroup>
              <FormLabel>{translate('CollapseMultipleBooks')}</FormLabel>

              <FormInputGroup
                type={inputTypes.CHECK}
                name="collapseMultipleBooks"
                value={collapseMultipleBooks}
                helpText={translate('CollapseMultipleBooksHelpText')}
                onChange={handleOptionInputChange}
              />
            </FormGroup>

            <FormGroup>
              <FormLabel>{translate('IconForCutoffUnmet')}</FormLabel>

              <FormInputGroup
                type={inputTypes.CHECK}
                name="showCutoffUnmetIcon"
                value={showCutoffUnmetIcon}
                helpText={translate('ShowCutoffUnmetIconHelpText')}
                onChange={handleOptionInputChange}
              />
            </FormGroup>
          </Form>
        </FieldSet>

        <FieldSet legend={translate('Global')}>
          <Form>
            <FormGroup>
              <FormLabel>{translate('FirstDayOfWeek')}</FormLabel>

              <FormInputGroup
                type={inputTypes.SELECT}
                name="firstDayOfWeek"
                values={firstDayOfWeekOptions}
                value={state.firstDayOfWeek}
                onChange={handleGlobalInputChange}
              />
            </FormGroup>

            <FormGroup>
              <FormLabel>{translate('WeekColumnHeader')}</FormLabel>

              <FormInputGroup
                type={inputTypes.SELECT}
                name="calendarWeekColumnHeader"
                values={weekColumnOptions}
                value={state.calendarWeekColumnHeader}
                helpText={translate(
                  'ShownAboveEachColumnWhenWeekIsTheActiveView'
                )}
                onChange={handleGlobalInputChange}
              />
            </FormGroup>

            <FormGroup>
              <FormLabel>{translate('TimeFormat')}</FormLabel>

              <FormInputGroup
                type={inputTypes.SELECT}
                name="timeFormat"
                values={timeFormatOptions}
                value={state.timeFormat}
                onChange={handleGlobalInputChange}
              />
            </FormGroup>

            <FormGroup>
              <FormLabel>{translate('EnableColorImpairedMode')}</FormLabel>

              <FormInputGroup
                type={inputTypes.CHECK}
                name="enableColorImpairedMode"
                value={state.enableColorImpairedMode}
                helpText={translate('EnableColorImpairedModeHelpText')}
                onChange={handleGlobalInputChange}
              />
            </FormGroup>
          </Form>
        </FieldSet>
      </ModalBody>

      <ModalFooter>
        <Button onPress={onModalClose}>{translate('Close')}</Button>
      </ModalFooter>
    </ModalContent>
  );
}

export default CalendarOptionsModalContent;
