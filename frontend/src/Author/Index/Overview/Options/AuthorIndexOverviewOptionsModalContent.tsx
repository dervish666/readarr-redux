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
  AuthorIndexOverviewOptions,
  setAuthorIndexOverviewOptions,
  useAuthorIndexOverviewOptions,
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

interface AuthorIndexOverviewOptionsModalContentProps {
  onModalClose(): void;
}

// Changes apply at once, as the redux options did.
function AuthorIndexOverviewOptionsModalContent({
  onModalClose,
}: AuthorIndexOverviewOptionsModalContentProps) {
  const options = useAuthorIndexOverviewOptions();

  const handleChange = useCallback(({ name, value }: InputChanged) => {
    setAuthorIndexOverviewOptions({
      [name]: value,
    } as Partial<AuthorIndexOverviewOptions>);
  }, []);

  return (
    <ModalContent onModalClose={onModalClose}>
      <ModalHeader>{translate('OverviewOptions')}</ModalHeader>

      <ModalBody>
        <Form>
          <FormGroup>
            <FormLabel>{translate('NameStyle')}</FormLabel>

            <FormInputGroup
              type={inputTypes.SELECT}
              name="showTitle"
              value={options.showTitle}
              values={nameOptions}
              onChange={handleChange}
            />
          </FormGroup>

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
            <FormLabel>{translate('ShowMonitored')}</FormLabel>

            <FormInputGroup
              type={inputTypes.CHECK}
              name="showMonitored"
              value={options.showMonitored}
              onChange={handleChange}
            />
          </FormGroup>

          <FormGroup>
            <FormLabel>{translate('ShowQualityProfile')}</FormLabel>

            <FormInputGroup
              type={inputTypes.CHECK}
              name="showQualityProfile"
              value={options.showQualityProfile}
              onChange={handleChange}
            />
          </FormGroup>

          <FormGroup>
            <FormLabel>{translate('ShowLastBook')}</FormLabel>

            <FormInputGroup
              type={inputTypes.CHECK}
              name="showLastBook"
              value={options.showLastBook}
              onChange={handleChange}
            />
          </FormGroup>

          <FormGroup>
            <FormLabel>{translate('ShowDateAdded')}</FormLabel>

            <FormInputGroup
              type={inputTypes.CHECK}
              name="showAdded"
              value={options.showAdded}
              onChange={handleChange}
            />
          </FormGroup>

          <FormGroup>
            <FormLabel>{translate('ShowBookCount')}</FormLabel>

            <FormInputGroup
              type={inputTypes.CHECK}
              name="showBookCount"
              value={options.showBookCount}
              onChange={handleChange}
            />
          </FormGroup>

          <FormGroup>
            <FormLabel>{translate('ShowPath')}</FormLabel>

            <FormInputGroup
              type={inputTypes.CHECK}
              name="showPath"
              value={options.showPath}
              onChange={handleChange}
            />
          </FormGroup>

          <FormGroup>
            <FormLabel>{translate('ShowSizeOnDisk')}</FormLabel>

            <FormInputGroup
              type={inputTypes.CHECK}
              name="showSizeOnDisk"
              value={options.showSizeOnDisk}
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

export default AuthorIndexOverviewOptionsModalContent;
