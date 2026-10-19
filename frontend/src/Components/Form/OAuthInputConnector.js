import PropTypes from 'prop-types';
import React, { useCallback, useEffect } from 'react';
import usePrevious from 'Helpers/Hooks/usePrevious';
import useOAuth from 'OAuth/useOAuth';
import OAuthInput from './OAuthInput';

function OAuthInputConnector(props) {
  const {
    name,
    provider,
    providerData,
    onChange
  } = props;

  const { authorizing, result, error, startOAuth } = useOAuth();
  const previousResult = usePrevious(result);

  useEffect(() => {
    if (!result || result === previousResult) {
      return;
    }

    Object.keys(result).forEach((key) => {
      onChange({ name: key, value: result[key] });
    });
  }, [result, previousResult, onChange]);

  const handlePress = useCallback(() => {
    startOAuth({ name, provider, providerData });
  }, [name, provider, providerData, startOAuth]);

  return (
    <OAuthInput
      {...props}
      authorizing={authorizing}
      error={error}
      onPress={handlePress}
    />
  );
}

OAuthInputConnector.propTypes = {
  name: PropTypes.string.isRequired,
  provider: PropTypes.string.isRequired,
  providerData: PropTypes.object.isRequired,
  onChange: PropTypes.func.isRequired
};

export default OAuthInputConnector;
