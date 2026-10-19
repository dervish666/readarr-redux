import './polyfills';
import 'Styles/globals.css';
import './index.css';

const initializeUrl = `${
  window.Readarr.urlBase
}/initialize.json?t=${Date.now()}`;
const response = await fetch(initializeUrl);

window.Readarr = await response.json();

// React 18.3 warns in development builds about patterns the JS components still use
// (defaultProps on function components, findDOMNode). Drop those two until the components move off them.
const error = console.error;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function logError(...parameters: any[]) {
  const filter = parameters.find((parameter) => {
    return (
      typeof parameter === 'string' &&
      (parameter.includes(
        'Support for defaultProps will be removed from function components in a future major release'
      ) ||
        parameter.includes(
          'findDOMNode is deprecated and will be removed in the next major release'
        ))
    );
  });

  if (!filter) {
    error(...parameters);
  }
}

console.error = logError;

const { bootstrap } = await import('./bootstrap');

await bootstrap();
