import React, { useRef } from 'react';
import { useDrag, useDrop, XYCoord } from 'react-dnd';
import { QUALITY_PROFILE_ITEM } from 'Helpers/dragTypes';
import QualityProfileItem from './QualityProfileItem';
import QualityProfileItemGroup from './QualityProfileItemGroup';
import { QualityProfileQualityItem } from './useQualityProfiles';
import styles from './QualityProfileItemDragSource.css';

export type EditQualityProfileMode = 'default' | 'editGroups';

export type DropPosition = 'above' | 'below';

export interface DragMoveState {
  dragQualityIndex: string | null;
  dropQualityIndex: string | null;
  dropPosition: DropPosition | null;
}

export interface QualityProfileDragItem {
  mode: EditQualityProfileMode;
  qualityIndex: string;
  groupId: number | undefined;
  qualityId: number | undefined;
  isGroup: boolean;
  name: string;
  allowed: boolean;
}

export interface QualityProfileItemDragSourceActionProps {
  onCreateGroupPress: (qualityId: number) => void;
  onDeleteGroupPress: (groupId: number) => void;
  onItemAllowedChange: (qualityId: number, allowed: boolean) => void;
  onGroupAllowedChange: (groupId: number, allowed: boolean) => void;
  onItemGroupNameChange: (groupId: number, name: string) => void;
  onDragMove: (move: DragMoveState) => void;
  onDragEnd: (didDrop: boolean) => void;
}

interface QualityProfileItemDragSourceProps
  extends QualityProfileItemDragSourceActionProps {
  mode: EditQualityProfileMode;
  groupId?: number;
  // A quality id can be 0 (Unknown Text), so test it against undefined.
  qualityId?: number;
  name: string;
  allowed: boolean;
  items?: QualityProfileQualityItem[];
  qualityIndex: string;
  isInGroup: boolean;
  isDraggingUp: boolean;
  isDraggingDown: boolean;
}

function QualityProfileItemDragSource({
  mode,
  groupId,
  qualityId,
  name,
  allowed,
  items,
  qualityIndex,
  isDraggingUp,
  isDraggingDown,
  onDragMove,
  onDragEnd,
  ...actions
}: QualityProfileItemDragSourceProps) {
  const ref = useRef<HTMLDivElement>(null);
  const itemRef = useRef<HTMLDivElement>(null);

  const [{ isOverCurrent }, dropRef] = useDrop<
    QualityProfileDragItem,
    void,
    { isOverCurrent: boolean }
  >({
    accept: QUALITY_PROFILE_ITEM,
    collect: (monitor) => ({
      isOverCurrent: monitor.isOver({ shallow: true }),
    }),
    hover(item, monitor) {
      // If we're hovering over a child don't trigger on the parent
      if (!itemRef.current || !monitor.isOver({ shallow: true })) {
        return;
      }

      const { qualityIndex: dragQualityIndex, isGroup: isDragGroup } = item;
      const dropQualityIndex = qualityIndex;
      const isDropGroupItem = qualityId !== undefined && !!groupId;

      // Don't show targets for dropping on self
      if (dragQualityIndex === dropQualityIndex) {
        return;
      }

      // Don't allow a group to be dropped inside a group
      if (isDragGroup && isDropGroupItem) {
        return;
      }

      // Measure the item itself, not the placeholder, so the position doesn't
      // flip between above and below as the placeholder appears.
      const rect = itemRef.current.getBoundingClientRect();
      const hoverMiddleY = (rect.bottom - rect.top) / 2;
      const hoverClientY = (monitor.getClientOffset() as XYCoord).y - rect.top;

      if (hoverClientY === hoverMiddleY) {
        return;
      }

      const dropPosition: DropPosition =
        hoverClientY > hoverMiddleY ? 'below' : 'above';

      onDragMove({ dragQualityIndex, dropQualityIndex, dropPosition });
    },
  });

  const [{ isDragging }, dragRef] = useDrag<
    QualityProfileDragItem,
    void,
    { isDragging: boolean }
  >({
    type: QUALITY_PROFILE_ITEM,
    item: () => ({
      mode,
      qualityIndex,
      groupId,
      qualityId,
      isGroup: qualityId === undefined,
      name,
      allowed,
    }),
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
    end: (_item, monitor) => {
      onDragEnd(monitor.didDrop());
    },
  });

  dropRef(ref);

  const isBefore = !isDragging && isDraggingUp && isOverCurrent;
  const isAfter = !isDragging && isDraggingDown && isOverCurrent;

  return (
    <div ref={ref} className={styles.qualityProfileItemDragSource}>
      {isBefore ? (
        <div className={styles.qualityProfileItemPlaceholder} />
      ) : null}

      <div ref={itemRef}>
        {qualityId === undefined && groupId ? (
          <QualityProfileItemGroup
            {...actions}
            dragRef={dragRef}
            mode={mode}
            groupId={groupId}
            name={name}
            allowed={allowed}
            items={items ?? []}
            qualityIndex={qualityIndex}
            isDragging={isDragging}
            isDraggingUp={isDraggingUp}
            isDraggingDown={isDraggingDown}
            onDragMove={onDragMove}
            onDragEnd={onDragEnd}
          />
        ) : null}

        {qualityId === undefined ? null : (
          <QualityProfileItem
            dragRef={dragRef}
            mode={mode}
            groupId={groupId}
            qualityId={qualityId}
            name={name}
            allowed={allowed}
            isDragging={isDragging}
            onCreateGroupPress={actions.onCreateGroupPress}
            onItemAllowedChange={actions.onItemAllowedChange}
          />
        )}
      </div>

      {isAfter ? (
        <div className={styles.qualityProfileItemPlaceholder} />
      ) : null}
    </div>
  );
}

export default QualityProfileItemDragSource;
