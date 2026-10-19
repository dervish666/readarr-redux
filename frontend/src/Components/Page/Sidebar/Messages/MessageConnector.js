import PropTypes from 'prop-types';
import React, { PureComponent } from 'react';
import { hideMessage } from 'App/messagesStore';
import Message from './Message';

// PureComponent, as connect() was: a re-render with the same props must not
// restart the hide timer.
class MessageConnector extends PureComponent {

  //
  // Lifecycle

  constructor(props, context) {
    super(props, context);

    this._hideTimeoutId = null;
    this.scheduleHideMessage(props.hideAfter);
  }

  componentDidUpdate() {
    this.scheduleHideMessage(this.props.hideAfter);
  }

  componentWillUnmount() {
    if (this._hideTimeoutId) {
      clearTimeout(this._hideTimeoutId);
    }
  }

  //
  // Control

  scheduleHideMessage = (hideAfter) => {
    if (this._hideTimeoutId) {
      clearTimeout(this._hideTimeoutId);
    }

    if (hideAfter) {
      this._hideTimeoutId = setTimeout(this.hideMessage, hideAfter * 1000);
    }
  };

  hideMessage = () => {
    hideMessage({ id: this.props.id });
  };

  //
  // Render

  render() {
    return (
      <Message
        {...this.props}
      />
    );
  }
}

MessageConnector.propTypes = {
  id: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
  hideAfter: PropTypes.number.isRequired
};

export default MessageConnector;
