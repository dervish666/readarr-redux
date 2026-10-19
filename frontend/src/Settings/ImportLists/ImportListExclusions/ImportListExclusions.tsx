import React, { useCallback, useState } from 'react';
import Icon from 'Components/Icon';
import Link from 'Components/Link/Link';
import PageSectionContent from 'Components/Page/PageSectionContent';
import { icons } from 'Helpers/Props';
import translate from 'Utilities/String/translate';
import EditImportListExclusionModal from './EditImportListExclusionModal';
import ImportListExclusion from './ImportListExclusion';
import { useImportListExclusions } from './useImportListExclusions';
import styles from './ImportListExclusions.css';

function ImportListExclusions() {
  const { isFetched, error, data } = useImportListExclusions();

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const handleAddPress = useCallback(() => {
    setIsAddModalOpen(true);
  }, []);

  const handleAddModalClose = useCallback(() => {
    setIsAddModalOpen(false);
  }, []);

  return (
    <PageSectionContent
      errorMessage={translate('UnableToLoadImportListExclusions')}
      error={error}
      isFetching={!isFetched}
      isPopulated={isFetched}
    >
      <div className={styles.importListExclusionsHeader}>
        <div className={styles.name}>{translate('EntityName')}</div>
        <div className={styles.foreignId}>{translate('ForeignId')}</div>
      </div>

      <div>
        {data.map((item) => (
          <ImportListExclusion key={item.id} {...item} />
        ))}
      </div>

      <Link className={styles.addRow} onPress={handleAddPress}>
        <Icon name={icons.ADD} size={12} />
        {translate('AddImportListExclusion')}
      </Link>

      <EditImportListExclusionModal
        isOpen={isAddModalOpen}
        onModalClose={handleAddModalClose}
      />
    </PageSectionContent>
  );
}

export default ImportListExclusions;
