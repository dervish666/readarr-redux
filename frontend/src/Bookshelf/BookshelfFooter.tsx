import React, { useCallback, useState } from 'react';
import { AuthorMonitor, NewItemMonitorType } from 'Author/Author';
import MonitorBooksSelectInput from 'Components/Form/MonitorBooksSelectInput';
import MonitorNewItemsSelectInput from 'Components/Form/MonitorNewItemsSelectInput';
import SelectInput from 'Components/Form/SelectInput';
import SpinnerButton from 'Components/Link/SpinnerButton';
import PageContentFooter from 'Components/Page/PageContentFooter';
import { kinds } from 'Helpers/Props';
import { InputChanged } from 'typings/inputs';
import translate from 'Utilities/String/translate';
import styles from './BookshelfFooter.css';

const NO_CHANGE = 'noChange';

export interface BookshelfChanges {
  monitored?: boolean;
  monitor?: AuthorMonitor;
  monitorNewItems?: NewItemMonitorType;
}

interface BookshelfFooterProps {
  selectedCount: number;
  isSaving: boolean;
  onUpdateSelectedPress: (changes: BookshelfChanges) => void;
}

// The pending choices reset when the parent remounts the footer after a save.
function BookshelfFooter({
  selectedCount,
  isSaving,
  onUpdateSelectedPress,
}: BookshelfFooterProps) {
  const [monitored, setMonitored] = useState(NO_CHANGE);
  const [monitor, setMonitor] = useState(NO_CHANGE);
  const [monitorNewItems, setMonitorNewItems] = useState(NO_CHANGE);

  const handleInputChange = useCallback(({ name, value }: InputChanged) => {
    const setter = {
      monitored: setMonitored,
      monitor: setMonitor,
      monitorNewItems: setMonitorNewItems,
    }[name];

    setter?.(value as string);
  }, []);

  const handleUpdateSelectedPress = useCallback(() => {
    const changes: BookshelfChanges = {};

    if (monitored !== NO_CHANGE) {
      changes.monitored = monitored === 'monitored';
    }

    if (monitor !== NO_CHANGE) {
      changes.monitor = monitor as AuthorMonitor;
    }

    if (monitorNewItems !== NO_CHANGE) {
      changes.monitorNewItems = monitorNewItems as NewItemMonitorType;
    }

    onUpdateSelectedPress(changes);
  }, [monitored, monitor, monitorNewItems, onUpdateSelectedPress]);

  const monitoredOptions = [
    { key: NO_CHANGE, value: translate('NoChange'), isDisabled: true },
    { key: 'monitored', value: translate('Monitored') },
    { key: 'unmonitored', value: translate('Unmonitored') },
  ];

  const noChanges =
    monitored === NO_CHANGE &&
    monitor === NO_CHANGE &&
    monitorNewItems === NO_CHANGE;

  return (
    <PageContentFooter>
      <div className={styles.inputContainer}>
        <div className={styles.label}>{translate('MonitorAuthor')}</div>

        <SelectInput
          name="monitored"
          value={monitored}
          values={monitoredOptions}
          isDisabled={!selectedCount}
          onChange={handleInputChange}
        />
      </div>

      <div className={styles.inputContainer}>
        <div className={styles.label}>{translate('MonitorExistingBooks')}</div>

        <MonitorBooksSelectInput
          name="monitor"
          value={monitor}
          includeNoChange={true}
          isDisabled={!selectedCount}
          onChange={handleInputChange}
        />
      </div>

      <div className={styles.inputContainer}>
        <div className={styles.label}>{translate('MonitorNewBooks')}</div>

        <MonitorNewItemsSelectInput
          name="monitorNewItems"
          value={monitorNewItems}
          includeNoChange={true}
          isDisabled={!selectedCount}
          onChange={handleInputChange}
        />
      </div>

      <div>
        <div className={styles.label}>
          {translate('CountAuthorsSelected', { selectedCount })}
        </div>

        <SpinnerButton
          className={styles.updateSelectedButton}
          kind={kinds.PRIMARY}
          isSpinning={isSaving}
          isDisabled={!selectedCount || noChanges}
          onPress={handleUpdateSelectedPress}
        >
          {translate('UpdateSelected')}
        </SpinnerButton>
      </div>
    </PageContentFooter>
  );
}

export default BookshelfFooter;
