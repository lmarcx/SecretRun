import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { borderWidth, colors, radius, spacing, typography } from '@/theme/tokens';
import { LeaderboardAvatar } from './LeaderboardAvatar';

interface ProfileMenuButtonProps {
  authenticated: boolean;
  avatarUrl?: string | null | undefined;
  label: string;
  secondaryLabel?: string | undefined;
  signOutDisabled?: boolean | undefined;
  signOutLabel?: string | undefined;
  onLogin: () => void;
  onProfile: () => void;
  onSettings: () => void;
  onSignOut: () => void;
}

export function ProfileMenuButton({
  authenticated,
  avatarUrl,
  label,
  onLogin,
  onProfile,
  onSettings,
  onSignOut,
  secondaryLabel,
  signOutDisabled = false,
  signOutLabel = 'Sign out',
}: ProfileMenuButtonProps) {
  const [open, setOpen] = useState(false);
  const insets = useSafeAreaInsets();

  const close = () => setOpen(false);
  const handlePress = (callback: () => void) => {
    close();
    callback();
  };

  return (
    <>
      <Pressable accessibilityRole="button" onPress={() => setOpen(true)} style={({ pressed }) => [styles.trigger, pressed && styles.triggerPressed]}>
        <LeaderboardAvatar avatarUrl={avatarUrl} label={label} size="sm" />
      </Pressable>

      <Modal animationType="fade" onRequestClose={close} transparent visible={open}>
        <View style={styles.modalRoot}>
          <Pressable onPress={close} style={styles.backdrop} />
          <View style={[styles.menuWrap, { paddingTop: insets.top + spacing.sm }]}>
            <View style={styles.menu}>
              <View style={styles.identityRow}>
                <LeaderboardAvatar avatarUrl={avatarUrl} label={label} />
                <View style={styles.identityCopy}>
                  <Text numberOfLines={1} style={styles.identityTitle}>
                    {label}
                  </Text>
                  {secondaryLabel ? (
                    <Text numberOfLines={1} style={styles.identitySubtitle}>
                      {secondaryLabel}
                    </Text>
                  ) : null}
                </View>
              </View>

              {authenticated ? (
                <>
                  <MenuItem label="Profile" onPress={() => handlePress(onProfile)} />
                  <MenuItem label="Settings" onPress={() => handlePress(onSettings)} />
                  <MenuItem danger disabled={signOutDisabled} label={signOutLabel} onPress={() => handlePress(onSignOut)} />
                </>
              ) : (
                <MenuItem label="Login" onPress={() => handlePress(onLogin)} />
              )}
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

function MenuItem({
  danger = false,
  disabled = false,
  label,
  onPress,
}: {
  danger?: boolean;
  disabled?: boolean;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.item,
        pressed && !disabled && styles.itemPressed,
        disabled && styles.itemDisabled,
      ]}
    >
      <Text style={[styles.itemLabel, danger && styles.itemLabelDanger, disabled && styles.itemLabelDisabled]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  trigger: {
    borderRadius: radius.pill,
  },
  triggerPressed: {
    opacity: 0.9,
  },
  modalRoot: {
    flex: 1,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.overlay,
  },
  menuWrap: {
    paddingHorizontal: spacing.md,
    alignItems: 'flex-end',
  },
  menu: {
    width: 220,
    borderRadius: radius.md,
    borderWidth: borderWidth.regular,
    borderColor: colors.border,
    backgroundColor: colors.backgroundRaised,
    padding: spacing.sm,
    gap: spacing.xs,
  },
  identityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radius.md,
    borderWidth: borderWidth.regular,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  identityCopy: {
    flex: 1,
    gap: spacing.xxs,
  },
  identityTitle: {
    ...typography.body,
    color: colors.textPrimary,
  },
  identitySubtitle: {
    ...typography.bodySm,
    color: colors.textMuted,
  },
  item: {
    minHeight: 44,
    borderRadius: radius.md,
    borderWidth: borderWidth.regular,
    borderColor: colors.border,
    backgroundColor: colors.surfaceMuted,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  itemPressed: {
    backgroundColor: colors.surface,
  },
  itemDisabled: {
    opacity: 0.5,
  },
  itemLabel: {
    ...typography.button,
    color: colors.textPrimary,
  },
  itemLabelDanger: {
    color: colors.danger,
  },
  itemLabelDisabled: {
    color: colors.textMuted,
  },
});
