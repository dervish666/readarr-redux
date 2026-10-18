import PropTypes from 'prop-types';
import { useEffect, useLayoutEffect, useState } from 'react';
import { connect } from 'react-redux';
import { createSelector } from 'reselect';

// Themes live in Styles/Themes/themes.css as custom properties keyed off data-theme,
// following Sonarr's v5 ApplyTheme (d9e7ea050, header colour from 76c006b94).

const darkQuery = '(prefers-color-scheme: dark)';

function resolveTheme(theme) {
  if (theme === 'auto') {
    return window.matchMedia(darkQuery).matches ? 'dark' : 'light';
  }

  return theme === 'dark' ? 'dark' : 'light';
}

function createMapStateToProps() {
  return createSelector(
    (state) => state.settings.ui.item,
    (uiSettings) => {
      return {
        theme: uiSettings.theme || window.Readarr.theme || 'auto',
        enableColorImpairedMode: !!uiSettings.enableColorImpairedMode,
        headerColor: uiSettings.headerColor || 'fullColor'
      };
    }
  );
}

function ApplyTheme({ theme, enableColorImpairedMode, headerColor }) {
  const [resolvedTheme, setResolvedTheme] = useState(() => resolveTheme(theme));

  useEffect(() => {
    setResolvedTheme(resolveTheme(theme));

    if (theme !== 'auto') {
      return undefined;
    }

    const mediaQuery = window.matchMedia(darkQuery);
    const onChange = () => setResolvedTheme(resolveTheme('auto'));

    mediaQuery.addEventListener('change', onChange);

    return () => {
      mediaQuery.removeEventListener('change', onChange);
    };
  }, [theme]);

  useLayoutEffect(() => {
    document.documentElement.dataset.theme = resolvedTheme;
  }, [resolvedTheme]);

  useLayoutEffect(() => {
    if (enableColorImpairedMode) {
      document.documentElement.dataset.colorImpaired = '';
    } else {
      delete document.documentElement.dataset.colorImpaired;
    }
  }, [enableColorImpairedMode]);

  useLayoutEffect(() => {
    if (headerColor === 'gradient') {
      document.documentElement.dataset.headerColor = headerColor;
    } else {
      delete document.documentElement.dataset.headerColor;
    }
  }, [headerColor]);

  return null;
}

ApplyTheme.propTypes = {
  theme: PropTypes.string.isRequired,
  enableColorImpairedMode: PropTypes.bool.isRequired,
  headerColor: PropTypes.string.isRequired
};

export default connect(createMapStateToProps)(ApplyTheme);
