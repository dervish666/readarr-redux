import React, { useCallback, useState } from 'react';
import Link from 'Components/Link/Link';
import PageSectionContent from 'Components/Page/PageSectionContent';
import useModalOpenState from 'Helpers/Hooks/useModalOpenState';
import { useTagList } from 'Tags/useTags';
import translate from 'Utilities/String/translate';
import DelayProfile from './DelayProfile';
import EditDelayProfileModal from './EditDelayProfileModal';
import {
  useReorderDelayProfile,
  useSortedDelayProfiles,
} from './useDelayProfiles';
import styles from './DelayProfiles.css';

function DelayProfiles() {
  const { error, isFetched, items, defaultProfile } = useSortedDelayProfiles();
  const { reorderDelayProfile } = useReorderDelayProfile();
  const tagList = useTagList();

  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);

  const [isAddModalOpen, setAddModalOpen, setAddModalClosed] =
    useModalOpenState(false);

  const isDraggingUp =
    dropIndex !== null && dragIndex !== null && dropIndex < dragIndex;
  const isDraggingDown =
    dropIndex !== null && dragIndex !== null && dropIndex > dragIndex;

  const handleDragMove = useCallback(
    (newDragIndex: number, newDropIndex: number) => {
      setDragIndex(newDragIndex);
      setDropIndex(newDropIndex);
    },
    []
  );

  const handleDragEnd = useCallback(
    (id: number, didDrop: boolean) => {
      if (didDrop && dropIndex !== null) {
        const moving = items.find((p) => p.id === id);

        // Orders are 1-based; the profile lands after the one now at dropIndex - 1.
        if (moving && moving.order !== dropIndex) {
          const after =
            dropIndex > 1
              ? items.find((p) => p.order === dropIndex - 1)
              : undefined;

          reorderDelayProfile({ id, afterId: after?.id });
        }
      }

      setDragIndex(null);
      setDropIndex(null);
    },
    [dropIndex, items, reorderDelayProfile]
  );

  return (
    <PageSectionContent
      errorMessage={translate('UnableToLoadDelayProfiles')}
      error={error}
      isFetching={!isFetched}
      isPopulated={isFetched}
    >
      <div className={styles.headerRow}>
        <div className={styles.colDrag} />

        <div className={styles.colScope}>{translate('Tags')}</div>

        <div className={styles.colProto}>{translate('Protocol')}</div>

        <div className={styles.colUsenet}>{translate('UsenetDelay')}</div>

        <div className={styles.colTorrent}>{translate('TorrentDelay')}</div>

        <div className={styles.colActions} />
      </div>

      <div className={styles.delayList}>
        {items.map((item) => {
          return (
            <DelayProfile
              key={item.id}
              {...item}
              tagList={tagList}
              isDraggingUp={isDraggingUp}
              isDraggingDown={isDraggingDown}
              onDelayProfileDragMove={handleDragMove}
              onDelayProfileDragEnd={handleDragEnd}
            />
          );
        })}

        {defaultProfile ? (
          <DelayProfile
            {...defaultProfile}
            tagList={tagList}
            isDraggingUp={false}
            isDraggingDown={false}
            onDelayProfileDragMove={handleDragMove}
            onDelayProfileDragEnd={handleDragEnd}
          />
        ) : null}

        <Link className={styles.addRow} onPress={setAddModalOpen}>
          {translate('AddDelayProfile')}
        </Link>
      </div>

      <EditDelayProfileModal
        isOpen={isAddModalOpen}
        onModalClose={setAddModalClosed}
      />
    </PageSectionContent>
  );
}

export default DelayProfiles;
