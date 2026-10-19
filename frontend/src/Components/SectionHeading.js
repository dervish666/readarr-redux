import PropTypes from 'prop-types';
import React from 'react';
import styles from './SectionHeading.module.css';

function SectionHeading({ title, description }) {
  return (
    <hgroup className={styles.sectionHeading}>
      <h2 className={styles.title}>{title}</h2>

      {
        description ?
          <p className={styles.description}>{description}</p> :
          null
      }
    </hgroup>
  );
}

SectionHeading.propTypes = {
  title: PropTypes.node.isRequired,
  description: PropTypes.node
};

export default SectionHeading;
