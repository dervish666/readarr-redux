import PropTypes from 'prop-types';
import React from 'react';
import SelectInput from 'Components/Form/SelectInput';
import TextInput from 'Components/Form/TextInput';
import Button from 'Components/Link/Button';
import IconButton from 'Components/Link/IconButton';
import { icons, kinds, sizes } from 'Helpers/Props';
import translate from 'Utilities/String/translate';
import styles from './BookSeriesEditor.css';

export const NEW_SERIES = 'new';

// The series a book is in, edited as a list of rows: a series (or a new one by name) and the book's position in it
function BookSeriesEditor(props) {
  const {
    series,
    availableSeries,
    onChange
  } = props;

  const update = (index, changes) => {
    onChange(series.map((row, i) => (i === index ? { ...row, ...changes } : row)));
  };

  const remove = (index) => {
    onChange(series.filter((row, i) => i !== index));
  };

  const add = () => {
    const used = series.map((row) => row.seriesId);
    const first = availableSeries.find((s) => !used.includes(s.id));

    onChange([
      ...series,
      {
        seriesId: first ? first.id : NEW_SERIES,
        newSeriesTitle: '',
        position: '',
        isManual: true
      }
    ]);
  };

  return (
    <div>
      {
        series.map((row, index) => {
          const used = series.filter((r, i) => i !== index).map((r) => r.seriesId);

          const values = [
            ...availableSeries
              .filter((s) => !used.includes(s.id))
              .map((s) => ({ key: s.id, value: s.title })),
            { key: NEW_SERIES, value: translate('NewSeries') }
          ];

          return (
            <div
              key={index}
              className={styles.row}
            >
              <div className={styles.series}>
                <SelectInput
                  name={`series${index}`}
                  value={row.seriesId}
                  values={values}
                  onChange={({ value }) => update(index, { seriesId: value === NEW_SERIES ? NEW_SERIES : parseInt(value) })}
                />

                {
                  row.seriesId === NEW_SERIES &&
                    <TextInput
                      className={styles.newSeries}
                      name={`newSeries${index}`}
                      value={row.newSeriesTitle || ''}
                      placeholder={translate('NewSeriesTitle')}
                      onChange={({ value }) => update(index, { newSeriesTitle: value })}
                    />
                }
              </div>

              <TextInput
                className={styles.position}
                name={`position${index}`}
                value={row.position || ''}
                placeholder="#"
                onChange={({ value }) => update(index, { position: value })}
              />

              <span
                className={styles.source}
                title={row.isManual ? translate('SeriesLinkManualHelpText') : translate('SeriesLinkSourceHelpText')}
              >
                {row.isManual ? translate('SeriesLinkManual') : translate('SeriesLinkSource')}
              </span>

              <IconButton
                name={icons.REMOVE}
                kind={kinds.DANGER}
                title={translate('RemoveFromSeries')}
                onPress={() => remove(index)}
              />
            </div>
          );
        })
      }

      <Button
        size={sizes.SMALL}
        onPress={add}
      >
        {translate('AddToSeries')}
      </Button>
    </div>
  );
}

BookSeriesEditor.propTypes = {
  series: PropTypes.arrayOf(PropTypes.object).isRequired,
  availableSeries: PropTypes.arrayOf(PropTypes.object).isRequired,
  onChange: PropTypes.func.isRequired
};

export default BookSeriesEditor;
