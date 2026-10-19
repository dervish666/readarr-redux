// HealthResource. Type is NzbDrone.Core.HealthCheck.HealthCheckResult, sent lower case.
export type HealthType = 'ok' | 'notice' | 'warning' | 'error';

interface Health {
  id?: number;
  source: string;
  type: HealthType;
  message: string;
  wikiUrl: string;
}

export default Health;
