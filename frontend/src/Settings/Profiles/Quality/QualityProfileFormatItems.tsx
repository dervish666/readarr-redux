import { debounce } from 'lodash';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import FormInputHelpText from 'Components/Form/FormInputHelpText';
import Link from 'Components/Link/Link';
import { Failure } from 'typings/pending';
import translate from 'Utilities/String/translate';
import QualityProfileFormatItem from './QualityProfileFormatItem';
import { QualityProfileFormatItem as FormatItemModel } from './useQualityProfiles';
import styles from './QualityProfileFormatItems.css';

// Indexes into the profile's format items, highest score first.
function calcOrder(profileFormatItems: FormatItemModel[]) {
  const indexes = profileFormatItems.reduce<Record<number, number>>(
    (acc, cur, index) => {
      acc[cur.format] = index;
      return acc;
    },
    {}
  );

  return [...profileFormatItems]
    .sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }

      return a.name > b.name ? 1 : -1;
    })
    .map((x) => indexes[x.format]);
}

interface QualityProfileFormatItemsProps {
  profileFormatItems: FormatItemModel[];
  errors?: Failure[];
  warnings?: Failure[];
  onQualityProfileFormatItemScoreChange: (
    formatId: number,
    score: number
  ) => void;
}

function QualityProfileFormatItems({
  profileFormatItems,
  errors = [],
  warnings = [],
  onQualityProfileFormatItemScoreChange,
}: QualityProfileFormatItemsProps) {
  const [order, setOrder] = useState(() => calcOrder(profileFormatItems));
  const itemsRef = useRef(profileFormatItems);
  itemsRef.current = profileFormatItems;

  // Scores save straight away, but the list only re-sorts once typing stops, so
  // the row being edited doesn't jump away from the cursor.
  const reorderItems = useMemo(
    () => debounce(() => setOrder(calcOrder(itemsRef.current)), 1000),
    []
  );

  useEffect(() => () => reorderItems.cancel(), [reorderItems]);

  // A different profile (or a reset) brings a different list of formats.
  const formatCount = profileFormatItems.length;

  useEffect(() => {
    setOrder(calcOrder(itemsRef.current));
  }, [formatCount]);

  const handleScoreChange = useCallback(
    (formatId: number, score: number) => {
      onQualityProfileFormatItemScoreChange(formatId, score);
      reorderItems();
    },
    [onQualityProfileFormatItemScoreChange, reorderItems]
  );

  if (profileFormatItems.length < 1) {
    return (
      <div className={styles.addCustomFormatMessage}>
        {translate('WantMoreControlAddACustomFormat')}{' '}
        <Link to="/settings/customformats">{translate('CustomFormat')}</Link>
      </div>
    );
  }

  return (
    <div>
      <h3 className={styles.heading}>{translate('CustomFormats')}</h3>

      <FormInputHelpText text={translate('CustomFormatScoreHelpText')} />

      {errors.map((error, index) => {
        return (
          <FormInputHelpText
            key={index}
            text={error.message}
            isError={true}
            isCheckInput={false}
          />
        );
      })}

      {warnings.map((warning, index) => {
        return (
          <FormInputHelpText
            key={index}
            text={warning.message}
            isWarning={true}
            isCheckInput={false}
          />
        );
      })}

      <div className={styles.formats}>
        <div className={styles.headerContainer}>
          <div className={styles.headerTitle}>{translate('CustomFormat')}</div>
          <div className={styles.headerScore}>{translate('Score')}</div>
        </div>

        {order.map((index) => {
          const formatItem = profileFormatItems[index];

          if (!formatItem) {
            return null;
          }

          const { format, name, score } = formatItem;

          return (
            <QualityProfileFormatItem
              key={format}
              formatId={format}
              name={name}
              score={score}
              onScoreChange={handleScoreChange}
            />
          );
        })}
      </div>
    </div>
  );
}

export default QualityProfileFormatItems;
