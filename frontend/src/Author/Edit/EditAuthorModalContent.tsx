import React, { useCallback, useEffect, useMemo, useState } from 'react';
import AuthorMetadataProfilePopoverContent from 'AddAuthor/AuthorMetadataProfilePopoverContent';
import AuthorMonitorNewItemsOptionsPopoverContent from 'AddAuthor/AuthorMonitorNewItemsOptionsPopoverContent';
import Author from 'Author/Author';
import MoveAuthorModal from 'Author/MoveAuthor/MoveAuthorModal';
import {
  useAuthorMetadataOverride,
  useSaveAuthorMetadataOverride,
} from 'Author/useAuthorMetadataOverride';
import { useAuthor, useSaveAuthor } from 'Author/useAuthors';
import Alert from 'Components/Alert';
import Form from 'Components/Form/Form';
import FormGroup from 'Components/Form/FormGroup';
import FormInputGroup from 'Components/Form/FormInputGroup';
import FormLabel from 'Components/Form/FormLabel';
import Icon from 'Components/Icon';
import Button from 'Components/Link/Button';
import SpinnerErrorButton from 'Components/Link/SpinnerErrorButton';
import ModalBody from 'Components/Modal/ModalBody';
import ModalContent from 'Components/Modal/ModalContent';
import ModalFooter from 'Components/Modal/ModalFooter';
import ModalHeader from 'Components/Modal/ModalHeader';
import Popover from 'Components/Tooltip/Popover';
import { usePendingChangesStore } from 'Helpers/Hooks/usePendingChangesStore';
import usePrevious from 'Helpers/Hooks/usePrevious';
import { icons, inputTypes, kinds, tooltipPositions } from 'Helpers/Props';
import { useMetadataProfiles } from 'Settings/Profiles/Metadata/useMetadataProfiles';
import { InputChanged } from 'typings/inputs';
import selectSettings from 'Utilities/selectSettings';
import translate from 'Utilities/String/translate';
import styles from './EditAuthorModalContent.css';

type EditableAuthor = Pick<
  Author,
  | 'monitored'
  | 'monitorNewItems'
  | 'qualityProfileId'
  | 'metadataProfileId'
  | 'path'
  | 'tags'
>;

export interface EditAuthorModalContentProps {
  authorId: number;
  onModalClose: () => void;
  onDeleteAuthorPress?: () => void;
}

