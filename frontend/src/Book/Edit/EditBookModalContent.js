import PropTypes from 'prop-types';
import React, { Component } from 'react';
import Alert from 'Components/Alert';
import FieldSet from 'Components/FieldSet';
import Form from 'Components/Form/Form';
import FormGroup from 'Components/Form/FormGroup';
import FormInputGroup from 'Components/Form/FormInputGroup';
import FormLabel from 'Components/Form/FormLabel';
import Button from 'Components/Link/Button';
import SpinnerButton from 'Components/Link/SpinnerButton';
import LoadingIndicator from 'Components/Loading/LoadingIndicator';
import ModalBody from 'Components/Modal/ModalBody';
import ModalContent from 'Components/Modal/ModalContent';
import ModalFooter from 'Components/Modal/ModalFooter';
import ModalHeader from 'Components/Modal/ModalHeader';
import { inputTypes, kinds } from 'Helpers/Props';
import createAjaxRequest from 'Utilities/createAjaxRequest';
import getErrorMessage from 'Utilities/Object/getErrorMessage';
import translate from 'Utilities/String/translate';
import BookSeriesEditor, { NEW_SERIES } from './BookSeriesEditor';

function toDateInput(date) {
  return date ? date.substring(0, 10) : '';
}

// The user's values for the book. Empty fields go back to the metadata source's values.
function toMetadataRequest(metadata) {
  const releaseDate = metadata.releaseDate.trim();

  return {
    title: metadata.title.trim() || null,
    releaseDate: releaseDate ? `${releaseDate}T00:00:00Z` : null,
    overview: metadata.overview.trim() || null,
    pageCount: metadata.pageCount ? metadata.pageCount : null,
    series: metadata.series
      .filter((row) => row.seriesId !== NEW_SERIES || row.newSeriesTitle.trim())
      .map((row) => ({
        seriesId: row.seriesId === NEW_SERIES ? 0 : row.seriesId,
        newSeriesTitle: row.seriesId === NEW_SERIES ? row.newSeriesTitle.trim() : null,
        position: row.position
      }))
  };
}

class EditBookModalContent extends Component {

  //
  // Lifecycle

  constructor(props, context) {
    super(props, context);

    this.state = {
      isMetadataFetching: true,
      metadataError: null,
      isMetadataSaving: false,
      metadataSaveError: null,
      metadata: null,
      availableSeries: []
    };
  }

  componentDidMount() {
    this._metadataRequest = createAjaxRequest({
      url: `/book/${this.props.bookId}/metadata`
    });

    this._metadataRequest.request.done((data) => {
      this.setState({
        isMetadataFetching: false,
        availableSeries: data.availableSeries,
        metadata: {
          title: data.title || '',
          releaseDate: toDateInput(data.releaseDate),
          overview: data.overview || '',
          pageCount: data.pageCount,
          series: data.series.map((row) => ({ ...row, newSeriesTitle: '' }))
        }
      });
    });

    this._metadataRequest.request.fail((xhr) => {
      if (!xhr.aborted) {
        this.setState({ isMetadataFetching: false, metadataError: xhr });
      }
    });
  }

  componentWillUnmount() {
    if (this._metadataRequest) {
      this._metadataRequest.abortRequest();
    }
  }

  //
  // Listeners

  onMetadataChange = ({ name, value }) => {
    this.setState({ metadata: { ...this.state.metadata, [name]: value } });
  };

  onSeriesChange = (series) => {
    this.onMetadataChange({ name: 'series', value: series });
  };

  onSavePress = () => {
    const {
      bookId,
      onSavePress
    } = this.props;

    const {
      metadata
    } = this.state;

    if (!metadata) {
      onSavePress(false);
      return;
    }

    this.setState({ isMetadataSaving: true, metadataSaveError: null });

    const promise = createAjaxRequest({
      url: `/book/${bookId}/metadata`,
      method: 'PUT',
      contentType: 'application/json',
      dataType: 'json',
      data: JSON.stringify(toMetadataRequest(metadata))
    }).request;

    promise.done(() => {
      this.setState({ isMetadataSaving: false });
      onSavePress(true);
    });

    promise.fail((xhr) => {
      this.setState({ isMetadataSaving: false, metadataSaveError: xhr });
    });
  };

  //
  // Render

