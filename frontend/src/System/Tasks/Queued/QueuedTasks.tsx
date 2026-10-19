import React from 'react';
import useCommands from 'Commands/useCommands';
import FieldSet from 'Components/FieldSet';
import LoadingIndicator from 'Components/Loading/LoadingIndicator';
import Table from 'Components/Table/Table';
import TableBody from 'Components/Table/TableBody';
import translate from 'Utilities/String/translate';
import QueuedTaskRow from './QueuedTaskRow';

const columns = [
  {
    name: 'trigger',
    label: '',
    isVisible: true,
  },
  {
    name: 'commandName',
    label: () => translate('Name'),
    isVisible: true,
  },
  {
    name: 'queued',
    label: () => translate('Queued'),
    isVisible: true,
  },
  {
    name: 'started',
    label: () => translate('Started'),
    isVisible: true,
  },
  {
    name: 'ended',
    label: () => translate('Ended'),
    isVisible: true,
  },
  {
    name: 'duration',
    label: () => translate('Duration'),
    isVisible: true,
  },
  {
    name: 'actions',
    isVisible: true,
  },
];

export default function QueuedTasks() {
  const { data: items, isLoading, isFetched } = useCommands();

  return (
    <FieldSet legend={translate('Queue')}>
      {isLoading && <LoadingIndicator />}

      {isFetched && (
        <Table columns={columns}>
          <TableBody>
            {items.map((item) => {
              return <QueuedTaskRow key={item.id} {...item} />;
            })}
          </TableBody>
        </Table>
      )}
    </FieldSet>
  );
}
