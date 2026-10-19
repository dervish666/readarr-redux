import { useEffect, useLayoutEffect, useState } from 'react';
import { useUiSettingsValues } from 'Settings/UI/useUiSettings';

// Themes live in Styles/Themes/themes.css as custom properties keyed off data-theme,
// following Sonarr's v5 ApplyTheme (d9e7ea050, header colour from 76c006b94). The
// settings come from react-query, so a UI settings save switches them at once.

const darkQuery = '(prefers-color-scheme: dark)';

function resolveTheme(theme: string) {
  if (theme === 'auto') {
    return window.matchMedia(darkQuery).matches ? 'dark' : 'light';
  }

  return theme === 'dark' ? 'dark' : 'light';
}

function ApplyTheme() {
  const uiSettings = useUiSettingsValues();

  const theme: string = uiSettings.theme || window.Readarr.theme || 'auto';
  const enableColorImpairedMode = !!uiSettings.enableColorImpairedMode;
  const headerColor = uiSettings.headerColor || 'fullColor';

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

export default ApplyTheme;
