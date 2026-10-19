import useWanted from 'Wanted/useWanted';
import { useMissingOptions } from './missingOptionsStore';

const useMissing = () => {
  return useWanted('/wanted/missing', 'missing', useMissingOptions());
};

export default useMissing;
