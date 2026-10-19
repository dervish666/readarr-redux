import { keepPreviousData } from '@tanstack/react-query';
import { useMemo } from 'react';
import useApiQuery from 'Helpers/Hooks/useApiQuery';

// FileSystemEntityType, plus the rows the file browser adds itself.
export type PathType = 'parent' | 'drive' | 'folder' | 'file' | 'computer';

// Readarr v1 /filesystem FileSystemModel.
export interface Path {
  type: PathType;
  name: string;
  path: string;
  extension?: string;
  size: number;
  lastModified: string | null;
}

interface PathsResponse {
  parent: string | null;
  directories: Path[];
  files: Path[];
}

interface PathsData extends PathsResponse {
  paths: Path[];
}

const DEFAULT: PathsData = {
  parent: null,
  directories: [],
  files: [],
  paths: [],
};

interface UsePathsOptions {
  path: string;
  allowFoldersWithoutTrailingSlashes?: boolean;
  includeFiles?: boolean;
  enabled?: boolean;
}

const usePaths = ({
  path,
  allowFoldersWithoutTrailingSlashes = false,
  includeFiles = false,
  enabled = true,
}: UsePathsOptions) => {
  const { data: responseData, ...result } = useApiQuery<PathsResponse>({
    path: '/filesystem',
    queryParams: { path, allowFoldersWithoutTrailingSlashes, includeFiles },
    queryOptions: {
      enabled,
      placeholderData: keepPreviousData,
    },
  });

  const data = useMemo<PathsData>(() => {
    if (!responseData) {
      return DEFAULT;
    }

    const { directories, files, parent } = responseData;

    // Suggestions only: entries that still start with what was typed.
    const paths = [...directories, ...files].filter((item) =>
      item.path.toLowerCase().startsWith(path.toLowerCase())
    );

    return { directories, files, parent, paths };
  }, [path, responseData]);

  return {
    ...result,
    data,
  };
};

export default usePaths;
