import PropTypes from 'prop-types';
import React, { Component } from 'react';
import AuthorMetadataProfilePopoverContent from 'AddAuthor/AuthorMetadataProfilePopoverContent';
import AuthorMonitorNewItemsOptionsPopoverContent from 'AddAuthor/AuthorMonitorNewItemsOptionsPopoverContent';
import MoveAuthorModal from 'Author/MoveAuthor/MoveAuthorModal';
import Alert from 'Components/Alert';
import Form from 'Components/Form/Form';
import FormGroup from 'Components/Form/FormGroup';
import FormInputGroup from 'Components/Form/FormInputGroup';
import FormLabel from 'Components/Form/FormLabel';
import Icon from 'Components/Icon';
import Button from 'Components/Link/Button';
import SpinnerButton from 'Components/Link/SpinnerButton';
import ModalBody from 'Components/Modal/ModalBody';
import ModalContent from 'Components/Modal/ModalContent';
import ModalFooter from 'Components/Modal/ModalFooter';
import ModalHeader from 'Components/Modal/ModalHeader';
import Popover from 'Components/Tooltip/Popover';
import { icons, inputTypes, kinds, tooltipPositions } from 'Helpers/Props';
import createAjaxRequest from 'Utilities/createAjaxRequest';
import getErrorMessage from 'Utilities/Object/getErrorMessage';
import translate from 'Utilities/String/translate';
import styles from './EditAuthorModalContent.css';

class EditAuthorModalContent extends Component {

  //
  // Lifecycle

  constructor(props, context) {
    super(props, context);

    this.state = {
      isConfirmMoveModalOpen: false,
      overview: null,
      savedOverview: null,
      isOverviewSaving: false,
      overviewSaveError: null,
      overviewLoadError: null
    };
  }

  componentDidMount() {
    this.loadOverview();
  }

  componentWillUnmount() {
    if (this._overviewRequest) {
      this._overviewRequest.abortRequest();
    }
  }

  loadOverview = () => {
    this.setState({ overviewLoadError: null });

    this._overviewRequest = createAjaxRequest({
      url: `/author/${this.props.authorId}/metadata`
    });

    this._overviewRequest.request.done((data) => {
      this.setState({ overview: data.overview || '', savedOverview: data.overview || '' });
    });

    // Without this the overview field just never appeared
    this._overviewRequest.request.fail((xhr) => {
      if (xhr.aborted) {
        return;
      }

      this.setState({ overviewLoadError: xhr });
    });
  };

  //
  // Listeners

  onOverviewReloadPress = () => {
    this.loadOverview();
  };

  onOverviewChange = ({ value }) => {
    this.setState({ overview: value });
  };

  // The overview the user sets is kept over the metadata source's; saved first, then the rest of the author
  saveOverviewThen = (next) => {
    const {
      overview,
      savedOverview
    } = this.state;

    if (overview === null || overview === savedOverview) {
      next();
      return;
    }

    this.setState({ isOverviewSaving: true, overviewSaveError: null });

    const promise = createAjaxRequest({
      url: `/author/${this.props.authorId}/metadata`,
      method: 'PUT',
      contentType: 'application/json',
      dataType: 'json',
      data: JSON.stringify({ overview: overview.trim() || null })
    }).request;

    promise.done(() => {
      this.setState({ isOverviewSaving: false, savedOverview: overview });
      next();
    });

    promise.fail((xhr) => {
      this.setState({ isOverviewSaving: false, overviewSaveError: xhr });
    });
  };

  onSavePress = () => {
    const {
      isPathChanging,
      onSavePress
    } = this.props;

    if (isPathChanging && !this.state.isConfirmMoveModalOpen) {
      this.setState({ isConfirmMoveModalOpen: true });
    } else {
      this.setState({ isConfirmMoveModalOpen: false });

      this.saveOverviewThen(() => onSavePress(false));
    }
  };

  onMoveAuthorPress = () => {
    this.setState({ isConfirmMoveModalOpen: false });

    this.saveOverviewThen(() => this.props.onSavePress(true));
  };

  //
  // Render

