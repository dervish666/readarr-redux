import ModelBase from 'App/ModelBase';
import Field from './Field';

export interface ProviderMessage {
  message: string;
  type: 'info' | 'error' | 'warning';
}

// Readarr.Api.V1/ProviderResource.
interface Provider extends ModelBase {
  name: string;
  fields: Field[];
  implementationName: string;
  implementation: string;
  configContract: string;
  infoLink: string;
  message?: ProviderMessage;
  tags: number[];
  presets?: Provider[];
}

export default Provider;
