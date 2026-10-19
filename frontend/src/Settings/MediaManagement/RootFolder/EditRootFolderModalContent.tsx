import { pick } from 'lodash';
import React, { useCallback, useMemo, useState } from 'react';
import AuthorMetadataProfilePopoverContent from 'AddAuthor/AuthorMetadataProfilePopoverContent';
import AuthorMonitoringOptionsPopoverContent from 'AddAuthor/AuthorMonitoringOptionsPopoverContent';
import AuthorMonitorNewItemsOptionsPopoverContent from 'AddAuthor/AuthorMonitorNewItemsOptionsPopoverContent';
import Alert from 'Components/Alert';
import FieldSet from 'Components/FieldSet';
import Form from 'Components/Form/Form';
import FormGroup from 'Components/Form/FormGroup';
import FormInputGroup from 'Components/Form/FormInputGroup';
import FormLabel from 'Components/Form/FormLabel';
import Icon from 'Components/Icon';
import Button from 'Components/Link/Button';
import SpinnerErrorButton from 'Components/Link/SpinnerErrorButton';
import LoadingIndicator from 'Components/Loading/LoadingIndicator';
import ModalBody from 'Components/Modal/ModalBody';
import ModalContent from 'Components/Modal/ModalContent';
import ModalFooter from 'Components/Modal/ModalFooter';
import ModalHeader from 'Components/Modal/ModalHeader';
import Popover from 'Components/Tooltip/Popover';
import { getValidationFailures } from 'Helpers/Hooks/useApiMutation';
import {
  calibreProfiles,
  icons,
  inputTypes,
  kinds,
  tooltipPositions,
} from 'Helpers/Props';
import { useRootFolder, useSaveRootFolder } from 'RootFolder/useRootFolders';
import { useShowAdvancedSettings } from 'Settings/advancedSettingsStore';
import { useMetadataProfiles } from 'Settings/Profiles/Metadata/useMetadataProfiles';
import { ValidationFailure } from 'typings/pending';
import RootFolder from 'typings/RootFolder';
import { ApiError } from 'Utilities/Fetch/fetchJson';
import translate from 'Utilities/String/translate';
import styles from './EditRootFolderModalContent.module.css';

type EditableRootFolder = Omit<
  RootFolder,
  'id' | 'accessible' | 'freeSpace' | 'totalSpace'
>;

type Changes = Partial<EditableRootFolder>;

// What a new root folder starts with (the old redux schema).
const NEW_ROOT_FOLDER: EditableRootFolder = {
  name: '',
  path: '',
  defaultQualityProfileId: 0,
  defaultMetadataProfileId: 0,
  defaultMonitorOption: 'all',
  defaultNewItemMonitorOption: 'all',
  defaultTags: [],
  isCalibreLibrary: false,
  host: 'localhost',
  port: 8080,
  urlBase: '',
  username: '',
  password: '',
  library: '',
  outputFormat: '',
  outputProfile: 'default',
  useSsl: false,
};

interface FieldMessage {
  message: string;
  link?: string;
  detailedMessage?: string;
}

interface FieldSetting<T> {
  value: T;
  errors: FieldMessage[];
  warnings: FieldMessage[];
  pending: boolean;
}

type FieldSettings = {
  [K in keyof EditableRootFolder]: FieldSetting<EditableRootFolder[K]>;
};

function toMessage(failure: ValidationFailure): FieldMessage {
  return {
    message: failure.errorMessage,
    link: failure.infoLink,
    detailedMessage: failure.detailedDescription,
  };
}

// The per-field { value, errors, warnings, pending } FormInputGroup expects, plus the
// failures that belong to no field, for the form's own banner.
function getFieldSettings(
  item: EditableRootFolder,
  changes: Changes,
  saveError: ApiError | null
) {
  const { errors, warnings } = getValidationFailures(saveError);
  const unmatched = [...errors, ...warnings];

  const takeFailures = (key: string, isWarning: boolean) => {
    const matching = unmatched.filter(
      (f) =>
        f.isWarning === isWarning &&
        f.propertyName.toLowerCase() === key.toLowerCase()
    );

    matching.forEach((f) => unmatched.splice(unmatched.indexOf(f), 1));

    return matching.map(toMessage);
  };

  const settings = {} as Record<string, FieldSetting<unknown>>;

  (Object.keys(item) as (keyof EditableRootFolder)[]).forEach((key) => {
    settings[key] = {
      value: key in changes ? changes[key] : item[key],
      errors: takeFailures(key, false),
      warnings: takeFailures(key, true),
      pending: key in changes,
    };
  });

  return {
    settings: settings as FieldSettings,
    validationErrors: unmatched.filter((f) => !f.isWarning),
    validationWarnings: unmatched.filter((f) => f.isWarning),
  };
}

