import React, {
  ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { useHistory } from 'react-router-dom';
import PageToolbar from 'Components/Page/Toolbar/PageToolbar';
import PageToolbarButton from 'Components/Page/Toolbar/PageToolbarButton';
import PageToolbarSection from 'Components/Page/Toolbar/PageToolbarSection';
import useKeyboardShortcuts from 'Helpers/Hooks/useKeyboardShortcuts';
import { icons } from 'Helpers/Props';
import translate from 'Utilities/String/translate';
import AdvancedSettingsButton from './AdvancedSettingsButton';
import PendingChangesModal from './PendingChangesModal';

interface PendingLocation {
  pathname: string;
  search: string;
}

interface SettingsToolbarProps {
  showSave?: boolean;
  isSaving?: boolean;
  hasPendingChanges?: boolean;
  additionalButtons?: ReactNode;
  onSavePress?: () => void;
}

// The toolbar every settings page shares: show advanced, Save (also mod+s) and the
// "unsaved changes" prompt when leaving with pending changes. react-router 5 has no
// useBlocker, so history.block does what Sonarr's useSettingsSave does.
function SettingsToolbar({
  showSave = true,
  isSaving = false,
  hasPendingChanges = false,
  additionalButtons,
  onSavePress,
}: SettingsToolbarProps) {
  const history = useHistory();
  const { bindShortcut, unbindShortcut } = useKeyboardShortcuts();

  const [pendingLocation, setPendingLocation] = useState<{
    location: PendingLocation;
    action: string;
  } | null>(null);

  const hasPendingChangesRef = useRef(hasPendingChanges);
  const isConfirmed = useRef(false);

  hasPendingChangesRef.current = hasPendingChanges;

  useEffect(() => {
    const unblock = history.block(
      (location: PendingLocation, action: string) => {
        if (isConfirmed.current) {
          isConfirmed.current = false;

          return true;
        }

        if (hasPendingChangesRef.current) {
          setPendingLocation({ location, action });

          return false;
        }

        return true;
      }
    );

    return () => {
      unblock();
    };
  }, [history]);

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
    if (!pendingLocation) {
      return;
    }

    const { location, action } = pendingLocation;

    isConfirmed.current = true;
    setPendingLocation(null);

    if (action === 'PUSH') {
      history.push(`${location.pathname}${location.search}`);
    } else {
      // Back and forward both arrive as POP, so which way the user went is unknown;
      // assume back.
      history.goBack();
    }
  }, [history, pendingLocation]);

  const handleCancelNavigation = useCallback(() => {
    setPendingLocation(null);
  }, []);

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
        isOpen={pendingLocation !== null}
        onConfirm={handleConfirmNavigation}
        onCancel={handleCancelNavigation}
      />
    </PageToolbar>
  );
}

export default SettingsToolbar;
