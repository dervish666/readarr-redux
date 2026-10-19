import React, { useCallback, useEffect, useMemo } from 'react';
import Alert from 'Components/Alert';
import Form from 'Components/Form/Form';
import FormGroup from 'Components/Form/FormGroup';
import FormInputGroup from 'Components/Form/FormInputGroup';
import FormLabel from 'Components/Form/FormLabel';
import Button from 'Components/Link/Button';
import SpinnerErrorButton from 'Components/Link/SpinnerErrorButton';
import ModalBody from 'Components/Modal/ModalBody';
import ModalContent from 'Components/Modal/ModalContent';
import ModalFooter from 'Components/Modal/ModalFooter';
import ModalHeader from 'Components/Modal/ModalHeader';
import usePrevious from 'Helpers/Hooks/usePrevious';
import { inputTypes, kinds } from 'Helpers/Props';
import translate from 'Utilities/String/translate';
import {
  DEFAULT_DELAY_PROFILE_ID,
  DelayProfileModel,
  useManageDelayProfile,
} from './useDelayProfiles';
import styles from './EditDelayProfileModalContent.css';

type Protocol = 'preferUsenet' | 'preferTorrent' | 'onlyUsenet' | 'onlyTorrent';

const protocolOptions: { key: Protocol; value: () => string }[] = [
  { key: 'preferUsenet', value: () => translate('PreferUsenet') },
  { key: 'preferTorrent', value: () => translate('PreferTorrent') },
  { key: 'onlyUsenet', value: () => translate('OnlyUsenet') },
  { key: 'onlyTorrent', value: () => translate('OnlyTorrent') },
];

const protocolSettings: Record<
  Protocol,
  Pick<
    DelayProfileModel,
    'enableUsenet' | 'enableTorrent' | 'preferredProtocol'
  >
> = {
  preferUsenet: {
    enableUsenet: true,
    enableTorrent: true,
    preferredProtocol: 'usenet',
  },
  preferTorrent: {
    enableUsenet: true,
    enableTorrent: true,
    preferredProtocol: 'torrent',
  },
  onlyUsenet: {
    enableUsenet: true,
    enableTorrent: false,
    preferredProtocol: 'usenet',
  },
  onlyTorrent: {
    enableUsenet: false,
    enableTorrent: true,
    preferredProtocol: 'torrent',
  },
};

interface EditDelayProfileModalContentProps {
  id?: number;
  onModalClose: () => void;
  onDeleteDelayProfilePress?: () => void;
}

