import classNames from 'classnames';
import PropTypes from 'prop-types';
import React, { Component } from 'react';
import Alert from 'Components/Alert';
import Button from 'Components/Link/Button';
import LoadingIndicator from 'Components/Loading/LoadingIndicator';
import ModalBody from 'Components/Modal/ModalBody';
import ModalContent from 'Components/Modal/ModalContent';
import ModalFooter from 'Components/Modal/ModalFooter';
import ModalHeader from 'Components/Modal/ModalHeader';
import { kinds } from 'Helpers/Props';
import createAjaxRequest from 'Utilities/createAjaxRequest';
import formatDateTime from 'Utilities/Date/formatDateTime';
import formatBytes from 'Utilities/Number/formatBytes';
import getErrorMessage from 'Utilities/Object/getErrorMessage';
import translate from 'Utilities/String/translate';
import styles from './ImportDestinationsModalContent.css';

function splitPath(path) {
  if (!path) {
    return { folder: '', name: '' };
  }

  const index = Math.max(path.lastIndexOf('/'), path.lastIndexOf('\\'));

  return {
    folder: path.substring(0, index),
    name: path.substring(index + 1)
  };
}

function formatTags(title, author, series, seriesIndex) {
  const parts = [];

  if (author) {
    parts.push(author);
  }

  if (title) {
    parts.push(title);
  }

  if (series) {
    parts.push(seriesIndex ? `${series} #${seriesIndex}` : series);
  }

  return parts.length ? parts.join(' — ') : '-';
}

function CompareRow({ title, source, destination, highlight }) {
  return (
    <tr className={highlight ? styles.differs : undefined}>
      <th className={styles.rowTitle}>{title}</th>
      <td className={styles.value}>{source}</td>
      <td className={styles.value}>{destination}</td>
    </tr>
  );
}

CompareRow.propTypes = {
  title: PropTypes.string.isRequired,
  source: PropTypes.node,
  destination: PropTypes.node,
  highlight: PropTypes.bool
};

class ImportDestinationsModalContent extends Component {

  //
  // Lifecycle

  constructor(props, context) {
    super(props, context);

    this.state = {
      isFetching: true,
      error: null,
      items: [],
      isSubmitted: false
    };
  }

  componentDidMount() {
    this._request = createAjaxRequest({
      url: `/queue/${this.props.id}/destinations`
    });

    this._request.request.done((items) => {
      this.setState({ isFetching: false, items });
    });

    this._request.request.fail((xhr) => {
      if (xhr.aborted) {
        return;
      }

      this.setState({ isFetching: false, error: xhr });
    });
  }

  componentDidUpdate(prevProps) {
    const {
      isImporting,
      importError,
      onModalClose
    } = this.props;

    if (this.state.isSubmitted && prevProps.isImporting && !isImporting) {
      if (importError) {
        // eslint-disable-next-line react/no-did-update-set-state
        this.setState({ isSubmitted: false });
      } else {
        onModalClose();
      }
    }
  }

  componentWillUnmount() {
    if (this._request) {
      this._request.abortRequest();
    }
  }

  //
  // Listeners

  // The modal stays open until the request is accepted, so a failure is shown here rather than lost
  onImportAndReplacePress = () => {
    this.setState({ isSubmitted: true });
    this.props.onImportAndReplacePress();
  };

  //
  // Render

