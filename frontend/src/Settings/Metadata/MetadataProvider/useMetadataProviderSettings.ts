import { useManageSettings } from 'Settings/useSettings';

// NzbDrone.Core/Configuration WriteAudioTagsType and WriteBookTagsType, as v1
// serialises them.
export type WriteAudioTagsType = 'no' | 'newFiles' | 'allFiles' | 'sync';
export type WriteBookTagsType = 'newFiles' | 'allFiles' | 'sync';

// Readarr.Api.V1/Config/MetadataProviderConfigResource.
export interface MetadataProviderSettingsModel {
  id: number;
  writeAudioTags: WriteAudioTagsType;
  scrubAudioTags: boolean;
  writeBookTags: WriteBookTagsType;
  updateCovers: boolean;
  embedMetadata: boolean;
}

const PATH = '/config/metadataProvider';

export const useManageMetadataProviderSettings = () => {
  return useManageSettings<MetadataProviderSettingsModel>(PATH);
};