function EditDelayProfileModalContent({
  id,
  onModalClose,
  onDeleteDelayProfilePress,
}: EditDelayProfileModalContentProps) {
  const {
    item,
    isSaving,
    saveError,
    validationErrors,
    validationWarnings,
    updateValue,
    saveProvider,
  } = useManageDelayProfile(id);

  const {
    enableUsenet,
    enableTorrent,
    preferredProtocol,
    usenetDelay,
    torrentDelay,
    bypassIfHighestQuality,
    bypassIfAboveCustomFormatScore,
    minimumCustomFormatScore,
    tags,
  } = item;

  const wasSaving = usePrevious(isSaving);

  const protocol = useMemo<Protocol>(() => {
    if (!enableUsenet.value) {
      return 'onlyTorrent';
    }

    if (!enableTorrent.value) {
      return 'onlyUsenet';
    }

    return preferredProtocol.value === 'usenet'
      ? 'preferUsenet'
      : 'preferTorrent';
  }, [enableUsenet, enableTorrent, preferredProtocol]);

  const values = useMemo(
    () =>
      protocolOptions.map(({ key, value }) => ({
        key,
        value: value(),
      })),
    []
  );

  const handleInputChange = useCallback(
    ({ name, value }: { name: string; value: unknown }) => {
      updateValue(
        name as keyof DelayProfileModel,
        value as DelayProfileModel[keyof DelayProfileModel]
      );
    },
    [updateValue]
  );

  const handleProtocolChange = useCallback(
    ({ value }: { value: Protocol }) => {
      const settings = protocolSettings[value];

      updateValue('enableUsenet', settings.enableUsenet);
      updateValue('enableTorrent', settings.enableTorrent);
      updateValue('preferredProtocol', settings.preferredProtocol);
    },
    [updateValue]
  );

  useEffect(() => {
    if (wasSaving && !isSaving && !saveError) {
      onModalClose();
    }
  }, [isSaving, wasSaving, saveError, onModalClose]);

  return (
    <ModalContent onModalClose={onModalClose}>
      <ModalHeader>
        {id ? translate('EditDelayProfile') : translate('AddDelayProfile')}
      </ModalHeader>

      <ModalBody>
        <Form
          validationErrors={validationErrors}
          validationWarnings={validationWarnings}
        >
          <FormGroup>
            <FormLabel>{translate('Protocol')}</FormLabel>

            <FormInputGroup
              type={inputTypes.SELECT}
              name="protocol"
              value={protocol}
              values={values}
              helpText={translate('ProtocolHelpText')}
              onChange={handleProtocolChange}
            />
          </FormGroup>

          {enableUsenet.value ? (
            <FormGroup>
              <FormLabel>{translate('UsenetDelay')}</FormLabel>

              <FormInputGroup
                type={inputTypes.NUMBER}
                name="usenetDelay"
                {...{ unit: 'minutes' }}
                {...usenetDelay}
                helpText={translate('UsenetDelayHelpText')}
                onChange={handleInputChange}
              />
            </FormGroup>
          ) : null}

          {enableTorrent.value ? (
            <FormGroup>
              <FormLabel>{translate('TorrentDelay')}</FormLabel>

              <FormInputGroup
                type={inputTypes.NUMBER}
                name="torrentDelay"
                {...{ unit: 'minutes' }}
                {...torrentDelay}
                helpText={translate('TorrentDelayHelpText')}
                onChange={handleInputChange}
              />
            </FormGroup>
          ) : null}

          <FormGroup>
            <FormLabel>{translate('BypassIfHighestQuality')}</FormLabel>

            <FormInputGroup
              type={inputTypes.CHECK}
              name="bypassIfHighestQuality"
              {...bypassIfHighestQuality}
              helpText={translate('BypassIfHighestQualityHelpText')}
              onChange={handleInputChange}
            />
          </FormGroup>

          <FormGroup>
            <FormLabel>{translate('BypassIfAboveCustomFormatScore')}</FormLabel>

            <FormInputGroup
              type={inputTypes.CHECK}
              name="bypassIfAboveCustomFormatScore"
              {...bypassIfAboveCustomFormatScore}
              helpText={translate('BypassIfAboveCustomFormatScoreHelpText')}
              onChange={handleInputChange}
            />
          </FormGroup>

          {bypassIfAboveCustomFormatScore.value ? (
            <FormGroup>
              <FormLabel>{translate('MinimumCustomFormatScore')}</FormLabel>

              <FormInputGroup
                type={inputTypes.NUMBER}
                name="minimumCustomFormatScore"
                {...minimumCustomFormatScore}
                helpText={translate('MinimumCustomFormatScoreHelpText')}
                onChange={handleInputChange}
              />
            </FormGroup>
          ) : null}

          {id === DEFAULT_DELAY_PROFILE_ID ? (
            <Alert>{translate('DefaultDelayProfileHelpText')}</Alert>
          ) : (
            <FormGroup>
              <FormLabel>{translate('Tags')}</FormLabel>

              <FormInputGroup
                type={inputTypes.TAG}
                name="tags"
                {...tags}
                helpText={translate('TagsHelpText')}
                onChange={handleInputChange}
              />
            </FormGroup>
          )}
        </Form>
      </ModalBody>

      <ModalFooter>
        {id && id !== DEFAULT_DELAY_PROFILE_ID ? (
          <Button
            className={styles.deleteButton}
            kind={kinds.DANGER}
            onPress={onDeleteDelayProfilePress}
          >
            {translate('Delete')}
          </Button>
        ) : null}

        <Button onPress={onModalClose}>{translate('Cancel')}</Button>

        <SpinnerErrorButton
          isSpinning={isSaving}
          error={saveError}
          onPress={saveProvider}
        >
          {translate('Save')}
        </SpinnerErrorButton>
      </ModalFooter>
    </ModalContent>
  );
}

export default EditDelayProfileModalContent;
