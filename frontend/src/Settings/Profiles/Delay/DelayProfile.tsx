import classNames from 'classnames';
import React, { useCallback, useMemo, useRef } from 'react';
import { useDrag, useDrop, XYCoord } from 'react-dnd';
import Card from 'Components/Card';
import Icon from 'Components/Icon';
import Label from 'Components/Label';
import IconButton from 'Components/Link/IconButton';
import ConfirmModal from 'Components/Modal/ConfirmModal';
import TagList from 'Components/TagList';
import { DELAY_PROFILE } from 'Helpers/dragTypes';
import useModalOpenState from 'Helpers/Hooks/useModalOpenState';
import { icons, kinds, sizes } from 'Helpers/Props';
import { Tag } from 'Tags/useTags';
import translate from 'Utilities/String/translate';
import EditDelayProfileModal from './EditDelayProfileModal';
import {
  DEFAULT_DELAY_PROFILE_ID,
  DelayProfileModel,
  useDeleteDelayProfile,
} from './useDelayProfiles';
import styles from './DelayProfile.module.css';

function getDelay(enabled: boolean, delay: number) {
  if (!enabled) {
    return '-';
  }

  if (!delay) {
    return translate('NoDelay');
  }

  if (delay === 1) {
    return translate('OneMinute');
  }

  return translate('DelayMinutes', { delay });
}

interface DragItem {
  id: number;
  order: number;
}

interface DelayProfileProps extends DelayProfileModel {
  tagList: ReadonlyArray<Tag>;
  isDraggingUp: boolean;
  isDraggingDown: boolean;
  onDelayProfileDragMove: (dragIndex: number, dropIndex: number) => void;
  onDelayProfileDragEnd: (id: number, didDrop: boolean) => void;
}

function DelayProfile({
  id,
  enableUsenet,
  enableTorrent,
  preferredProtocol,
  usenetDelay,
  torrentDelay,
  order,
  tags,
  tagList,
  isDraggingUp,
  isDraggingDown,
  onDelayProfileDragMove,
  onDelayProfileDragEnd,
}: DelayProfileProps) {
  const isDefault = id === DEFAULT_DELAY_PROFILE_ID;
  const { deleteDelayProfile, isDeleting } = useDeleteDelayProfile(id);
  const ref = useRef<HTMLDivElement>(null);

  const [isEditModalOpen, setEditModalOpen, setEditModalClosed] =
    useModalOpenState(false);

  const [isDeleteModalOpen, setDeleteModalOpen, setDeleteModalClosed] =
    useModalOpenState(false);

  const preferred = useMemo(() => {
    if (!enableUsenet) {
      return translate('OnlyTorrent');
    }

    if (!enableTorrent) {
      return translate('OnlyUsenet');
    }

    return preferredProtocol === 'usenet'
      ? translate('PreferUsenet')
      : translate('PreferTorrent');
  }, [preferredProtocol, enableUsenet, enableTorrent]);

  const handleDeletePress = useCallback(() => {
    setEditModalClosed();
    setDeleteModalOpen();
  }, [setEditModalClosed, setDeleteModalOpen]);

  const handleConfirmDelete = useCallback(() => {
    // The row unmounts once the profile leaves the list.
    deleteDelayProfile();
  }, [deleteDelayProfile]);

  const [{ isOver }, dropRef] = useDrop<DragItem, void, { isOver: boolean }>({
    accept: DELAY_PROFILE,
    collect: (monitor) => ({
      isOver: monitor.isOver(),
    }),
    hover: (item, monitor) => {
      if (!ref.current) {
        return;
      }

      const dragIndex = item.order;
      const hoverIndex = order;

      if (dragIndex === hoverIndex) {
        return;
      }

      const hoverBoundingRect = ref.current.getBoundingClientRect();
      const hoverMiddleY =
        (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2;
      const clientOffset = monitor.getClientOffset() as XYCoord;
      const hoverClientY = clientOffset.y - hoverBoundingRect.top;

      // When moving up, only trigger if drag position is above 50% and
      // when moving down, only trigger if drag position is below 50%.
      // Moving down drops below the hovered profile, so its index is one more.
      if (dragIndex < hoverIndex && hoverClientY > hoverMiddleY) {
        onDelayProfileDragMove(dragIndex, hoverIndex + 1);
      } else if (dragIndex > hoverIndex && hoverClientY < hoverMiddleY) {
        onDelayProfileDragMove(dragIndex, hoverIndex);
      }
    },
  });

  const [{ isDragging }, dragRef, previewRef] = useDrag<
    DragItem,
    unknown,
    { isDragging: boolean }
  >({
    type: DELAY_PROFILE,
    item: () => ({ id, order }),
    canDrag: () => !isDefault,
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
    end: (item, monitor) => {
      onDelayProfileDragEnd(item.id, monitor.didDrop());
    },
  });

  // The default profile always sorts last, so it is neither dragged nor a target.
  if (!isDefault) {
    dropRef(previewRef(ref));
  }

  const isBefore = !isDragging && isDraggingUp && isOver;
  const isAfter = !isDragging && isDraggingDown && isOver;

  return (
    <div ref={ref}>
      {isBefore ? <div className={styles.placeholder} /> : null}

      <Card
        className={classNames(
          styles.delayProfile,
          isDefault && styles.isDefault,
          isDragging && styles.isDragging
        )}
        overlayClassName={styles.overlay}
        overlayContent={true}
        aria-label={translate('EditDelayProfile')}
        onPress={setEditModalOpen}
      >
        <div className={styles.colDrag}>
          {isDefault ? null : (
            <div ref={dragRef} className={styles.dragHandle}>
              <Icon name={icons.REORDER} />
            </div>
          )}
        </div>

        <div className={styles.colScope}>
          {isDefault ? (
            <Label kind={kinds.DEFAULT} size={sizes.MEDIUM}>
              {translate('Default')}
            </Label>
          ) : null}

          {tags.length ? (
            <TagList tags={tags} tagList={tagList} />
          ) : (
            <span className={styles.anyText}>{translate('Any')}</span>
          )}
        </div>

        <div className={styles.colProto}>{preferred}</div>

        <div className={styles.colUsenet}>
          <span className={styles.colLabel}>{translate('UsenetDelay')}</span>
          {getDelay(enableUsenet, usenetDelay)}
        </div>

        <div className={styles.colTorrent}>
          <span className={styles.colLabel}>{translate('TorrentDelay')}</span>
          {getDelay(enableTorrent, torrentDelay)}
        </div>

        <div className={styles.colActions}>
          {isDefault ? null : (
            <IconButton
              className={styles.actionButton}
              title={translate('DeleteDelayProfile')}
              aria-label={translate('DeleteDelayProfile')}
              name={icons.DELETE}
              onPress={setDeleteModalOpen}
            />
          )}
        </div>
      </Card>

      {isAfter ? <div className={styles.placeholder} /> : null}

      <EditDelayProfileModal
        id={id}
        isOpen={isEditModalOpen}
        onModalClose={setEditModalClosed}
        onDeleteDelayProfilePress={handleDeletePress}
      />

      <ConfirmModal
        isOpen={isDeleteModalOpen}
        kind={kinds.DANGER}
        title={translate('DeleteDelayProfile')}
        message={translate('DeleteDelayProfileMessageText')}
        confirmLabel={translate('Delete')}
        isSpinning={isDeleting}
        onConfirm={handleConfirmDelete}
        onCancel={setDeleteModalClosed}
      />
    </div>
  );
}

export default DelayProfile;
