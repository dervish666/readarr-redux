import PropTypes from 'prop-types';
import React, { useCallback, useEffect } from 'react';
import usePrevious from 'Helpers/Hooks/usePrevious';
import CaptchaInput from './CaptchaInput';
import useCaptcha from './useCaptcha';

function CaptchaInputConnector(props) {
  const {
    name,
    provider,
    providerData,
    onChange
  } = props;

  const {
    token,
    refreshing,
    siteKey,
    secretToken,
    refresh,
    getCaptchaCookie
  } = useCaptcha();

  const previousToken = usePrevious(token);

  useEffect(() => {
    if (token && token !== previousToken) {
      onChange({ name, value: token });
    }
  }, [name, token, previousToken, onChange]);

  const handleRefreshPress = useCallback(() => {
    refresh({ provider, providerData });
  }, [provider, providerData, refresh]);

  const handleCaptchaChange = useCallback((captchaResponse) => {
    // If the captcha has expired `captchaResponse` will be null.
    // In the event it's null don't try to get the captchaCookie.
    if (!captchaResponse) {
      return;
    }

    getCaptchaCookie({ provider, providerData, captchaResponse });
  }, [provider, providerData, getCaptchaCookie]);

  return (
    <CaptchaInput
      {...props}
      refreshing={refreshing}
      siteKey={siteKey}
      secretToken={secretToken}
      onRefreshPress={handleRefreshPress}
      onCaptchaChange={handleCaptchaChange}
    />
  );
}

CaptchaInputConnector.propTypes = {
  provider: PropTypes.string.isRequired,
  providerData: PropTypes.object.isRequired,
  name: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired
};

export default CaptchaInputConnector;
