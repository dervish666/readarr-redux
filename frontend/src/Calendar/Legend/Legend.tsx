import React from 'react';
import { useCalendarOption } from 'Calendar/calendarOptionsStore';
import { icons, kinds } from 'Helpers/Props';
import translate from 'Utilities/String/translate';
import LegendItem from './LegendItem';
import styles from './Legend.css';

function Legend() {
  const showCutoffUnmetIcon = useCalendarOption('showCutoffUnmetIcon');

  return (
    <div className={styles.legend}>
      <div>
        <LegendItem
          status="downloading"
          name={translate('Downloading')}
          tooltip={translate('CalendarLegendBookDownloadingTooltip')}
        />

        <LegendItem
          status="downloaded"
          name={translate('Downloaded')}
          tooltip={translate('CalendarLegendBookDownloadedTooltip')}
        />
      </div>

      <div>
        <LegendItem
          status="unreleased"
          name={translate('Unreleased')}
          tooltip={translate('CalendarLegendBookUnreleasedTooltip')}
        />

        <LegendItem
          status="partial"
          name={translate('Partial')}
          tooltip={translate('CalendarLegendBookPartialTooltip')}
        />
      </div>

      <div>
        <LegendItem
          status="unmonitored"
          name={translate('Unmonitored')}
          tooltip={translate('CalendarLegendBookUnmonitoredTooltip')}
        />

        <LegendItem
          status="missing"
          name={translate('Missing')}
          tooltip={translate('CalendarLegendBookMissingTooltip')}
        />
      </div>

      {showCutoffUnmetIcon ? (
        <div>
          <LegendItem
            name={translate('CutoffNotMet')}
            icon={icons.TRACK_FILE}
            kind={kinds.WARNING}
            tooltip={translate('QualityCutoffNotMet')}
          />
        </div>
      ) : null}
    </div>
  );
}

export default Legend;
