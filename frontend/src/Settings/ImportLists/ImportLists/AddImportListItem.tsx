import React, { useCallback } from 'react';
import Icon from 'Components/Icon';
import Button from 'Components/Link/Button';
import Link from 'Components/Link/Link';
import Menu from 'Components/Menu/Menu';
import MenuContent from 'Components/Menu/MenuContent';
import { align, icons, sizes } from 'Helpers/Props';
import { SelectedSchema } from 'Settings/useProviderSchema';
import Provider from 'typings/Provider';
import translate from 'Utilities/String/translate';
import AddImportListPresetMenuItem from './AddImportListPresetMenuItem';
import styles from './AddImportListItem.module.css';

interface AddImportListItemProps {
  implementation: string;
  implementationName: string;
  infoLink: string;
  presets?: Provider[];
  onImportListSelect: (selectedSchema: SelectedSchema) => void;
}

function AddImportListItem({
  implementation,
  implementationName,
  infoLink,
  presets,
  onImportListSelect,
}: AddImportListItemProps) {
  const hasPresets = !!presets && !!presets.length;

  const handleImportListSelect = useCallback(() => {
    onImportListSelect({ implementation, implementationName });
  }, [implementation, implementationName, onImportListSelect]);

  return (
    <div className={styles.list}>
      <Link
        className={styles.underlay}
        aria-label={translate('AddImportListImplementation', {
          implementationName,
        })}
        onPress={handleImportListSelect}
      />

      <div className={styles.overlay}>
        <div className={styles.name}>{implementationName}</div>

        <div className={styles.actions}>
          {hasPresets ? (
            <Menu className={styles.presetsMenu} alignMenu={align.RIGHT}>
              <Button className={styles.presetsMenuButton} size={sizes.SMALL}>
                {translate('Presets')}
              </Button>

              <MenuContent>
                {presets.map((preset) => (
                  <AddImportListPresetMenuItem
                    key={preset.name}
                    name={preset.name}
                    implementation={implementation}
                    implementationName={implementationName}
                    onPress={onImportListSelect}
                  />
                ))}
              </MenuContent>
            </Menu>
          ) : null}

          <Link
            className={styles.infoLink}
            to={infoLink}
            title={translate('MoreInfo')}
            aria-label={translate('MoreInfo')}
          >
            <Icon name={icons.INFO} size={18} />
          </Link>
        </div>
      </div>
    </div>
  );
}

export default AddImportListItem;