export interface EditRootFolderModalContentProps {
  id?: number;
  onModalClose: () => void;
  onDeleteRootFolderPress?: () => void;
  onRootFolderAdded?: (path: string) => void;
}

function EditRootFolderModalContent({
  id,
  onModalClose,
  onDeleteRootFolderPress,
  onRootFolderAdded,
}: EditRootFolderModalContentProps) {
  const { data: rootFolder, isFetching, error } = useRootFolder(id);
  const { saveRootFolder, isSaving, saveError } = useSaveRootFolder(id);
  const [changes, setChanges] = useState<Changes>({});

  const advancedSettings = useShowAdvancedSettings();
  const { data: metadataProfiles } = useMetadataProfiles();
  const showMetadataProfile = metadataProfiles.length > 1;

  const item: EditableRootFolder = useMemo(() => {
    if (!rootFolder) {
      return NEW_ROOT_FOLDER;
    }

    return pick(rootFolder, Object.keys(NEW_ROOT_FOLDER)) as EditableRootFolder;
  }, [rootFolder]);

  const { settings, validationErrors, validationWarnings } = useMemo(
    () => getFieldSettings(item, changes, saveError),
    [item, changes, saveError]
  );

  const {
    name,
    path,
    defaultQualityProfileId,
    defaultMetadataProfileId,
    defaultMonitorOption,
    defaultNewItemMonitorOption,
    defaultTags,
    isCalibreLibrary,
    host,
    port,
    urlBase,
    username,
    password,
    library,
    outputFormat,
    outputProfile,
    useSsl,
  } = settings;

  const profileHelpText = calibreProfiles.options.find(
    (option: { key: string }) => option.key === outputProfile.value
  )?.description;

  const isLoading = !!id && isFetching && !rootFolder;
  const loadError = !!id && !isFetching && (error || !rootFolder);

  const handleInputChange = useCallback(
    ({ name, value }: { name: string; value: unknown }) => {
      setChanges((current) => ({ ...current, [name]: value }));
    },
    []
  );

  const handleSavePress = useCallback(() => {
    saveRootFolder(
      { ...item, ...changes, ...(id ? { id } : {}) },
      {
        onSuccess: (saved) => {
          onRootFolderAdded?.(saved.path);
          onModalClose();
        },
      }
    );
  }, [id, item, changes, saveRootFolder, onRootFolderAdded, onModalClose]);

  return (
    <ModalContent onModalClose={onModalClose}>
      <ModalHeader>
        {id ? translate('EditRootFolder') : translate('AddRootFolder')}
      </ModalHeader>

      <ModalBody>
        {isLoading ? <LoadingIndicator /> : null}

        {!isLoading && loadError ? (
          <div>{translate('UnableToAddANewRootFolderPleaseTryAgain')}</div>
        ) : null}

        {!isLoading && !loadError ? (
          <Form
            validationErrors={validationErrors}
            validationWarnings={validationWarnings}
          >
            <FieldSet legend={translate('RootFolder')}>
              <FormGroup>
                <FormLabel>{translate('Name')}</FormLabel>

                <FormInputGroup
                  type={inputTypes.TEXT}
                  name="name"
                  {...name}
                  onChange={handleInputChange}
                />
              </FormGroup>

              <FormGroup>
                <FormLabel>{translate('Path')}</FormLabel>

                <FormInputGroup
                  type={id ? inputTypes.TEXT : inputTypes.PATH}
                  {...{ readOnly: !!id }}
                  name="path"
                  helpText={translate('PathHelpText')}
                  helpTextWarning={translate('PathHelpTextWarning')}
                  {...path}
                  onChange={handleInputChange}
                />
              </FormGroup>
            </FieldSet>

            <FieldSet legend={translate('AddedAuthorSettings')}>
              <FormGroup>
                <FormLabel>
                  {translate('Monitor')}

                  <Popover
                    anchor={
                      <Icon className={styles.labelIcon} name={icons.INFO} />
                    }
                    title={translate('MonitoringOptions')}
                    body={<AuthorMonitoringOptionsPopoverContent />}
                    position={tooltipPositions.RIGHT}
                  />
                </FormLabel>

                <FormInputGroup
                  type={inputTypes.MONITOR_BOOKS_SELECT}
                  name="defaultMonitorOption"
                  {...defaultMonitorOption}
                  helpText={translate('DefaultMonitorOptionHelpText')}
                  onChange={handleInputChange}
                />
              </FormGroup>

              <FormGroup>
                <FormLabel>
                  {translate('MonitorNewItems')}

                  <Popover
                    anchor={
                      <Icon className={styles.labelIcon} name={icons.INFO} />
                    }
                    title={translate('MonitorNewItems')}
                    body={<AuthorMonitorNewItemsOptionsPopoverContent />}
                    position={tooltipPositions.RIGHT}
                  />
                </FormLabel>

                <FormInputGroup
                  type={inputTypes.MONITOR_NEW_ITEMS_SELECT}
                  name="defaultNewItemMonitorOption"
                  {...defaultNewItemMonitorOption}
                  helpText={translate('MonitorNewItemsHelpText')}
                  onChange={handleInputChange}
                />
              </FormGroup>

              <FormGroup>
                <FormLabel>{translate('QualityProfile')}</FormLabel>

                <FormInputGroup
                  type={inputTypes.QUALITY_PROFILE_SELECT}
                  name="defaultQualityProfileId"
                  helpText={translate('DefaultQualityProfileIdHelpText')}
                  {...defaultQualityProfileId}
                  onChange={handleInputChange}
                />
              </FormGroup>

              <FormGroup
                className={
                  showMetadataProfile ? undefined : styles.hideMetadataProfile
                }
              >
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
                  name="defaultMetadataProfileId"
                  helpText={translate('DefaultMetadataProfileIdHelpText')}
                  {...defaultMetadataProfileId}
                  {...{ includeNone: true }}
                  onChange={handleInputChange}
                />
              </FormGroup>

              <FormGroup>
                <FormLabel>{translate('DefaultReadarrTags')}</FormLabel>

                <FormInputGroup
                  type={inputTypes.TAG}
                  name="defaultTags"
                  helpText={translate('DefaultTagsHelpText')}
                  {...defaultTags}
                  onChange={handleInputChange}
                />
              </FormGroup>
            </FieldSet>

            <FieldSet legend={translate('CalibreSettings')}>
              <Alert>{translate('CalibreNotCalibreWeb')}</Alert>

              <FormGroup>
                <FormLabel>
                  {translate('UseCalibreContentServer')}

                  <Popover
                    anchor={
                      <Icon className={styles.labelIcon} name={icons.INFO} />
                    }
                    title={translate('CalibreContentServer')}
                    body={translate('CalibreContentServerText')}
                    position={tooltipPositions.RIGHT}
                  />
                </FormLabel>

                <FormInputGroup
                  type={inputTypes.CHECK}
                  isDisabled={!!id}
                  name="isCalibreLibrary"
                  helpText={translate('IsCalibreLibraryHelpText')}
                  helpLink="https://manual.calibre-ebook.com/server.html"
                  {...isCalibreLibrary}
                  onChange={handleInputChange}
                />
              </FormGroup>

              {isCalibreLibrary.value ? (
                <div>
                  <FormGroup>
                    <FormLabel>{translate('CalibreHost')}</FormLabel>

                    <FormInputGroup
                      type={inputTypes.TEXT}
                      name="host"
                      helpText={translate('HostHelpText')}
                      {...host}
                      onChange={handleInputChange}
                    />
                  </FormGroup>

                  <FormGroup>
                    <FormLabel>{translate('CalibrePort')}</FormLabel>

                    <FormInputGroup
                      type={inputTypes.NUMBER}
                      name="port"
                      helpText={translate('PortHelpText')}
                      {...port}
                      onChange={handleInputChange}
                    />
                  </FormGroup>

                  <FormGroup
                    advancedSettings={advancedSettings}
                    isAdvanced={true}
                  >
                    <FormLabel>{translate('CalibreUrlBase')}</FormLabel>

                    <FormInputGroup
                      type={inputTypes.TEXT}
                      name="urlBase"
                      helpText={translate('UrlBaseHelpText')}
                      {...urlBase}
                      onChange={handleInputChange}
                    />
                  </FormGroup>

                  <FormGroup>
                    <FormLabel>{translate('CalibreUsername')}</FormLabel>

                    <FormInputGroup
                      type={inputTypes.TEXT}
                      name="username"
                      helpText={translate('UsernameHelpText')}
                      {...username}
                      onChange={handleInputChange}
                    />
                  </FormGroup>

                  <FormGroup>
                    <FormLabel>{translate('CalibrePassword')}</FormLabel>

                    <FormInputGroup
                      type={inputTypes.PASSWORD}
                      name="password"
                      helpText={translate('PasswordHelpText')}
                      {...password}
                      onChange={handleInputChange}
                    />
                  </FormGroup>

                  <FormGroup>
                    <FormLabel>{translate('CalibreLibrary')}</FormLabel>

                    <FormInputGroup
                      type={inputTypes.TEXT}
                      name="library"
                      helpText={translate('LibraryHelpText')}
                      {...library}
                      onChange={handleInputChange}
                    />
                  </FormGroup>

                  <FormGroup>
                    <FormLabel>
                      {translate('ConvertToFormat')}

                      <Popover
                        anchor={
                          <Icon
                            className={styles.labelIcon}
                            name={icons.INFO}
                          />
                        }
                        title={translate('CalibreOutputFormat')}
                        body="Specify the output format.  Options are: MOBI, EPUB, AZW3, DOCX, FB2, HTMLZ, LIT, LRF, PDB, PDF, PMLZ, RB, RTF, SNB, TCR, TXT, TXTZ, ZIP"
                        position={tooltipPositions.RIGHT}
                      />
                    </FormLabel>

                    <FormInputGroup
                      type={inputTypes.TEXT}
                      name="outputFormat"
                      helpText={translate('OutputFormatHelpText')}
                      {...outputFormat}
                      onChange={handleInputChange}
                    />
                  </FormGroup>

                  <FormGroup>
                    <FormLabel>
                      {translate('CalibreOutputProfile')}

                      <Popover
                        anchor={
                          <Icon
                            className={styles.labelIcon}
                            name={icons.INFO}
                          />
                        }
                        title={translate('CalibreOutputProfile')}
                        body="Specify the output profile. The output profile tells the Calibre conversion system how to optimize the created document for the specified device (such as by resizing images for the device screen size). In some cases, an output profile can be used to optimize the output for a particular device, but this is rarely necessary."
                        position={tooltipPositions.RIGHT}
                      />
                    </FormLabel>

                    <FormInputGroup
                      type={inputTypes.SELECT}
                      name="outputProfile"
                      values={calibreProfiles.options}
                      helpText={profileHelpText}
                      {...outputProfile}
                      onChange={handleInputChange}
                    />
                  </FormGroup>

                  <FormGroup>
                    <FormLabel>{translate('UseSSL')}</FormLabel>

                    <FormInputGroup
                      type={inputTypes.CHECK}
                      name="useSsl"
                      helpText={translate('UseSslHelpText')}
                      {...useSsl}
                      onChange={handleInputChange}
                    />
                  </FormGroup>
                </div>
              ) : null}
            </FieldSet>
          </Form>
        ) : null}
      </ModalBody>

      <ModalFooter>
        {id ? (
          <Button
            className={styles.deleteButton}
            kind={kinds.DANGER}
            onPress={onDeleteRootFolderPress}
          >
            {translate('Delete')}
          </Button>
        ) : null}

        <Button onPress={onModalClose}>{translate('Cancel')}</Button>

        <SpinnerErrorButton
          isSpinning={isSaving}
          error={saveError}
          onPress={handleSavePress}
        >
          {translate('Save')}
        </SpinnerErrorButton>
      </ModalFooter>
    </ModalContent>
  );
}

export default EditRootFolderModalContent;
