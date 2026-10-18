import PropTypes from 'prop-types';
import React, { Component } from 'react';
import SectionHeading from 'Components/SectionHeading';
import { sizes } from 'Helpers/Props';
import styles from './FieldSet.css';

class FieldSet extends Component {

  //
  // Render

  render() {
    const {
      legend,
      children
    } = this.props;

    return (
      <div className={styles.section}>
        {
          legend ?
            <SectionHeading title={legend} /> :
            null
        }

        <section className={styles.fieldSet}>
          {children}
        </section>
      </div>
    );
  }

}

FieldSet.propTypes = {
  size: PropTypes.oneOf(sizes.all).isRequired,
  legend: PropTypes.oneOfType([PropTypes.node, PropTypes.string]),
  children: PropTypes.node
};

FieldSet.defaultProps = {
  size: sizes.MEDIUM
};

export default FieldSet;
