import PropTypes from 'prop-types';
import React, { Component } from 'react';
import NumberInput from 'Components/Form/NumberInput';
import TextInput from 'Components/Form/TextInput';
import translate from 'Utilities/String/translate';
import styles from './QualityDefinition.css';

// Sizes are stored in kilobits (128 bytes), so one MiB is 8192 of them
const KILOBITS_PER_MEGABYTE = 8192;

// Unknown Audio, MP3, FLAC and M4B. Matches Quality.Audio in NzbDrone.Core, the only qualities
// AcceptableSizeSpecification checks
const AUDIO_QUALITY_IDS = [10, 11, 12, 13];

class QualityDefinition extends Component {

  //
  // Listeners

  onMinSizeChange = ({ value }) => {
    const megabytes = value == null || value < 0 ? 0 : value;

    this.props.onSizeChange({
      minSize: megabytes * KILOBITS_PER_MEGABYTE,
      maxSize: this.props.maxSize
    });
  };

  //
  // Render

  render() {
    const {
      id,
      quality,
      title,
      minSize,
      onTitleChange
    } = this.props;

    const isAudio = AUDIO_QUALITY_IDS.includes(quality.id);
    // Not rounded: 8192 is a power of two, so the MB value converts back to the stored one exactly
    // and focusing then leaving the input never rewrites a minimum
    const minSizeMegabytes = minSize ? minSize / KILOBITS_PER_MEGABYTE : 0;

    return (
      <div className={styles.qualityDefinition}>
        <div className={styles.quality}>
          {quality.name}
        </div>

        <div className={styles.title}>
          <TextInput
            name={`${id}.${title}`}
            value={title}
            onChange={onTitleChange}
          />
        </div>

        <div className={styles.sizeLimit}>
          {
            isAudio ?
              <div className={styles.minSize}>
                <NumberInput
                  className={styles.sizeInput}
                  name={`${id}.minSize`}
                  value={minSizeMegabytes}
                  min={0}
                  step={1}
                  isFloat={true}
                  onChange={this.onMinSizeChange}
                />

                <span className={styles.unit}>MB</span>

                {
                  minSizeMegabytes ?
                    null :
                    <span className={styles.note}>
                      {translate('NoMinimum')}
                    </span>
                }
              </div> :
              <div className={styles.note}>
                {translate('NotSizeChecked')}
              </div>
          }
        </div>
      </div>
    );
  }
}

QualityDefinition.propTypes = {
  id: PropTypes.number.isRequired,
  quality: PropTypes.object.isRequired,
  title: PropTypes.string.isRequired,
  minSize: PropTypes.number,
  maxSize: PropTypes.number,
  onTitleChange: PropTypes.func.isRequired,
  onSizeChange: PropTypes.func.isRequired
};

export default QualityDefinition;
