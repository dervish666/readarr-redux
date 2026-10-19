import React from 'react';
import { useDragLayer, XYCoord } from 'react-dnd';
import DragPreviewLayer from 'Components/DragPreviewLayer';
import { QUALITY_PROFILE_ITEM } from 'Helpers/dragTypes';
import dimensions from 'Styles/Variables/dimensions';
import QualityProfileItem from './QualityProfileItem';
import { QualityProfileDragItem } from './QualityProfileItemDragSource';
import styles from './QualityProfileItemDragSource.css';

const formGroupExtraSmallWidth = parseInt(dimensions.formGroupExtraSmallWidth);
const formLabelSmallWidth = parseInt(dimensions.formLabelSmallWidth);
const formLabelRightMarginWidth = parseInt(
  dimensions.formLabelRightMarginWidth
);
const dragHandleWidth = parseInt(dimensions.dragHandleWidth);

// The offset is shifted because the drag handle is on the right edge of the
// list item and the preview is wider than the drag handle.
const HANDLE_OFFSET =
  formGroupExtraSmallWidth -
  formLabelSmallWidth -
  formLabelRightMarginWidth -
  dragHandleWidth;

function QualityProfileItemDragPreview() {
  const { item, itemType, currentOffset } = useDragLayer((monitor) => ({
    item: monitor.getItem() as QualityProfileDragItem | null,
    itemType: monitor.getItemType(),
    currentOffset: monitor.getSourceClientOffset() as XYCoord | null,
  }));

  if (!item || !currentOffset || itemType !== QUALITY_PROFILE_ITEM) {
    return null;
  }

  const transform = `translate3d(${currentOffset.x - HANDLE_OFFSET}px, ${
    currentOffset.y
  }px, 0)`;

  return (
    <DragPreviewLayer>
      <div
        className={styles.dragPreview}
        style={{ position: 'absolute', transform }}
      >
        <QualityProfileItem
          mode={item.mode}
          isPreview={true}
          qualityId={item.groupId ?? item.qualityId ?? 0}
          name={item.name}
          allowed={item.allowed}
          isDragging={false}
        />
      </div>
    </DragPreviewLayer>
  );
}

export default QualityProfileItemDragPreview;
