import React from 'react';
import PageSectionContent from 'Components/Page/PageSectionContent';
import translate from 'Utilities/String/translate';
import QualityDefinition from './QualityDefinition';
import { useManageQualityDefinitions } from './useQualityDefinitions';
import styles from './QualityDefinitions.module.css';

type QualityDefinitionsProps = Pick<
  ReturnType<typeof useManageQualityDefinitions>,
  'items' | 'isFetched' | 'error' | 'updateDefinition'
>;

function QualityDefinitions({
  items,
  isFetched,
  error,
  updateDefinition,
}: QualityDefinitionsProps) {
  return (
    <PageSectionContent
      errorMessage={translate('UnableToLoadQualityDefinitions')}
      // Spinner only for the first load; a refetch after save or reset keeps the rows.
      isFetching={!isFetched}
      isPopulated={isFetched}
      error={error}
    >
      <div className={styles.header}>
        <div className={styles.quality}>{translate('Quality')}</div>
        <div className={styles.title}>{translate('Title')}</div>
        <div className={styles.sizeLimit}>
          {translate('MinimumReleaseSize')}
        </div>
      </div>

      <div className={styles.definitions}>
        {items.map((item) => {
          return (
            <QualityDefinition
              key={item.id}
              {...item}
              updateDefinition={updateDefinition}
            />
          );
        })}
      </div>

      <div className={styles.sizeLimitHelpText}>
        {translate('MinimumReleaseSizeHelpText')}
      </div>
    </PageSectionContent>
  );
}

export default QualityDefinitions;
