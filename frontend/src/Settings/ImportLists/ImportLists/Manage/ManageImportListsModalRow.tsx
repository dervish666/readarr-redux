import React, { useCallback } from 'react';
import TableRowCell from 'Components/Table/Cells/TableRowCell';
import TableSelectCell from 'Components/Table/Cells/TableSelectCell';
import Column from 'Components/Table/Column';
import TableRow from 'Components/Table/TableRow';
import TagList from 'Components/TagList';
import { useMetadataProfile } from 'Settings/Profiles/Metadata/useMetadataProfiles';
import { useQualityProfile } from 'Settings/Profiles/Quality/useQualityProfiles';
import { useTagList } from 'Tags/useTags';
import { SelectStateInputProps } from 'typings/props';
import translate from 'Utilities/String/translate';
import styles from './ManageImportListsModalRow.module.css';

interface ManageImportListsModalRowProps {
  id: number;
  name: string;
  rootFolderPath: string;
  qualityProfileId: number;
  metadataProfileId: number;
  implementation: string;
  tags: number[];
  enableAutomaticAdd: boolean;
  columns: Column[];
  isSelected?: boolean;
  onSelectedChange(result: SelectStateInputProps): void;
}

function ManageImportListsModalRow(props: ManageImportListsModalRowProps) {
  const {
    id,
    isSelected,
    name,
    rootFolderPath,
    qualityProfileId,
    metadataProfileId,
    implementation,
    enableAutomaticAdd,
    tags,
    onSelectedChange,
  } = props;

  const qualityProfile = useQualityProfile(qualityProfileId);
  const metadataProfile = useMetadataProfile(metadataProfileId);
  const tagList = useTagList();

  const onSelectedChangeWrapper = useCallback(
    (result: SelectStateInputProps) => {
      onSelectedChange({
        ...result,
      });
    },
    [onSelectedChange]
  );

  return (
    <TableRow>
      <TableSelectCell
        id={id}
        isSelected={isSelected}
        onSelectedChange={onSelectedChangeWrapper}
      />

      <TableRowCell className={styles.name}>{name}</TableRowCell>

      <TableRowCell className={styles.implementation}>
        {implementation}
      </TableRowCell>

      <TableRowCell className={styles.qualityProfileId}>
        {qualityProfile?.name ?? translate('None')}
      </TableRowCell>

      <TableRowCell className={styles.metadataProfileId}>
        {metadataProfile?.name ?? translate('None')}
      </TableRowCell>

      <TableRowCell className={styles.rootFolderPath}>
        {rootFolderPath}
      </TableRowCell>

      <TableRowCell className={styles.enableAutomaticAdd}>
        {enableAutomaticAdd ? translate('Yes') : translate('No')}
      </TableRowCell>

      <TableRowCell className={styles.tags}>
        <TagList tags={tags} tagList={tagList} />
      </TableRowCell>
    </TableRow>
  );
}

export default ManageImportListsModalRow;
