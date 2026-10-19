import React, { useCallback, useState } from 'react';
import usePaths from 'Path/usePaths';
import PathInputInternal from './PathInputInternal';

export interface PathInputProps {
  className?: string;
  name: string;
  value?: string;
  placeholder?: string;
  includeFiles?: boolean;
  hasFileBrowser?: boolean;
  onChange: (change: { name: string; value: string }) => void;
  [key: string]: unknown;
}

// A path input with suggestions from /filesystem (react-query) and a file browser.
// Nothing is fetched until the user starts typing.
function PathInput({
  includeFiles = false,
  value = '',
  ...otherProps
}: PathInputProps) {
  const [currentPath, setCurrentPath] = useState<string | null>(null);

  const { data } = usePaths({
    path: currentPath ?? '',
    includeFiles,
    enabled: currentPath !== null,
  });

  const handleFetchPaths = useCallback((path: string) => {
    setCurrentPath(path);
  }, []);

  return (
    <PathInputInternal
      {...otherProps}
      value={value}
      includeFiles={includeFiles}
      paths={data.paths}
      onFetchPaths={handleFetchPaths}
    />
  );
}

export default PathInput;
