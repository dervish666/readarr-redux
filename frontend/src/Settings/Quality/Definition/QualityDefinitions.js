import PropTypes from 'prop-types';
import React, { Component } from 'react';
import FieldSet from 'Components/FieldSet';
import PageSectionContent from 'Components/Page/PageSectionContent';
import translate from 'Utilities/String/translate';
import QualityDefinitionConnector from './QualityDefinitionConnector';
import styles from './QualityDefinitions.css';

class QualityDefinitions extends Component {

  //
  // Render

  render() {
    const {
      items,
      ...otherProps
    } = this.props;

    return (
      <FieldSet legend={translate('QualityDefinitions')}>
        <PageSectionContent
          errorMessage={translate('UnableToLoadQualityDefinitions')}
          {...otherProps}
        >
          <div className={styles.header}>
            <div className={styles.quality}>
              {translate('Quality')}
            </div>
            <div className={styles.title}>
              {translate('Title')}
            </div>
            <div className={styles.sizeLimit}>
              {translate('MinimumReleaseSize')}
            </div>
          </div>

          <div className={styles.definitions}>
            {
              items.map((item) => {
                return (
                  <QualityDefinitionConnector
                    key={item.id}
                    {...item}
                  />
                );
              })
            }
          </div>

          <div className={styles.sizeLimitHelpTextContainer}>
            <div className={styles.sizeLimitHelpText}>
              {translate('MinimumReleaseSizeHelpText')}
            </div>
          </div>
        </PageSectionContent>
      </FieldSet>
    );
  }
}

QualityDefinitions.propTypes = {
  isFetching: PropTypes.bool.isRequired,
  error: PropTypes.object,
  defaultProfile: PropTypes.object,
  items: PropTypes.arrayOf(PropTypes.object).isRequired
};

export default QualityDefinitions;
