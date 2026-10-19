import React from 'react';
import Modal from 'Components/Modal/Modal';
import TagsModalContent, { ApplyTagsMode } from './TagsModalContent';

interface TagsModalProps {
  isOpen: boolean;
  authorIds: number[];
  onApplyTagsPress: (tags: number[], applyTags: ApplyTagsMode) => void;
  onModalClose: () => void;
}

function TagsModal({
  isOpen,
  authorIds,
  onApplyTagsPress,
  onModalClose,
}: TagsModalProps) {
  return (
    <Modal isOpen={isOpen} onModalClose={onModalClose}>
      {isOpen ? (
        <TagsModalContent
          authorIds={authorIds}
          onApplyTagsPress={onApplyTagsPress}
          onModalClose={onModalClose}
        />
      ) : null}
    </Modal>
  );
}

export default TagsModal;
