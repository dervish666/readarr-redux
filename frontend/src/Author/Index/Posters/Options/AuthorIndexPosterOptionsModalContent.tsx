import React, { useCallback } from 'react';
import Form from 'Components/Form/Form';
import FormGroup from 'Components/Form/FormGroup';
import FormInputGroup from 'Components/Form/FormInputGroup';
import FormLabel from 'Components/Form/FormLabel';
import Button from 'Components/Link/Button';
import ModalBody from 'Components/Modal/ModalBody';
import ModalContent from 'Components/Modal/ModalContent';
import ModalFooter from 'Components/Modal/ModalFooter';
import ModalHeader from 'Components/Modal/ModalHeader';
import { inputTypes } from 'Helpers/Props';
import { InputChanged } from 'typings/inputs';
import translate from 'Utilities/String/translate';
import {
  AuthorIndexPosterOptions,
  setAuthorIndexPosterOptions,
  useAuthorIndexPosterOptions,
} from '../../authorIndexOptionsStore';

const posterSizeOptions = [
  {
    key: 'small',
    get value() {
      return translate('Small');
    },
  },
  {
    key: 'medium',
    get value() {
      return translate('Medium');
    },
  },
  {
    key: 'large',
    get value() {
      return translate('Large');
    },
  },
];

const nameOptions = [
  {
    key: 'no',
    get value() {
      return translate('NoName');
    },
  },
  {
    key: 'firstLast',
    get value() {
      return translate('NameFirstLast');
    },
  },
  {
    key: 'lastFirst',
    get value() {
      return translate('NameLastFirst');
    },
  },
];

interface AuthorIndexPosterOptionsModalContentProps {
  onModalClose(): void;
}

// Changes apply at once, as the redux options did.
function AuthorIndexPosterOptionsModalContent({
  onModalClose,
}: AuthorIndexPosterOptionsModalContentProps) {
  const options = useAuthorIndexPosterOptions();

  const handleChange = useCallback(({ name, value }: InputChanged) => {
    setAuthorIndexPosterOptions({
      [name]: value,
    } as Partial<AuthorIndexPosterOptions>);
  }, []);

  return (
    <ModalContent onModalClose={onModalClose}>
      <ModalHeader>{translate('PosterOptions')}</ModalHeader>

      <ModalBody>
        <Form>
          <FormGroup>
            <FormLabel>{translate('PosterSize')}</FormLabel>

            <FormInputGroup
              type={inputTypes.SELECT}
              name="size"
              value={options.size}
              values={posterSizeOptions}
              onChange={handleChange}
            />
          </FormGroup>

          <FormGroup>
            <FormLabel>{translate('DetailedProgressBar')}</FormLabel>

            <FormInputGroup
              type={inputTypes.CHECK}
              name="detailedProgressBar"
              value={options.detailedProgressBar}
              helpText={translate('DetailedProgressBarHelpText')}
              onChange={handleChange}
            />
          </FormGroup>

          <FormGroup>
            <FormLabel>{translate('ShowName')}</FormLabel>

            <FormInputGroup
              type={inputTypes.SELECT}
              name="showTitle"
              value={options.showTitle}
              values={nameOptions}
              helpText={translate('ShowTitleHelpText')}
              onChange={handleChange}
            />
          </FormGroup>

          <FormGroup>
            <FormLabel>{translate('ShowMonitored')}</FormLabel>

            <FormInputGroup
              type={inputTypes.CHECK}
              name="showMonitored"
              value={options.showMonitored}
              helpText={translate('ShowMonitoredHelpText')}
              onChange={handleChange}
            />
          </FormGroup>

          <FormGroup>
            <FormLabel>{translate('ShowQualityProfile')}</FormLabel>

            <FormInputGroup
              type={inputTypes.CHECK}
              name="showQualityProfile"
              value={options.showQualityProfile}
              helpText={translate('ShowQualityProfileHelpText')}
              onChange={handleChange}
            />
          </FormGroup>

          <FormGroup>
            <FormLabel>{translate('ShowSearch')}</FormLabel>

            <FormInputGroup
              type={inputTypes.CHECK}
              name="showSearchAction"
              value={options.showSearchAction}
              helpText={translate('ShowSearchActionHelpText')}
              onChange={handleChange}
            />
          </FormGroup>
        </Form>
      </ModalBody>

      <ModalFooter>
        <Button onPress={onModalClose}>{translate('Close')}</Button>
      </ModalFooter>
    </ModalContent>
  );
}

export default AuthorIndexPosterOptionsModalContent;
