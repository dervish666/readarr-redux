import React, { useMemo } from 'react';
import { useMultipleAuthors } from 'Author/useAuthors';
import { CommandBody } from 'Commands/Command';
import TableRowCell from 'Components/Table/Cells/TableRowCell';
import translate from 'Utilities/String/translate';
import styles from './QueuedTaskRowNameCell.module.css';

function formatTitles(titles: string[]) {
  if (!titles) {
    return null;
  }

  if (titles.length > 11) {
    return (
      <span title={titles.join(', ')}>
        {titles.slice(0, 10).join(', ')}, {titles.length - 10} more
      </span>
    );
  }

  return <span>{titles.join(', ')}</span>;
}

export interface QueuedTaskRowNameCellProps {
  commandName: string;
  body: CommandBody;
  clientUserAgent?: string;
}

export default function QueuedTaskRowNameCell(
  props: QueuedTaskRowNameCellProps
) {
  const { commandName, body, clientUserAgent } = props;
  const authorIds = useMemo(() => {
    const ids = [...(body.authorIds ?? [])];

    if (body.authorId) {
      ids.push(body.authorId);
    }

    return ids;
  }, [body.authorIds, body.authorId]);

  const authors = useMultipleAuthors(authorIds);
  const sortedAuthors = useMemo(
    () => [...authors].sort((a, b) => a.sortName.localeCompare(b.sortName)),
    [authors]
  );

  return (
    <TableRowCell>
      <span className={styles.commandName}>
        {commandName}
        {sortedAuthors.length ? (
          <span> - {formatTitles(sortedAuthors.map((a) => a.authorName))}</span>
        ) : null}
      </span>

      {clientUserAgent ? (
        <span
          className={styles.userAgent}
          title={translate('TaskUserAgentTooltip')}
        >
          {translate('From')}: {clientUserAgent}
        </span>
      ) : null}
    </TableRowCell>
  );
}