// The PUT is the whole cached author with the edited fields laid over it, so every
// field the form doesn't show (rootFolderPath, metadataProfileId when hidden, links,
// images, ...) goes back unchanged. The overview set by hand (PR #20) is not part of
// AuthorResource: it is saved first through /author/{id}/metadata, then the author.
function EditAuthorModalContent({
  authorId,
  onModalClose,
  onDeleteAuthorPress,
}: EditAuthorModalContentProps) {
  const author = useAuthor(authorId);
  const { data: metadataProfiles } = useMetadataProfiles();

  const { pendingChanges, setPendingChange } =
    usePendingChangesStore<EditableAuthor>({});

  const [isConfirmMoveModalOpen, setIsConfirmMoveModalOpen] = useState(false);

  const { saveAuthor, isSaving, saveError } = useSaveAuthor();
  const wasSaving = usePrevious(isSaving);

  const {
    data: metadataOverride,
    isSuccess: isOverviewLoaded,
    error: overviewLoadError,
    refetch: refetchOverview,
  } = useAuthorMetadataOverride(authorId);

  const {
    saveAuthorMetadataOverride,
    isSavingAuthorMetadataOverride,
    saveAuthorMetadataOverrideError,
  } = useSaveAuthorMetadataOverride(authorId);

  const savedOverview = metadataOverride?.overview ?? '';
  const [overview, setOverview] = useState<string | null>(null);

  // The field appears once the override has loaded, never with a guess.
  useEffect(() => {
    if (isOverviewLoaded && overview === null) {
      setOverview(savedOverview);
    }
  }, [isOverviewLoaded, overview, savedOverview]);

  const isPathChanging = !!(
    author &&
    pendingChanges.path != null &&
    pendingChanges.path !== author.path
  );

  const { settings, ...otherSettings } = useMemo(() => {
    return selectSettings<EditableAuthor>(
      {
        monitored: author?.monitored ?? false,
        monitorNewItems: author?.monitorNewItems ?? 'all',
        qualityProfileId: author?.qualityProfileId ?? 0,
        metadataProfileId: author?.metadataProfileId ?? 0,
        path: author?.path ?? '',
        tags: author?.tags ?? [],
      },
      pendingChanges,
      saveError
    );
  }, [author, pendingChanges, saveError]);

  const handleInputChange = useCallback(
    ({ name, value }: InputChanged) => {
      setPendingChange(
        name as keyof EditableAuthor,
        value as EditableAuthor[keyof EditableAuthor]
      );
    },
    [setPendingChange]
  );

  const handleOverviewChange = useCallback(({ value }: InputChanged) => {
    setOverview(value as string);
  }, []);

  const save = useCallback(
    (moveFiles: boolean) => {
      if (!author) {
        return;
      }

      const saveAuthorChanges = () => {
        saveAuthor({ ...author, ...pendingChanges }, { moveFiles });
      };

      if (overview === null || overview === savedOverview) {
        saveAuthorChanges();
        return;
      }

      saveAuthorMetadataOverride(
        { overview: overview.trim() || null },
        { onSuccess: saveAuthorChanges }
      );
    },
    [
      author,
      pendingChanges,
      overview,
      savedOverview,
      saveAuthor,
      saveAuthorMetadataOverride,
    ]
  );

  const handleSavePress = useCallback(() => {
    if (isPathChanging && !isConfirmMoveModalOpen) {
      setIsConfirmMoveModalOpen(true);
    } else {
      setIsConfirmMoveModalOpen(false);
      save(false);
    }
  }, [isPathChanging, isConfirmMoveModalOpen, save]);

  const handleMoveAuthorPress = useCallback(() => {
    setIsConfirmMoveModalOpen(false);
    save(true);
  }, [save]);

  const handleOverviewReloadPress = useCallback(() => {
    refetchOverview();
  }, [refetchOverview]);

  useEffect(() => {
    if (wasSaving && !isSaving && !saveError) {
      onModalClose();
    }
  }, [isSaving, wasSaving, saveError, onModalClose]);

  if (!author) {
    return null;
  }

  return (
    <ModalContent onModalClose={onModalClose}>
      <ModalHeader>
        {translate('Edit')} - {author.authorName}
      </ModalHeader>

      <ModalBody>
        <Form {...otherSettings}>
          <FormGroup>
            <FormLabel>{translate('Monitored')}</FormLabel>

            <FormInputGroup
              type={inputTypes.CHECK}
              name="monitored"
              helpText={translate('MonitoredHelpText')}
              {...settings.monitored}
              onChange={handleInputChange}
            />
          </FormGroup>

          <FormGroup>
            <FormLabel>
              {translate('MonitorNewItems')}
              <Popover
                anchor={<Icon className={styles.labelIcon} name={icons.INFO} />}
                title={translate('MonitorNewItems')}
                body={<AuthorMonitorNewItemsOptionsPopoverContent />}
                position={tooltipPositions.RIGHT}
              />
            </FormLabel>

            <FormInputGroup
              type={inputTypes.MONITOR_NEW_ITEMS_SELECT}
              name="monitorNewItems"
              helpText={translate('MonitorNewItemsHelpText')}
              {...settings.monitorNewItems}
              onChange={handleInputChange}
            />
          </FormGroup>

          <FormGroup>
            <FormLabel>{translate('QualityProfile')}</FormLabel>

            <FormInputGroup
              type={inputTypes.QUALITY_PROFILE_SELECT}
              name="qualityProfileId"
              {...settings.qualityProfileId}
              onChange={handleInputChange}
            />
          </FormGroup>

          {metadataProfiles.length > 1 ? (
            <FormGroup>
              <FormLabel>
                {translate('MetadataProfile')}

                <Popover
                  anchor={
                    <Icon className={styles.labelIcon} name={icons.INFO} />
                  }
                  title={translate('MetadataProfile')}
                  body={<AuthorMetadataProfilePopoverContent />}
                  position={tooltipPositions.RIGHT}
                />
              </FormLabel>

              <FormInputGroup
                type={inputTypes.METADATA_PROFILE_SELECT}
                name="metadataProfileId"
                helpText={translate('MetadataProfileIdHelpText')}
                {...{ includeNone: true }}
                {...settings.metadataProfileId}
                onChange={handleInputChange}
              />
            </FormGroup>
          ) : null}

          <FormGroup>
            <FormLabel>{translate('Path')}</FormLabel>

            <FormInputGroup
              type={inputTypes.PATH}
              name="path"
              {...settings.path}
              onChange={handleInputChange}
            />
          </FormGroup>

          <FormGroup>
            <FormLabel>{translate('Tags')}</FormLabel>

            <FormInputGroup
              type={inputTypes.TAG}
              name="tags"
              {...settings.tags}
              onChange={handleInputChange}
            />
          </FormGroup>

          {overview === null ? null : (
            <FormGroup>
              <FormLabel>{translate('Overview')}</FormLabel>

              <FormInputGroup
                type={inputTypes.TEXT_AREA}
                name="overview"
                value={overview}
                helpText={translate('AuthorOverviewOverrideHelpText')}
                onChange={handleOverviewChange}
              />
            </FormGroup>
          )}

          {overviewLoadError ? (
            <Alert kind={kinds.DANGER}>
              {translate('AuthorOverviewLoadError')}

              <Button
                className={styles.retryButton}
                onPress={handleOverviewReloadPress}
              >
                {translate('Reload')}
              </Button>
            </Alert>
          ) : null}

          {saveAuthorMetadataOverrideError ? (
            <Alert kind={kinds.DANGER}>
              {translate('AuthorOverviewSaveError')}
            </Alert>
          ) : null}
        </Form>
      </ModalBody>

      <ModalFooter>
        {onDeleteAuthorPress ? (
          <Button
            className={styles.deleteButton}
            kind={kinds.DANGER}
            onPress={onDeleteAuthorPress}
          >
            {translate('Delete')}
          </Button>
        ) : null}

        <Button onPress={onModalClose}>{translate('Cancel')}</Button>

        <SpinnerErrorButton
          error={saveError}
          isSpinning={isSaving || isSavingAuthorMetadataOverride}
          onPress={handleSavePress}
        >
          {translate('Save')}
        </SpinnerErrorButton>
      </ModalFooter>

      <MoveAuthorModal
        originalPath={author.path}
        destinationPath={pendingChanges.path}
        isOpen={isConfirmMoveModalOpen}
        onSavePress={handleSavePress}
        onMoveAuthorPress={handleMoveAuthorPress}
      />
    </ModalContent>
  );
}

export default EditAuthorModalContent;