  renderItem(item) {
    const {
      shortDateFormat,
      timeFormat
    } = this.props;

    const source = splitPath(item.sourcePath);
    const destination = splitPath(item.destinationPath);
    const exists = item.destinationExists;
    const none = '-';

    let inLibrary = translate('ImportDestinationNotInLibrary');

    if (item.destinationBookFileId) {
      inLibrary = item.destinationBookTitle ?
        `${item.destinationAuthorName || ''} — ${item.destinationBookTitle}` :
        translate('ImportDestinationUnmapped');
    }

    return (
      <div
        key={item.sourcePath}
        className={classNames(styles.file, exists && styles.collision)}
      >
        <div className={styles.target}>
          {
            item.bookTitle ?
              translate('ImportDestinationImportsAs', { author: item.authorName, book: item.bookTitle }) :
              translate('ImportDestinationNoBook')
          }
        </div>

        {
          item.rejections && item.rejections.length > 0 &&
            <div className={styles.rejections}>
              {item.rejections.join('; ')}
            </div>
        }

        <table className={styles.compare}>
          <thead>
            <tr>
              <th />
              <th className={styles.columnTitle}>{translate('ImportDestinationDownload')}</th>
              <th className={styles.columnTitle}>
                {exists ? translate('ImportDestinationAlreadyThere') : translate('ImportDestinationNothingThere')}
              </th>
            </tr>
          </thead>

          <tbody>
            <CompareRow
              title={translate('File')}
              source={source.name}
              destination={destination.name || none}
            />

            <CompareRow
              title={translate('Folder')}
              source={source.folder}
              destination={destination.folder || none}
            />

            <CompareRow
              title={translate('Size')}
              source={formatBytes(item.sourceSize)}
              destination={exists ? formatBytes(item.destinationSize) : none}
              highlight={exists && item.sourceSize !== item.destinationSize}
            />

            <CompareRow
              title={translate('Modified')}
              source={formatDateTime(item.sourceModified, shortDateFormat, timeFormat)}
              destination={exists && item.destinationModified ? formatDateTime(item.destinationModified, shortDateFormat, timeFormat) : none}
            />

            <CompareRow
              title={translate('Quality')}
              source={item.sourceQuality?.quality?.name || none}
              destination={item.destinationQuality?.quality?.name || none}
            />

            <CompareRow
              title={translate('Tags')}
              source={formatTags(item.sourceTagTitle, item.sourceTagAuthor, item.sourceTagSeries, item.sourceTagSeriesIndex)}
              destination={exists ? formatTags(item.destinationTagTitle, item.destinationTagAuthor, item.destinationTagSeries, item.destinationTagSeriesIndex) : none}
              highlight={exists && (item.sourceTagTitle !== item.destinationTagTitle || item.sourceTagSeriesIndex !== item.destinationTagSeriesIndex)}
            />

            {
              exists &&
                <CompareRow
                  title={translate('ImportDestinationInLibraryAs')}
                  source={none}
                  destination={inLibrary}
                />
            }
          </tbody>
        </table>
      </div>
    );
  }

  render() {
    const {
      title,
      isImporting,
      importError,
      onRemovePress,
      onModalClose
    } = this.props;

    const {
      isFetching,
      error,
      items
    } = this.state;

    const collisions = items.filter((i) => i.destinationExists).length;

    return (
      <ModalContent onModalClose={onModalClose}>
        <ModalHeader>
          {translate('ImportDestinationsTitle', { title })}
        </ModalHeader>

        <ModalBody>
          {
            !!importError &&
              <Alert kind={kinds.DANGER}>
                {getErrorMessage(importError, translate('QueueImportFailed'))}
              </Alert>
          }

          {
            isFetching &&
              <LoadingIndicator />
          }

          {
            !isFetching && !!error &&
              <Alert kind={kinds.DANGER}>
                {translate('ImportDestinationsLoadError')}
              </Alert>
          }

          {
            !isFetching && !error && !items.length &&
              <Alert kind={kinds.INFO}>
                {translate('ImportDestinationsNoFiles')}
              </Alert>
          }

          {
            !isFetching && !error && items.length > 0 &&
              <div>
                <Alert kind={collisions ? kinds.WARNING : kinds.INFO}>
                  {
                    collisions ?
                      translate('ImportDestinationsCollisions', { count: collisions }) :
                      translate('ImportDestinationsNoCollisions')
                  }
                </Alert>

                {items.map((item) => this.renderItem(item))}
              </div>
          }
        </ModalBody>

        <ModalFooter>
          <Button onPress={onModalClose}>
            {translate('Close')}
          </Button>

          <Button
            kind={kinds.WARNING}
            onPress={onRemovePress}
          >
            {translate('RemoveFromQueue')}
          </Button>

          <Button
            kind={kinds.DANGER}
            isDisabled={isFetching || !!error || !items.length || isImporting}
            title={translate('ImportAndReplaceHelpText')}
            onPress={this.onImportAndReplacePress}
          >
            {translate('ImportAndReplace')}
          </Button>
        </ModalFooter>
      </ModalContent>
    );
  }
}

ImportDestinationsModalContent.propTypes = {
  id: PropTypes.number.isRequired,
  title: PropTypes.string.isRequired,
  shortDateFormat: PropTypes.string.isRequired,
  timeFormat: PropTypes.string.isRequired,
  isImporting: PropTypes.bool,
  importError: PropTypes.object,
  onImportAndReplacePress: PropTypes.func.isRequired,
  onRemovePress: PropTypes.func.isRequired,
  onModalClose: PropTypes.func.isRequired
};

export default ImportDestinationsModalContent;