  render() {
    const {
      title,
      authorName,
      statistics,
      item,
      isFetching,
      isPopulated,
      error,
      isSaving,
      onInputChange,
      onModalClose,
      ...otherProps
    } = this.props;

    const {
      monitored,
      anyEditionOk,
      editions
    } = item;

    const {
      isMetadataFetching,
      metadataError,
      isMetadataSaving,
      metadataSaveError,
      metadata,
      availableSeries
    } = this.state;

    const hasFile = statistics ? statistics.bookFileCount > 0 : false;
    const errorMessage = getErrorMessage(error, 'Unable to load editions');

    return (
      <ModalContent onModalClose={onModalClose}>
        <ModalHeader>
          Edit - {authorName} - {title}
        </ModalHeader>

        <ModalBody>
          <Form
            {...otherProps}
          >
            <FormGroup>
              <FormLabel>
                {translate('Monitored')}
              </FormLabel>

              <FormInputGroup
                type={inputTypes.CHECK}
                name="monitored"
                helpText={translate('MonitoredHelpText')}
                {...monitored}
                onChange={onInputChange}
              />
            </FormGroup>

            <FormGroup>
              <FormLabel>
                {translate('AutomaticallySwitchEdition')}
              </FormLabel>

              <FormInputGroup
                type={inputTypes.CHECK}
                name="anyEditionOk"
                helpText={translate('AnyEditionOkHelpText')}
                {...anyEditionOk}
                onChange={onInputChange}
              />
            </FormGroup>

            {
              isFetching &&
                <LoadingIndicator />
            }

            {
              error &&
                <div>{errorMessage}</div>
            }

            {
              isPopulated && !isFetching && !!editions.value.length &&
                <FormGroup>
                  <FormLabel>
                    {translate('Edition')}
                  </FormLabel>

                  <FormInputGroup
                    type={inputTypes.BOOK_EDITION_SELECT}
                    name="editions"
                    helpText={translate('EditionsHelpText')}
                    isDisabled={anyEditionOk.value && hasFile}
                    bookEditions={editions}
                    onChange={onInputChange}
                  />
                </FormGroup>
            }

            <FieldSet legend={translate('Metadata')}>
              <Alert kind={kinds.INFO}>
                {translate('BookMetadataOverridesHelpText')}
              </Alert>

              {
                isMetadataFetching &&
                  <LoadingIndicator />
              }

              {
                !!metadataError &&
                  <Alert kind={kinds.DANGER}>
                    {getErrorMessage(metadataError, translate('BookMetadataLoadError'))}
                  </Alert>
              }

              {
                !!metadata &&
                  <div>
                    <FormGroup>
                      <FormLabel>
                        {translate('Title')}
                      </FormLabel>

                      <FormInputGroup
                        type={inputTypes.TEXT}
                        name="title"
                        value={metadata.title}
                        placeholder={title}
                        helpText={translate('BookMetadataTitleHelpText')}
                        onChange={this.onMetadataChange}
                      />
                    </FormGroup>

                    <FormGroup>
                      <FormLabel>
                        {translate('ReleaseDate')}
                      </FormLabel>

                      <FormInputGroup
                        type={inputTypes.TEXT}
                        name="releaseDate"
                        value={metadata.releaseDate}
                        placeholder="YYYY-MM-DD"
                        onChange={this.onMetadataChange}
                      />
                    </FormGroup>

                    <FormGroup>
                      <FormLabel>
                        {translate('Pages')}
                      </FormLabel>

                      <FormInputGroup
                        type={inputTypes.NUMBER}
                        name="pageCount"
                        value={metadata.pageCount}
                        min={0}
                        onChange={this.onMetadataChange}
                      />
                    </FormGroup>

                    <FormGroup>
                      <FormLabel>
                        {translate('Overview')}
                      </FormLabel>

                      <FormInputGroup
                        type={inputTypes.TEXT_AREA}
                        name="overview"
                        value={metadata.overview}
                        onChange={this.onMetadataChange}
                      />
                    </FormGroup>

                    <FormGroup>
                      <FormLabel>
                        {translate('Series')}
                      </FormLabel>

                      <div>
                        <BookSeriesEditor
                          series={metadata.series}
                          availableSeries={availableSeries}
                          onChange={this.onSeriesChange}
                        />
                      </div>
                    </FormGroup>
                  </div>
              }

              {
                !!metadataSaveError &&
                  <Alert kind={kinds.DANGER}>
                    {getErrorMessage(metadataSaveError, translate('BookMetadataSaveError'))}
                  </Alert>
              }
            </FieldSet>
          </Form>
        </ModalBody>
        <ModalFooter>
          <Button
            onPress={onModalClose}
          >
            Cancel
          </Button>

          <SpinnerButton
            isSpinning={isSaving || isMetadataSaving}
            onPress={this.onSavePress}
          >
            Save
          </SpinnerButton>
        </ModalFooter>

      </ModalContent>
    );
  }
}

EditBookModalContent.propTypes = {
  bookId: PropTypes.number.isRequired,
  title: PropTypes.string.isRequired,
  authorName: PropTypes.string.isRequired,
  statistics: PropTypes.object.isRequired,
  item: PropTypes.object.isRequired,
  isFetching: PropTypes.bool.isRequired,
  error: PropTypes.object,
  isPopulated: PropTypes.bool.isRequired,
  isSaving: PropTypes.bool.isRequired,
  onInputChange: PropTypes.func.isRequired,
  onSavePress: PropTypes.func.isRequired,
  onModalClose: PropTypes.func.isRequired
};

export default EditBookModalContent;
