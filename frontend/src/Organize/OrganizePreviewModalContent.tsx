import React, { useCallback, useEffect, useMemo, useRef } from 'react';
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
import { useNamingSettings } from 'Settings/MediaManagement/Naming/useNamingSettings';
import { InputChanged } from 'typings/inputs';
import { SelectStateInputProps } from 'typings/props';
import translate from 'Utilities/String/translate';
import getSelectedIds from 'Utilities/Table/getSelectedIds';
import OrganizePreviewRow from './OrganizePreviewRow';
import useOrganizePreview from './useOrganizePreview';
import styles from './OrganizePreviewModalContent.module.css';

function getValue(allSelected: boolean, allUnselected: boolean) {
  if (allSelected) {
    return true;
  } else if (allUnselected) {
    return false;
  }

  return null;
}

export interface OrganizePreviewModalContentProps {
  authorId: number;
  bookId?: number;
  onModalClose: () => void;
}

// The author and book pages' rename preview: GET /rename, then a RenameFiles command
// for the selected book files.
function OrganizePreviewModalContent({
  authorId,
  bookId,
  onModalClose,
}: OrganizePreviewModalContentProps) {
  const executeCommand = useExecuteCommand();

  const {
    items,
    isFetching: isPreviewFetching,
    isFetched: isPreviewFetched,
    isSuccess: isPreviewSuccess,
    error: previewError,
  } = useOrganizePreview(authorId, bookId);

  const {
    data: naming,
    isFetching: isNamingFetching,
    isFetched: isNamingFetched,
    error: namingError,
  } = useNamingSettings();

  const isFetching = isPreviewFetching || isNamingFetching;
  const isPopulated = isPreviewFetched && isNamingFetched;
  const error = previewError || namingError;

  // The select helpers find shift-click ranges by id.
  const selectItems = useMemo(
    () => items.map((item) => ({ id: item.bookFileId })),
    [items]
  );

  // Read through a ref so the rows' select callback stays the same across refetches;
  // a row selects itself once, on mount.
  const selectItemsRef = useRef(selectItems);
  selectItemsRef.current = selectItems;

  const [selectState, setSelectState] = useSelectState();
  const { allSelected, allUnselected, selectedState } = selectState;

  useEffect(() => {
    // A failed load must not drop the selection.
    if (isPreviewSuccess) {
      setSelectState({ type: 'updateItems', items: selectItems });
    }
  }, [selectItems, isPreviewSuccess, setSelectState]);

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

  const handleOrganizePress = useCallback(() => {
    executeCommand({
      name: commandNames.RENAME_FILES,
      authorId,
      files: getSelectedIds(selectedState),
    });

    onModalClose();
  }, [authorId, selectedState, executeCommand, onModalClose]);

  return (
    <ModalContent onModalClose={onModalClose}>
      <ModalHeader>{translate('OrganizeModalHeader')}</ModalHeader>

      <ModalBody>
        {isFetching ? <LoadingIndicator /> : null}

        {!isFetching && error ? (
          <Alert kind={kinds.DANGER}>{translate('ErrorLoadingPreviews')}</Alert>
        ) : null}

        {!isFetching && isPopulated && !error && !items.length ? (
          <div>{translate('SuccessMyWorkIsDoneNoFilesToRename')}</div>
        ) : null}

        {!isFetching && isPopulated && !!items.length ? (
          <div>
            <Alert>
              {translate('NamingPattern')}:
              <span className={styles.bookFormat}>
                {naming.standardBookFormat}
              </span>
            </Alert>

            <div className={styles.previews}>
              {items.map((item) => {
                return (
                  <OrganizePreviewRow
                    key={item.bookFileId}
                    id={item.bookFileId}
                    existingPath={item.existingPath}
                    newPath={item.newPath}
                    isSelected={selectedState[item.bookFileId]}
                    onSelectedChange={handleSelectedChange}
                  />
                );
              })}
            </div>
          </div>
        ) : null}
      </ModalBody>

      <ModalFooter>
        {isPopulated && !!items.length ? (
          <CheckInput
            className={styles.selectAllInput}
            containerClassName={styles.selectAllInputContainer}
            name="selectAll"
            value={getValue(allSelected, allUnselected)}
            onChange={handleSelectAllChange}
          />
        ) : null}

        <Button onPress={onModalClose}>{translate('Cancel')}</Button>

        <Button kind={kinds.PRIMARY} onPress={handleOrganizePress}>
          {translate('Organize')}
        </Button>
      </ModalFooter>
    </ModalContent>
  );
}

export default OrganizePreviewModalContent;
