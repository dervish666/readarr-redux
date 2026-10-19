import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import * as commandNames from 'Commands/commandNames';
import { useExecuteCommand } from 'Commands/useCommands';
import Alert from 'Components/Alert';
import CheckInput from 'Components/Form/CheckInput';
import Button from 'Components/Link/Button';
import LoadingIndicator from 'Components/Loading/LoadingIndicator';
import ModalBody from 'Components/Modal/ModalBody';
import ModalContent from 'Components/Modal/ModalContent';
import ModalFooter from 'Components/Modal/ModalFooter';
import ModalHeader from 'Components/Modal/ModalHeader';
import useSelectState from 'Helpers/Hooks/useSelectState';
import { kinds } from 'Helpers/Props';
import { InputChanged } from 'typings/inputs';
import { SelectStateInputProps } from 'typings/props';
import translate from 'Utilities/String/translate';
import getSelectedIds from 'Utilities/Table/getSelectedIds';
import RetagPreviewRow from './RetagPreviewRow';
import useRetagPreview from './useRetagPreview';
import styles from './RetagPreviewModalContent.module.css';

function getValue(allSelected: boolean, allUnselected: boolean) {
  if (allSelected) {
    return true;
  } else if (allUnselected) {
    return false;
  }

  return null;
}

export interface RetagPreviewModalContentProps {
  authorId: number;
  bookId?: number;
  onModalClose: () => void;
}

// The author and book pages' tag preview: GET /retag, then a RetagFiles command for
// the selected book files.
function RetagPreviewModalContent({
  authorId,
  bookId,
  onModalClose,
}: RetagPreviewModalContentProps) {
  const executeCommand = useExecuteCommand();
  const { items, isFetching, isFetched, isSuccess, error } = useRetagPreview(
    authorId,
    bookId
  );

  const [updateCovers, setUpdateCovers] = useState(false);
  const [embedMetadata, setEmbedMetadata] = useState(false);

  // The select helpers find shift-click ranges by id. Read through a ref so the
  // rows' select callback stays the same across refetches; a row selects itself
  // once, on mount.
  const selectItems = useMemo(
    () => items.map((item) => ({ id: item.bookFileId })),
    [items]
  );

  const selectItemsRef = useRef(selectItems);
  selectItemsRef.current = selectItems;

  const [selectState, setSelectState] = useSelectState();
  const { allSelected, allUnselected, selectedState } = selectState;

  useEffect(() => {
    // A failed load must not drop the selection.
    if (isSuccess) {
      setSelectState({ type: 'updateItems', items: selectItems });
    }
  }, [selectItems, isSuccess, setSelectState]);

  const handleSelectAllChange = useCallback(
    ({ value }: InputChanged<boolean>) => {
      setSelectState({
        type: value ? 'selectAll' : 'unselectAll',
        items: selectItemsRef.current,
      });
    },
    [setSelectState]
  );

  const handleSelectedChange = useCallback(
    ({ id, value, shiftKey = false }: SelectStateInputProps) => {
      setSelectState({
        type: 'toggleSelected',
        id,
        isSelected: value,
        shiftKey,
        items: selectItemsRef.current,
      });
    },
    [setSelectState]
  );

  const handleUpdateCoversChange = useCallback(
    ({ value }: InputChanged<boolean>) => setUpdateCovers(value),
    []
  );

  const handleEmbedMetadataChange = useCallback(
    ({ value }: InputChanged<boolean>) => setEmbedMetadata(value),
    []
  );

  const handleRetagPress = useCallback(() => {
    executeCommand({
      name: commandNames.RETAG_FILES,
      authorId,
      updateCovers,
      embedMetadata,
      files: getSelectedIds(selectedState),
    });

    onModalClose();
  }, [
    authorId,
    updateCovers,
    embedMetadata,
    selectedState,
    executeCommand,
    onModalClose,
  ]);

  return (
    <ModalContent onModalClose={onModalClose}>
      <ModalHeader>{translate('WriteMetadataTags')}</ModalHeader>

      <ModalBody>
        {isFetching ? <LoadingIndicator /> : null}

        {!isFetching && error ? (
          <Alert kind={kinds.DANGER}>{translate('ErrorLoadingPreviews')}</Alert>
        ) : null}

        {!isFetching && isFetched && !error && !items.length ? (
          <div>{translate('SuccessMyWorkIsDoneNoFilesToRetag')}</div>
        ) : null}

        {!isFetching && isFetched && !!items.length ? (
          <div className={styles.previews}>
            {items.map((item) => {
              return (
                <RetagPreviewRow
                  key={item.bookFileId}
                  id={item.bookFileId}
                  path={item.path}
                  changes={item.changes}
                  isSelected={selectedState[item.bookFileId]}
                  onSelectedChange={handleSelectedChange}
                />
              );
            })}
          </div>
        ) : null}
      </ModalBody>

      <ModalFooter>
        {isFetched && !!items.length ? (
          <CheckInput
            className={styles.selectAllInput}
            containerClassName={styles.selectAllInputContainer}
            name="selectAll"
            value={getValue(allSelected, allUnselected)}
            onChange={handleSelectAllChange}
          />
        ) : null}

        <label className={styles.optionLabelContainer}>
          <span className={styles.optionLabel}>
            {translate('UpdateCovers')}
          </span>

          <CheckInput
            containerClassName={styles.optionContainer}
            className={styles.optionInput}
            name="updateCovers"
            value={updateCovers}
            onChange={handleUpdateCoversChange}
          />
        </label>

        <label className={styles.optionLabelContainer}>
          <span className={styles.optionLabel}>
            {translate('EmbedMetadata')}
          </span>

          <CheckInput
            containerClassName={styles.optionContainer}
            className={styles.optionInput}
            name="embedMetadata"
            value={embedMetadata}
            onChange={handleEmbedMetadataChange}
          />
        </label>

        <Button onPress={onModalClose}>{translate('Cancel')}</Button>

        <Button kind={kinds.PRIMARY} onPress={handleRetagPress}>
          {translate('Retag')}
        </Button>
      </ModalFooter>
    </ModalContent>
  );
}

export default RetagPreviewModalContent;
