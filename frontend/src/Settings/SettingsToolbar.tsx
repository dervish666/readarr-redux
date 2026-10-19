import React, { ReactNode, useCallback, useEffect } from 'react';
import { useBlocker } from 'react-router-dom';
import PageToolbar from 'Components/Page/Toolbar/PageToolbar';
import PageToolbarButton from 'Components/Page/Toolbar/PageToolbarButton';
import PageToolbarSection from 'Components/Page/Toolbar/PageToolbarSection';
import useKeyboardShortcuts from 'Helpers/Hooks/useKeyboardShortcuts';
import { icons } from 'Helpers/Props';
import translate from 'Utilities/String/translate';
import AdvancedSettingsButton from './AdvancedSettingsButton';
import PendingChangesModal from './PendingChangesModal';

interface SettingsToolbarProps {
  showSave?: boolean;
  isSaving?: boolean;
  hasPendingChanges?: boolean;
  additionalButtons?: ReactNode;
  onSavePress?: () => void;
}

// The toolbar every settings page shares: show advanced, Save (also mod+s) and the
// "unsaved changes" prompt when leaving with pending changes, through useBlocker as
// in Sonarr b4b415731 (#8614).
function SettingsToolbar({
  showSave = true,
  isSaving = false,
  hasPendingChanges = false,
  additionalButtons,
  onSavePress,
}: SettingsToolbarProps) {
  const { bindShortcut, unbindShortcut } = useKeyboardShortcuts();

  const blocker = useBlocker(() => hasPendingChanges);

  useEffect(() => {
    bindShortcut(
      'SAVE_SETTINGS',
      (e) => {
        e.preventDefault();

        if (hasPendingChanges) {
          onSavePress?.();
        }
      },
      { isGlobal: true }
    );

    return () => {
      unbindShortcut('SAVE_SETTINGS');
    };
  }, [hasPendingChanges, onSavePress, bindShortcut, unbindShortcut]);

  const handleConfirmNavigation = useCallback(() => {
    blocker.proceed?.();
  }, [blocker]);

  const handleCancelNavigation = useCallback(() => {
    blocker.reset?.();
  }, [blocker]);

  const handleSavePress = useCallback(() => {
    onSavePress?.();
  }, [onSavePress]);

  return (
    <PageToolbar>
      <PageToolbarSection>
        <AdvancedSettingsButton showLabel={true} />

        {showSave ? (
          <PageToolbarButton
            label={
              hasPendingChanges
                ? translate('HasPendingChangesSaveChanges')
                : translate('HasPendingChangesNoChanges')
            }
            iconName={icons.SAVE}
            isSpinning={isSaving}
            isDisabled={!hasPendingChanges}
            onPress={handleSavePress}
          />
        ) : null}

        {additionalButtons}
      </PageToolbarSection>

      <PendingChangesModal
        isOpen={blocker.state === 'blocked'}
        onConfirm={handleConfirmNavigation}
        onCancel={handleCancelNavigation}
      />
    </PageToolbar>
  );
}

export default SettingsToolbar;
