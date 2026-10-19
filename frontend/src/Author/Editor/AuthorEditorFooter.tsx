import React, { useCallback, useState } from 'react';
import { NewItemMonitorType } from 'Author/Author';
import MoveAuthorModal from 'Author/MoveAuthor/MoveAuthorModal';
import {
  SaveAuthorEditorPayload,
  useBulkDeleteAuthors,
  useSaveAuthorEditor,
} from 'Author/useAuthors';
import * as commandNames from 'Commands/commandNames';
import { useCommandExecuting } from 'Commands/useCommands';
import MetadataProfileSelectInput from 'Components/Form/MetadataProfileSelectInput';
import MonitorNewItemsSelectInput from 'Components/Form/MonitorNewItemsSelectInput';
import QualityProfileSelectInput from 'Components/Form/QualityProfileSelectInput';
import RootFolderSelectInput from 'Components/Form/RootFolderSelectInput';
import SelectInput from 'Components/Form/SelectInput';
import SpinnerButton from 'Components/Link/SpinnerButton';
import PageContentFooter from 'Components/Page/PageContentFooter';
import { kinds } from 'Helpers/Props';
import { InputChanged } from 'typings/inputs';
import translate from 'Utilities/String/translate';
import RetagAuthorModal from './AudioTags/RetagAuthorModal';
import AuthorEditorFooterLabel from './AuthorEditorFooterLabel';
import DeleteAuthorModal from './Delete/DeleteAuthorModal';
import OrganizeAuthorModal from './Organize/OrganizeAuthorModal';
import TagsModal from './Tags/TagsModal';
import { ApplyTagsMode } from './Tags/TagsModalContent';
import styles from './AuthorEditorFooter.css';

const NO_CHANGE = 'noChange';

type Field =
  | 'monitored'
  | 'monitorNewItems'
  | 'qualityProfileId'
  | 'metadataProfileId'
  | 'rootFolderPath'
  | 'tags';

interface FieldValues {
  monitored: string;
  monitorNewItems: string;
  qualityProfileId: string | number;
  metadataProfileId: string | number;
  rootFolderPath: string;
}

const DEFAULT_VALUES: FieldValues = {
  monitored: NO_CHANGE,
  monitorNewItems: NO_CHANGE,
  qualityProfileId: NO_CHANGE,
  metadataProfileId: NO_CHANGE,
  rootFolderPath: NO_CHANGE,
};

interface AuthorEditorFooterProps {
  authorIds: number[];
  onSelectionClear: () => void;
}

