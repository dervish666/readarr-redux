import Column from 'Components/Table/Column';

const growableColumns = ['qualityProfileId', 'path', 'tags'];

export default function hasGrowableColumns(columns: Column[]) {
  return columns.some(
    ({ name, isVisible }) => growableColumns.includes(name) && isVisible
  );
}