  render() {
    const {
      authorName,
      item,
      isSaving,
      showMetadataProfile,
      originalPath,
      onInputChange,
      onModalClose,
      onDeleteAuthorPress,
      ...otherProps
    } = this.props;

    const {
      monitored,
      monitorNewItems,
      qualityProfileId,
      metadataProfileId,
      path,
      tags
    } = item;

    return (
      <ModalContent onModalClose={onModalClose}>
        <ModalHeader>
          Edit - {authorName}
        </ModalHeader>

        <ModalBody>
          <Form {...otherProps}>
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
                {translate('MonitorNewItems')}
                <Popover
                  anchor={
                    <Icon
                      className={styles.labelIcon}
                      name={icons.INFO}
                    />
                  }
                  title={translate('MonitorNewItems')}
                  body={<AuthorMonitorNewItemsOptionsPopoverContent />}
                  position={tooltipPositions.RIGHT}
                />
              </FormLabel>

              <FormInputGroup
                type={inputTypes.MONITOR_NEW_ITEMS_SELECT}
                name="monitorNewItems"
                helpText={translate('MonitorNewItemsHelpText')}
                {...monitorNewItems}
                onChange={onInputChange}
              />
            </FormGroup>

            <FormGroup>
              <FormLabel>
                {translate('QualityProfile')}
              </FormLabel>

              <FormInputGroup
                type={inputTypes.QUALITY_PROFILE_SELECT}
                name="qualityProfileId"
                {...qualityProfileId}
                onChange={onInputChange}
              />
            </FormGroup>

            {
              showMetadataProfile &&
                <FormGroup>
                  <FormLabel>
                    Metadata Profile

                    <Popover
                      anchor={
                        <Icon
                          className={styles.labelIcon}
                          name={icons.INFO}
                        />
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
                    includeNone={true}
                    {...metadataProfileId}
                    onChange={onInputChange}
                  />
                </FormGroup>
            }

            <FormGroup>
              <FormLabel>
                {translate('Path')}
              </FormLabel>

              <FormInputGroup
                type={inputTypes.PATH}
                name="path"
                {...path}
                onChange={onInputChange}
              />
            </FormGroup>

            <FormGroup>
              <FormLabel>
                {translate('Tags')}
              </FormLabel>

              <FormInputGroup
                type={inputTypes.TAG}
                name="tags"
                {...tags}
                onChange={onInputChange}
              />
            </FormGroup>

            {
              this.state.overview !== null &&
                <FormGroup>
                  <FormLabel>
                    {translate('Overview')}
                  </FormLabel>

                  <FormInputGroup
                    type={inputTypes.TEXT_AREA}
                    name="overview"
                    value={this.state.overview}
                    helpText={translate('AuthorOverviewOverrideHelpText')}
                    onChange={this.onOverviewChange}
                  />
                </FormGroup>
            }

            {
              !!this.state.overviewLoadError &&
                <Alert kind={kinds.DANGER}>
                  {getErrorMessage(this.state.overviewLoadError, translate('AuthorOverviewLoadError'))}

                  <Button
                    className={styles.retryButton}
                    onPress={this.onOverviewReloadPress}
                  >
                    {translate('Reload')}
                  </Button>
                </Alert>
            }

            {
              !!this.state.overviewSaveError &&
                <Alert kind={kinds.DANGER}>
                  {getErrorMessage(this.state.overviewSaveError, translate('AuthorOverviewSaveError'))}
                </Alert>
            }
          </Form>
        </ModalBody>
        <ModalFooter>
          <Button
            className={styles.deleteButton}
            kind={kinds.DANGER}
            onPress={onDeleteAuthorPress}
          >
            Delete
          </Button>

          <Button
            onPress={onModalClose}
          >
            Cancel
          </Button>

          <SpinnerButton
            isSpinning={isSaving || this.state.isOverviewSaving}
            onPress={this.onSavePress}
          >
            Save
          </SpinnerButton>
        </ModalFooter>

        <MoveAuthorModal
          originalPath={originalPath}
          destinationPath={path.value}
          isOpen={this.state.isConfirmMoveModalOpen}
          onSavePress={this.onSavePress}
          onMoveAuthorPress={this.onMoveAuthorPress}
        />

      </ModalContent>
    );
  }
}

EditAuthorModalContent.propTypes = {
  authorId: PropTypes.number.isRequired,
  authorName: PropTypes.string.isRequired,
  item: PropTypes.object.isRequired,
  isSaving: PropTypes.bool.isRequired,
  showMetadataProfile: PropTypes.bool.isRequired,
  isPathChanging: PropTypes.bool.isRequired,
  originalPath: PropTypes.string.isRequired,
  onInputChange: PropTypes.func.isRequired,
  onSavePress: PropTypes.func.isRequired,
  onModalClose: PropTypes.func.isRequired,
  onDeleteAuthorPress: PropTypes.func.isRequired
};

export default EditAuthorModalContent;
