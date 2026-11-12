import Slider from '@react-native-community/slider';
import { getSystemHapticsStatus, isSystemHapticsAvailable } from 'expo-system-haptics';
import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Switch, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { useTheme } from '../../hooks/useTheme';
import { settingsStyles } from '../../styles/settingsStyles';
import {
  HAPTICS_BLUETOOTH_DELAY_STEP_MS,
  MAX_HAPTICS_BLUETOOTH_DELAY_MS,
  playbackSettingsStore,
  type HapticsMode,
} from '../../store/playbackSettingsStore';
import { DropdownRow, type DropdownOption } from './DropdownRow';
import { SettingsSectionTitle } from './SettingsSectionTitle';

const STATUS_POLL_MS = 1000;

/** The native status as a user-facing line. */
function statusLabelKey(status: string): string {
  if (status.startsWith('attached')) return 'systemHapticsActive';
  if (status === 'off') return 'systemHapticsOff';
  if (status === 'unsupported') return 'systemHapticsUnsupported';
  if (status === 'waiting') return 'systemHapticsWaiting';
  return 'systemHapticsProblem';
}

export function MusicHapticsCard() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const musicHaptics = playbackSettingsStore((s) => s.musicHaptics);
  const mode = playbackSettingsStore((s) => s.hapticsMode);
  const delayMs = playbackSettingsStore((s) => s.hapticsBluetoothDelayMs);
  const setMode = playbackSettingsStore((s) => s.setHapticsMode);
  const setMusicHaptics = playbackSettingsStore((s) => s.setMusicHaptics);
  const setDelayMs = playbackSettingsStore((s) => s.setHapticsBluetoothDelayMs);

  // System haptics needs Android 12+ and a device that supports audio-coupled haptics.
  const systemAvailable = useMemo(() => isSystemHapticsAvailable(), []);
  const modeOptions: DropdownOption<HapticsMode>[] = useMemo(
    () => [
      { value: 'beat', label: t('hapticsModeBeat') },
      ...(systemAvailable ? [{ value: 'system' as const, label: t('hapticsModeSystem') }] : []),
    ],
    [t, systemAvailable],
  );

  // The player reports what it did a moment after a change, so follow it.
  const systemMode = musicHaptics && mode === 'system';
  const [status, setStatus] = useState(() => getSystemHapticsStatus());
  useEffect(() => {
    if (!systemMode) return undefined;
    setStatus(getSystemHapticsStatus());
    const timer = setInterval(() => setStatus(getSystemHapticsStatus()), STATUS_POLL_MS);
    return () => clearInterval(timer);
  }, [systemMode]);

  return (
    <View style={settingsStyles.section}>
      <SettingsSectionTitle>{t('musicHapticsTitle')}</SettingsSectionTitle>
      <View style={[settingsStyles.card, { backgroundColor: colors.card }]}>
        <View
          style={[
            styles.toggleRow,
            musicHaptics && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
          ]}
        >
          <View style={styles.textWrap}>
            <Text style={[styles.label, { color: colors.textPrimary }]}>{t('musicHaptics')}</Text>
            <Text style={[styles.hint, { color: colors.textSecondary }]}>{t('musicHapticsHint')}</Text>
          </View>
          <Switch
            value={musicHaptics}
            onValueChange={setMusicHaptics}
            trackColor={{ false: colors.border, true: colors.primary }}
          />
        </View>
        {musicHaptics && (
          <DropdownRow
            label={t('hapticsMode')}
            value={mode}
            options={modeOptions}
            onChange={setMode}
            isLast={mode === 'system'}
          />
        )}
        {musicHaptics && mode === 'system' && (
          <View style={styles.sliderSection}>
            <View style={styles.sliderHeader}>
              <Text style={[styles.label, { color: colors.textPrimary }]}>{t('systemHapticsStatus')}</Text>
              <Text style={[styles.label, { color: colors.primary }]}>{t(statusLabelKey(status))}</Text>
            </View>
            <Text style={[styles.hint, { color: colors.textSecondary }]}>{t('systemHapticsHint')}</Text>
          </View>
        )}
        {musicHaptics && mode === 'beat' && (
          <View style={styles.sliderSection}>
            <View style={styles.sliderHeader}>
              <Text style={[styles.label, { color: colors.textPrimary }]}>{t('hapticsBluetoothDelay')}</Text>
              <Text style={[styles.label, { color: colors.primary }]}>
                {t('hapticsDelayValue', { value: delayMs })}
              </Text>
            </View>
            <Slider
              style={styles.slider}
              minimumValue={0}
              maximumValue={MAX_HAPTICS_BLUETOOTH_DELAY_MS}
              step={HAPTICS_BLUETOOTH_DELAY_STEP_MS}
              value={delayMs}
              onValueChange={setDelayMs}
              minimumTrackTintColor={colors.primary}
              maximumTrackTintColor={colors.border}
              thumbTintColor={colors.primary}
              accessibilityLabel={t('hapticsBluetoothDelay')}
            />
            <Text style={[styles.hint, { color: colors.textSecondary }]}>
              {t('hapticsBluetoothDelayHint')}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 12,
  },
  sliderSection: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 14,
  },
  sliderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  slider: { width: '100%', height: 40 },
  textWrap: {
    flex: 1,
  },
  label: {
    fontSize: 16,
  },
  hint: {
    fontSize: 12,
    marginTop: 4,
    lineHeight: 16,
  },
});
