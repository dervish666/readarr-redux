import $ from 'jquery';
import { useCallback, useEffect, useRef, useState } from 'react';
import createAjaxRequest from 'Utilities/createAjaxRequest';
import requestAction from 'Utilities/requestAction';

// The OAuth state lives with the input that starts it, as in Sonarr 3c77c4b98.
// The request chain is Readarr's own: it keeps the poll limit and rejects a
// failed poll instead of leaving the button spinning.

const callbackUrl = `${window.location.origin}${window.Readarr.urlBase}/oauth.html`;

const defaultState = {
  authorizing: false,
  result: null,
  error: null
};

function showOAuthWindow(url, payload, poll = false, ajaxOptions = undefined) {
  const deferred = $.Deferred();
  const selfWindow = window;

  const newWindow = window.open(url);

  if (
    !newWindow ||
    newWindow.closed ||
    typeof newWindow.closed == 'undefined'
  ) {

    // A fake validation error to mimic a 400 response from the API.
    const error = {
      status: 400,
      responseJSON: [
        {
          propertyName: payload.name,
          errorMessage: 'Pop-ups are being blocked by your browser'
        }
      ]
    };

    return deferred.reject(error).promise();
  }

  if (poll) {
    // Ten minutes. The sign-in window's closed flag can't be trusted under Cross-Origin-Opener-Policy, so a
    // sign-in the user walked away from ends here instead of leaving the button spinning for good.
    const maxPolls = 120;
    let polls = 0;

    const pollAction = () => {
      polls++;

      requestAction({
        action: 'pollOAuth',
        queryParams: ajaxOptions,
        ...payload
      }).then((response) => {
        if (response.success) {
          deferred.resolve({});
        } else if (polls >= maxPolls) {
          deferred.reject({
            status: 400,
            responseJSON: [
              {
                propertyName: payload.name,
                errorMessage: 'Sign-in timed out, try again'
              }
            ]
          });
        } else {
          setTimeout(() => {
            pollAction();
          }, 5000);
        }
      }, (xhr) => {
        // A failed poll used to be dropped, leaving authorization pending forever
        deferred.reject(xhr);
      });
    };

    setTimeout(() => {
      pollAction();
    }, 5000);
  } else {
    selfWindow.onCompleteOauth = function(query, onComplete) {
      delete selfWindow.onCompleteOauth;

      const queryParams = {};
      const splitQuery = query.substring(1).split('&');

      splitQuery.forEach((param) => {
        if (param) {
          const paramSplit = param.split('=');

          queryParams[paramSplit[0]] = paramSplit[1];
        }
      });

      onComplete();
      deferred.resolve(queryParams);
    };
  }

  return deferred.promise();
}

function executeIntermediateRequest(payload, ajaxOptions) {
  return createAjaxRequest(ajaxOptions).request.then((data) => {
    return requestAction({
      action: 'continueOAuth',
      queryParams: {
        ...data,
        callbackUrl
      },
      ...payload
    });
  });
}

function useOAuth() {
  const [state, setState] = useState(defaultState);

  // A sign-in that finishes after the input unmounted has nowhere to go.
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;

    return () => {
      isMounted.current = false;
    };
  }, []);

  const setOAuthValue = useCallback((values) => {
    if (isMounted.current) {
      setState((prevState) => ({ ...prevState, ...values }));
    }
  }, []);

  const resetOAuth = useCallback(() => {
    setState(defaultState);
  }, []);

  const startOAuth = useCallback((payload) => {
    const {
      name,
      ...otherPayload
    } = payload;

    const actionPayload = {
      action: 'startOAuth',
      queryParams: { callbackUrl },
      ...otherPayload
    };

    setOAuthValue({ authorizing: true });

    let startResponse = {};

    requestAction(actionPayload)
      .then((response) => {
        startResponse = response;

        if (response.oauthUrl) {
          return showOAuthWindow(response.oauthUrl, payload);
        }

        const { poll, ...ajaxOptions } = response;

        return executeIntermediateRequest(otherPayload, ajaxOptions)
          .then((intermediateResponse) => {
            startResponse = intermediateResponse;

            return showOAuthWindow(intermediateResponse.oauthUrl, payload, poll, intermediateResponse);
          });
      })
      .then((queryParams) => {
        return requestAction({
          action: 'getOAuthToken',
          queryParams: {
            ...startResponse,
            ...queryParams
          },
          ...otherPayload
        });
      })
      .then((response) => {
        setOAuthValue({
          authorizing: false,
          result: response,
          error: null
        });
      }, (xhr) => {
        // The button shows the error (validation failures for a 400).
        console.error(`[oAuth] ${name} sign-in failed`, xhr?.status);

        setOAuthValue({
          authorizing: false,
          result: null,
          error: xhr
        });
      });
  }, [setOAuthValue]);

  return {
    ...state,
    startOAuth,
    resetOAuth
  };
}

export default useOAuth;
