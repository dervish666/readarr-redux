import PropTypes from 'prop-types';
import React, { Component } from 'react';
import ModalTitleContext from './ModalTitleContext';
import styles from './ModalHeader.module.css';

class ModalHeader extends Component {

  //
  // Render

  render() {
    const {
      children,
      ...otherProps
    } = this.props;

    return (
      <div
        id={this.context}
        className={styles.modalHeader}
        {...otherProps}
      >
        {children}
      </div>
    );
  }

}

ModalHeader.contextType = ModalTitleContext;

ModalHeader.propTypes = {
  children: PropTypes.node
};

export default ModalHeader;