// The author index's mass editor. Each select saves as soon as it changes (PUT
// /author/editor with just that field); a root folder change asks whether to move
// the files first.
function AuthorEditorFooter({
  authorIds,
  onSelectionClear,
}: AuthorEditorFooterProps) {
  const selectedCount = authorIds.length;

  const [values, setValues] = useState<FieldValues>(DEFAULT_VALUES);
  const [savingField, setSavingField] = useState<Field | null>(null);
  const [isTagsModalOpen, setIsTagsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isOrganizeModalOpen, setIsOrganizeModalOpen] = useState(false);
  const [isRetagModalOpen, setIsRetagModalOpen] = useState(false);
  const [destinationRootFolder, setDestinationRootFolder] = useState<
    string | null
  >(null);

  const isOrganizingAuthor = useCommandExecuting(commandNames.RENAME_AUTHOR);
  const isRetaggingAuthor = useCommandExecuting(commandNames.RETAG_AUTHOR);

  const handleSaved = useCallback(() => {
    setValues(DEFAULT_VALUES);
    setSavingField(null);
  }, []);

  const { saveAuthorEditor, isSavingAuthorEditor } =
    useSaveAuthorEditor(handleSaved);
  const { bulkDeleteAuthors, isBulkDeleting } = useBulkDeleteAuthors();

  const save = useCallback(
    (field: Field, changes: Omit<SaveAuthorEditorPayload, 'authorIds'>) => {
      setSavingField(field);
      saveAuthorEditor({ authorIds, ...changes });
    },
    [authorIds, saveAuthorEditor]
  );

  const handleInputChange = useCallback(
    ({ name, value }: InputChanged<string | number>) => {
      setValues((current) => ({ ...current, [name]: value }));

      if (value === NO_CHANGE) {
        return;
      }

      switch (name) {
        case 'rootFolderPath':
          setDestinationRootFolder(value as string);
          break;
        case 'monitored':
          save('monitored', { monitored: value === 'monitored' });
          break;
        case 'monitorNewItems':
          save('monitorNewItems', {
            monitorNewItems: value as NewItemMonitorType,
          });
          break;
        case 'qualityProfileId':
          save('qualityProfileId', { qualityProfileId: value as number });
          break;
        case 'metadataProfileId':
          save('metadataProfileId', { metadataProfileId: value as number });
          break;
        default:
          break;
      }
    },
    [save]
  );

  const handleApplyTagsPress = useCallback(
    (tags: number[], applyTags: ApplyTagsMode) => {
      setIsTagsModalOpen(false);
      save('tags', { tags, applyTags });
    },
    [save]
  );

  const handleSaveRootFolderPress = useCallback(() => {
    if (destinationRootFolder) {
      save('rootFolderPath', { rootFolderPath: destinationRootFolder });
    }

    setDestinationRootFolder(null);
  }, [destinationRootFolder, save]);

  const handleMoveAuthorPress = useCallback(() => {
    if (destinationRootFolder) {
      save('rootFolderPath', {
        rootFolderPath: destinationRootFolder,
        moveFiles: true,
      });
    }

    setDestinationRootFolder(null);
  }, [destinationRootFolder, save]);

  const handleDeleteSelectedPress = useCallback(
    (deleteFiles: boolean) => {
      setIsDeleteModalOpen(false);
      bulkDeleteAuthors({ authorIds, deleteFiles });
    },
    [authorIds, bulkDeleteAuthors]
  );

  const handleOrganizeModalClose = useCallback(
    (organized?: boolean) => {
      setIsOrganizeModalOpen(false);

      if (organized === true) {
        onSelectionClear();
      }
    },
    [onSelectionClear]
  );

  const handleRetagModalClose = useCallback(
    (retagged?: boolean) => {
      setIsRetagModalOpen(false);

      if (retagged === true) {
        onSelectionClear();
      }
    },
    [onSelectionClear]
  );

  const isSaving = (field: Field) =>
    isSavingAuthorEditor && savingField === field;

  const monitoredOptions = [
    { key: NO_CHANGE, value: translate('NoChange'), isDisabled: true },
    { key: 'monitored', value: translate('Monitored') },
    { key: 'unmonitored', value: translate('Unmonitored') },
  ];

  const isCommandRunning = isOrganizingAuthor || isRetaggingAuthor;

  return (
    <PageContentFooter>
      <div className={styles.footer}>
        <div className={styles.dropdownContainer}>
          <div className={styles.inputContainer}>
            <AuthorEditorFooterLabel
              label={translate('MonitorAuthor')}
              isSaving={isSaving('monitored')}
            />

            <SelectInput
              name="monitored"
              value={values.monitored}
              values={monitoredOptions}
              isDisabled={!selectedCount}
              onChange={handleInputChange}
            />
          </div>

          <div className={styles.inputContainer}>
            <AuthorEditorFooterLabel
              label={translate('MonitorNewItems')}
              isSaving={isSaving('monitorNewItems')}
            />

            <MonitorNewItemsSelectInput
              name="monitorNewItems"
              value={values.monitorNewItems}
              includeNoChange={true}
              isDisabled={!selectedCount}
              onChange={handleInputChange}
            />
          </div>

          <div className={styles.inputContainer}>
            <AuthorEditorFooterLabel
              label={translate('QualityProfile')}
              isSaving={isSaving('qualityProfileId')}
            />

            <QualityProfileSelectInput
              name="qualityProfileId"
              value={values.qualityProfileId}
              includeNoChange={true}
              isDisabled={!selectedCount}
              onChange={handleInputChange}
            />
          </div>

          <div className={styles.inputContainer}>
            <AuthorEditorFooterLabel
              label={translate('MetadataProfile')}
              isSaving={isSaving('metadataProfileId')}
            />

            <MetadataProfileSelectInput
              name="metadataProfileId"
              value={values.metadataProfileId}
              includeNoChange={true}
              includeNone={true}
              isDisabled={!selectedCount}
              onChange={handleInputChange}
            />
          </div>

          <div className={styles.inputContainer}>
            <AuthorEditorFooterLabel
              label={translate('RootFolder')}
              isSaving={isSaving('rootFolderPath')}
            />

            <RootFolderSelectInput
              name="rootFolderPath"
              value={values.rootFolderPath}
              includeNoChange={true}
              isDisabled={!selectedCount}
              selectedValueOptions={{ includeFreeSpace: false }}
              onChange={handleInputChange}
            />
          </div>
        </div>

        <div className={styles.buttonContainer}>
          <div className={styles.buttonContainerContent}>
            <AuthorEditorFooterLabel
              label={translate('SelectedCountAuthorsSelectedInterp', {
                0: selectedCount,
              })}
              isSaving={false}
            />

            <div className={styles.buttons}>
              <SpinnerButton
                className={styles.organizeSelectedButton}
                kind={kinds.WARNING}
                isSpinning={isOrganizingAuthor}
                isDisabled={!selectedCount || isCommandRunning}
                onPress={() => setIsOrganizeModalOpen(true)}
              >
                {translate('RenameFiles')}
              </SpinnerButton>

              <SpinnerButton
                className={styles.organizeSelectedButton}
                kind={kinds.WARNING}
                isSpinning={isRetaggingAuthor}
                isDisabled={!selectedCount || isCommandRunning}
                onPress={() => setIsRetagModalOpen(true)}
              >
                {translate('WriteMetadataTags')}
              </SpinnerButton>

              <SpinnerButton
                className={styles.tagsButton}
                isSpinning={isSaving('tags')}
                isDisabled={!selectedCount || isCommandRunning}
                onPress={() => setIsTagsModalOpen(true)}
              >
                {translate('SetReadarrTags')}
              </SpinnerButton>

              <SpinnerButton
                className={styles.deleteSelectedButton}
                kind={kinds.DANGER}
                isSpinning={isBulkDeleting}
                isDisabled={!selectedCount || isBulkDeleting}
                onPress={() => setIsDeleteModalOpen(true)}
              >
                {translate('Delete')}
              </SpinnerButton>
            </div>
          </div>
        </div>
      </div>

      <TagsModal
        isOpen={isTagsModalOpen}
        authorIds={authorIds}
        onApplyTagsPress={handleApplyTagsPress}
        onModalClose={() => setIsTagsModalOpen(false)}
      />

      <DeleteAuthorModal
        isOpen={isDeleteModalOpen}
        authorIds={authorIds}
        onDeleteSelectedPress={handleDeleteSelectedPress}
        onModalClose={() => setIsDeleteModalOpen(false)}
      />

      <MoveAuthorModal
        destinationRootFolder={destinationRootFolder}
        isOpen={!!destinationRootFolder}
        onSavePress={handleSaveRootFolderPress}
        onMoveAuthorPress={handleMoveAuthorPress}
      />

      <OrganizeAuthorModal
        isOpen={isOrganizeModalOpen}
        authorIds={authorIds}
        onModalClose={handleOrganizeModalClose}
      />

      <RetagAuthorModal
        isOpen={isRetagModalOpen}
        authorIds={authorIds}
        onModalClose={handleRetagModalClose}
      />
    </PageContentFooter>
  );
}

export default AuthorEditorFooter;
