declare module '*.module.css';

interface Window {
  Readarr: {
    apiRoot: string;
    apiKey: string;
    instanceName: string;
    theme: string;
    urlBase: string;
    version: string;
    isProduction: boolean;
  };
}
