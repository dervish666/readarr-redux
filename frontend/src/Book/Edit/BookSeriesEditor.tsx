import React from 'react';
import { BookSeriesOption } from 'Book/Book';
import SelectInput from 'Components/Form/SelectInput';
import TextInput from 'Components/Form/TextInput';
import Button from 'Components/Link/Button';
import IconButton from 'Components/Link/IconButton';
import { icons, kinds, sizes } from 'Helpers/Props';
import { InputChanged } from 'typings/inputs';
import translate from 'Utilities/String/translate';
import styles from './BookSeriesEditor.module.css';

export const NEW_SERIES = 'new';

// One row of the book's series as the user edits it (PR #20): an existing series, or
// NEW_SERIES with a title for a series of the user's own (saved as a local: series).
export interface BookSeriesRow {
  seriesId: number | typeof NEW_SERIES;
  newSeriesTitle: string;
  seriesTitle?: string;
  position?: string;
  isManual: boolean;
}

interface BookSeriesEditorProps {
  series: BookSeriesRow[];
  availableSeries: BookSeriesOption[];
  onChange: (series: BookSeriesRow[]) => void;
}

// The series a book is in, edited as a list of rows: a series (or a new one by name)
// and the book's position in it
function BookSeriesEditor({
  series,
  availableSeries,
  onChange,
}: BookSeriesEditorProps) {
  const update = (index: number, changes: Partial<BookSeriesRow>) => {
    onChange(
      series.map((row, i) => (i === index ? { ...row, ...changes } : row))
    );
  };

  const remove = (index: number) => {
    onChange(series.filter((_row, i) => i !== index));
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
        isManual: true,
      },
    ]);
  };

  return (
    <div>
      {series.map((row, index) => {
        const used = series
          .filter((_r, i) => i !== index)
          .map((r) => r.seriesId);

        const values = [
          ...availableSeries
            .filter((s) => !used.includes(s.id))
            .map((s) => ({ key: s.id, value: s.title })),
          { key: NEW_SERIES, value: translate('NewSeries') },
        ];

        return (
          <div key={index} className={styles.row}>
            <div className={styles.series}>
              <SelectInput
                name={`series${index}`}
                value={row.seriesId}
                values={values}
                onChange={({ value }: InputChanged<string>) =>
                  update(index, {
                    seriesId:
                      value === NEW_SERIES ? NEW_SERIES : parseInt(value),
                  })
                }
              />

              {row.seriesId === NEW_SERIES ? (
                <TextInput
                  className={styles.newSeries}
                  name={`newSeries${index}`}
                  value={row.newSeriesTitle || ''}
                  placeholder={translate('NewSeriesTitle')}
                  onChange={({ value }: InputChanged<string>) =>
                    update(index, { newSeriesTitle: value })
                  }
                />
              ) : null}
            </div>

            <TextInput
              className={styles.position}
              name={`position${index}`}
              value={row.position || ''}
              placeholder="#"
              onChange={({ value }: InputChanged<string>) =>
                update(index, { position: value })
              }
            />

            <span
              className={styles.source}
              title={
                row.isManual
                  ? translate('SeriesLinkManualHelpText')
                  : translate('SeriesLinkSourceHelpText')
              }
            >
              {row.isManual
                ? translate('SeriesLinkManual')
                : translate('SeriesLinkSource')}
            </span>

            <IconButton
              name={icons.REMOVE}
              kind={kinds.DANGER}
              title={translate('RemoveFromSeries')}
              aria-label={translate('RemoveFromSeries')}
              onPress={() => remove(index)}
            />
          </div>
        );
      })}

      <Button size={sizes.SMALL} onPress={add}>
        {translate('AddToSeries')}
      </Button>
    </div>
  );
}

export default BookSeriesEditor;
