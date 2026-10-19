import classNames from 'classnames';
import React from 'react';
import { CalendarStatus } from 'Calendar/getStatusStyle';
import Icon from 'Components/Icon';
import styles from './LegendItem.css';

interface LegendItemProps {
  name: string;
  tooltip: string;
  status?: CalendarStatus;
  icon?: object;
  kind?: string;
}

function LegendItem({ name, tooltip, status, icon, kind }: LegendItemProps) {
  return (
    <div className={styles.legendItem} title={tooltip}>
      <span className={styles.indicator}>
        {icon ? (
          <Icon name={icon} kind={kind} />
        ) : (
          <span className={classNames(styles.bar, status && styles[status])} />
        )}
      </span>

      {name}
    </div>
  );
}

export default LegendItem;
