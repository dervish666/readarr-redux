let translations: Record<string, string> = {};

// Filled by App/useTranslations once /localization loads; PageConnector holds the
// app on the loading page until then.
export function setTranslations(translationData: Record<string, string>) {
  translations = translationData;
}

export default function translate(
  key: string,
  tokens: Record<string, string | number | boolean> = {}
) {
  const { isProduction = true } = window.Readarr;

  if (!isProduction && !(key in translations)) {
    console.warn(`Missing translation for key: ${key}`);
  }

  const translation = translations[key] || key;

  tokens.appName = 'Readarr';

  // Fallback to the old behaviour for translations not yet updated to use named tokens
  Object.values(tokens).forEach((value, index) => {
    tokens[index] = value;
  });

  return translation.replace(/\{([a-z0-9]+?)\}/gi, (match, tokenMatch) =>
    String(tokens[tokenMatch] ?? match)
  );
}
