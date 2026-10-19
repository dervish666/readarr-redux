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
  BookIndexPosterOptions,
  setBookIndexPosterOptions,
  useBookIndexPosterOptions,
} from '../../bookIndexOptionsStore';

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

interface BookIndexPosterOptionsModalContentProps {
  onModalClose(): void;
}

// Changes apply at once, as the redux options did.
function BookIndexPosterOptionsModalContent({
  onModalClose,
}: BookIndexPosterOptionsModalContentProps) {
  const options = useBookIndexPosterOptions();

  const handleChange = useCallback(({ name, value }: InputChanged) => {
    setBookIndexPosterOptions({
      [name]: value,
    } as Partial<BookIndexPosterOptions>);
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
            <FormLabel>{translate('ShowTitle')}</FormLabel>

            <FormInputGroup
              type={inputTypes.CHECK}
              name="showTitle"
              value={options.showTitle}
              helpText={translate('ShowBookTitleHelpText')}
              onChange={handleChange}
            />
          </FormGroup>

          <FormGroup>
            <FormLabel>{translate('ShowName')}</FormLabel>

            <FormInputGroup
              type={inputTypes.CHECK}
              name="showAuthor"
              value={options.showAuthor}
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

export default BookIndexPosterOptionsModalContent;
