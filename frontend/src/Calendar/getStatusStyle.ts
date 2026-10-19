import moment, { Moment } from 'moment';

export type CalendarStatus =
  | 'downloaded'
  | 'partial'
  | 'downloading'
  | 'unmonitored'
  | 'missing'
  | 'unreleased';

function getStatusStyle(
  downloading: boolean,
  releaseDate: Moment,
  isMonitored: boolean,
  percentOfBooks = 0
): CalendarStatus {
  if (percentOfBooks === 100) {
    return 'downloaded';
  }

  if (percentOfBooks > 0) {
    return 'partial';
  }

  if (downloading) {
    return 'downloading';
  }

  if (!isMonitored) {
    return 'unmonitored';
  }

  if (moment().isAfter(releaseDate)) {
    return 'missing';
  }

  return 'unreleased';
}

export default getStatusStyle;
