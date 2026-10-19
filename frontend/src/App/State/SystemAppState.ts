import SystemStatus from 'typings/SystemStatus';
import { AppSectionItemState } from './AppSectionState';

export type SystemStatusAppState = AppSectionItemState<SystemStatus>;

// Only the status feed is left in redux; the System pages use react-query.
interface SystemAppState {
  status: SystemStatusAppState;
}

export default SystemAppState;
