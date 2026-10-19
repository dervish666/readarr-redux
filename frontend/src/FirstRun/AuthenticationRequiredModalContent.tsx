import { useQueryClient } from '@tanstack/react-query';
import React, { useCallback, useEffect } from 'react';
import Alert from 'Components/Alert';
import FormGroup from 'Components/Form/FormGroup';
import FormInputGroup from 'Components/Form/FormInputGroup';
import FormLabel from 'Components/Form/FormLabel';
import SpinnerButton from 'Components/Link/SpinnerButton';
import LoadingIndicator from 'Components/Loading/LoadingIndicator';
import ModalBody from 'Components/Modal/ModalBody';
import ModalContent from 'Components/Modal/ModalContent';
import ModalFooter from 'Components/Modal/ModalFooter';
import ModalHeader from 'Components/Modal/ModalHeader';
import usePrevious from 'Helpers/Hooks/usePrevious';
import { inputTypes, kinds } from 'Helpers/Props';
import {
  authenticationMethodOptions,
  authenticationRequiredOptions,
} from 'Settings/General/SecuritySettings';
import {
  GeneralSettingsModel,
  useManageGeneralSettings,
} from 'Settings/General/useGeneralSettings';
import { InputChanged } from 'typings/inputs';
import translate from 'Utilities/String/translate';
import styles from './AuthenticationRequiredModalContent.css';

function onModalClose() {
  // No-op
}

function AuthenticationRequiredModalContent() {
  const queryClient = useQueryClient();

  const { settings, isFetched, error, isSaving, updateSetting, saveSettings } =
    useManageGeneralSettings();

  const wasSaving = usePrevious(isSaving);

  const {
    authenticationMethod,
    authenticationRequired,
    username,
    password,
    passwordConfirmation,
  } = settings;

  const authenticationEnabled =
    authenticationMethod && authenticationMethod.value !== 'none';

  const handleInputChange = useCallback(
    ({ name, value }: InputChanged) => {
      updateSetting(
        name as keyof GeneralSettingsModel,
        value as GeneralSettingsModel[keyof GeneralSettingsModel]
      );
    },
    [updateSetting]
  );

  // Once a save ends (whatever the result), reload the status: Page closes this
  // modal when it says authentication is set up (or AuthenticationNoneConfirmed).
  useEffect(() => {
    if (!isSaving && wasSaving) {
      queryClient.invalidateQueries({ queryKey: ['/system/status'] });
    }
  }, [isSaving, wasSaving, queryClient]);

  return (
    <ModalContent showCloseButton={false} onModalClose={onModalClose}>
      <ModalHeader>{translate('AuthenticationRequired')}</ModalHeader>

      <ModalBody>
        <Alert className={styles.authRequiredAlert} kind={kinds.WARNING}>
          {translate('AuthenticationRequiredWarning')}
        </Alert>

        {isFetched && !error && authenticationMethod ? (
          <div>
            <FormGroup>
              <FormLabel>{translate('AuthenticationMethod')}</FormLabel>

              <FormInputGroup
                type={inputTypes.SELECT}
                name="authenticationMethod"
                values={authenticationMethodOptions}
                helpText={translate('AuthenticationMethodHelpText')}
                helpTextWarning={
                  authenticationMethod.value === 'none'
                    ? translate('AuthenticationMethodHelpTextWarning')
                    : undefined
                }
                helpLink="https://wiki.servarr.com/readarr/faq#forced-authentication"
                onChange={handleInputChange}
                {...authenticationMethod}
              />
            </FormGroup>

            <FormGroup>
              <FormLabel>{translate('AuthenticationRequired')}</FormLabel>

              <FormInputGroup
                type={inputTypes.SELECT}
                name="authenticationRequired"
                values={authenticationRequiredOptions}
                helpText={translate('AuthenticationRequiredHelpText')}
                onChange={handleInputChange}
                {...authenticationRequired}
              />
            </FormGroup>

            <FormGroup>
              <FormLabel>{translate('Username')}</FormLabel>

              <FormInputGroup
                type={inputTypes.TEXT}
                name="username"
                helpTextWarning={
                  username?.value
                    ? undefined
                    : translate('AuthenticationRequiredUsernameHelpTextWarning')
                }
                onChange={handleInputChange}
                {...username}
              />
            </FormGroup>

            <FormGroup>
              <FormLabel>{translate('Password')}</FormLabel>

              <FormInputGroup
                type={inputTypes.PASSWORD}
                name="password"
                helpTextWarning={
                  password?.value
                    ? undefined
                    : translate('AuthenticationRequiredPasswordHelpTextWarning')
                }
                onChange={handleInputChange}
                {...password}
              />
            </FormGroup>

            <FormGroup>
              <FormLabel>{translate('PasswordConfirmation')}</FormLabel>

              <FormInputGroup
                type={inputTypes.PASSWORD}
                name="passwordConfirmation"
                helpTextWarning={
                  passwordConfirmation?.value
                    ? undefined
                    : translate(
                        'AuthenticationRequiredPasswordConfirmationHelpTextWarning'
                      )
                }
                onChange={handleInputChange}
                {...passwordConfirmation}
              />
            </FormGroup>
          </div>
        ) : null}

        {!isFetched && !error ? <LoadingIndicator /> : null}
      </ModalBody>

      <ModalFooter>
        <SpinnerButton
          kind={kinds.PRIMARY}
          isSpinning={isSaving}
          isDisabled={!authenticationEnabled}
          onPress={saveSettings}
        >
          {translate('Save')}
        </SpinnerButton>
      </ModalFooter>
    </ModalContent>
  );
}

export default AuthenticationRequiredModalContent;
