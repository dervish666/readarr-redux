import useWanted from 'Wanted/useWanted';
import { useCutoffUnmetOptions } from './cutoffUnmetOptionsStore';

const useCutoffUnmet = () => {
  return useWanted('/wanted/cutoff', 'cutoffUnmet', useCutoffUnmetOptions());
};

export default useCutoffUnmet;
