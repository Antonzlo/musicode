/**
 * PlaybackSpeedSheet — bottom-sheet picker for playback speed + a pitch
 * correction selector, opened from the player's PlaybackRateButton.
 *
 * Speed: a −/+ stepper and slider set any rate in real time; the editable
 * preset pills below apply on tap and are replaced with the current rate on
 * long-press. The sheet stays open so the user can keep adjusting.
 *
 * Pitch correction (None / Voice / Music): only effective at rate != 1x
 * (RNQP auto-bypasses at 1x). None follows the rate; Voice/Music preserve pitch.
 *
 * Music haptics: the quick switch, mode and Bluetooth delay for vibrating with
 * the music, plus a link to the full playback settings.
 */

import Ionicons from '@react-native-vector-icons/ionicons/static';
import { useRouter } from 'expo-router';
import { memo, useCallback } from 'react';
import Slider from '@react-native-community/slider';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { BottomSheet } from './BottomSheet';
import { systemHapticsStatusKey, useSystemHaptics } from '../hooks/useSystemHaptics';
import { useTheme } from '../hooks/useTheme';
import { applyPitchCorrection, applyPlaybackRate } from '../services/playerService';
import {
  HAPTICS_BLUETOOTH_DELAY_STEP_MS,
  MAX_HAPTICS_BLUETOOTH_DELAY_MS,
  MAX_PLAYBACK_RATE,
  MIN_PLAYBACK_RATE,
  normalizePlaybackRate,
  PITCH_CORRECTION_MODES,
  PLAYBACK_RATE_STEP,
  playbackRateToSemitones,
  stepPlaybackRateBySemitones,
  playbackSettingsStore,
  type HapticsMode,
  type PitchCorrection,
  type PlaybackRate,
} from '../store/playbackSettingsStore';
import { selectionAsync } from '../utils/haptics';

/** Compact rate label: 1 → "1x", 0.75 → ".75x", 1.25 → "1.25x". */
function formatRate(rate: number): string {
  if (Number.isInteger(rate)) return `${rate}x`;
  if (rate < 1) return `${rate.toString().replace('0.', '.')}x`;
  return `${rate}x`;
}

/** Pitch offset label: 0 → "0.00st", 1.0595 → "+1.00st", 0.5 → "-12.00st". */
function formatSemitones(rate: number): string {
  const st = playbackRateToSemitones(rate);
  const text = Math.abs(st).toFixed(2);
  if (Number(text) === 0) return '0.00st';
  return `${st < 0 ? '-' : '+'}${text}st`;
}

const PITCH_LABEL_KEYS: Record<PitchCorrection, string> = {
  none: 'pitchCorrectionNone',
  voice: 'pitchCorrectionVoice',
  music: 'pitchCorrectionMusic',
};

interface Props {
  visible: boolean;
  onClose: () => void;
}

export const PlaybackSpeedSheet = memo(function PlaybackSpeedSheet({ visible, onClose }: Props) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const playbackRate = playbackSettingsStore((s) => s.playbackRate);
  const playbackRatePresets = playbackSettingsStore((s) => s.playbackRatePresets);
  const showSemitoneControls = playbackSettingsStore((s) => s.showSemitoneControls);
  const semitoneStep = playbackSettingsStore((s) => s.semitoneStep);
  const pitchCorrection = playbackSettingsStore((s) => s.pitchCorrection);
  const router = useRouter();
  const musicHaptics = playbackSettingsStore((s) => s.musicHaptics);
  const hapticsMode = playbackSettingsStore((s) => s.hapticsMode);
  const hapticsDelayMs = playbackSettingsStore((s) => s.hapticsBluetoothDelayMs);
  const { available: systemHapticsAvailable, status: systemHapticsStatus } = useSystemHaptics(
    visible && musicHaptics && hapticsMode === 'system',
  );

  const handleSelectRate = useCallback((rate: PlaybackRate) => {
    selectionAsync();
    void applyPlaybackRate(rate);
  }, []);

  const handleSliderChange = useCallback((value: number) => {
    const rate = normalizePlaybackRate(value);
    if (rate !== playbackSettingsStore.getState().playbackRate) void applyPlaybackRate(rate);
  }, []);

  const handleStep = useCallback((delta: number) => {
    selectionAsync();
    const current = playbackSettingsStore.getState().playbackRate;
    void applyPlaybackRate(normalizePlaybackRate(current + delta));
  }, []);

  const handleSemitoneStep = useCallback((direction: 1 | -1) => {
    selectionAsync();
    const { playbackRate, semitoneStep: step } = playbackSettingsStore.getState();
    void applyPlaybackRate(stepPlaybackRateBySemitones(playbackRate, direction * step));
  }, []);

  const handleSavePreset = useCallback((index: number) => {
    selectionAsync();
    const { playbackRate, playbackRatePresets: presets, setPlaybackRatePresets } =
      playbackSettingsStore.getState();
    setPlaybackRatePresets(presets.map((p, i) => (i === index ? playbackRate : p)));
  }, []);

  const handleToggleHaptics = useCallback((enabled: boolean) => {
    selectionAsync();
    playbackSettingsStore.getState().setMusicHaptics(enabled);
  }, []);

  const handleSelectHapticsMode = useCallback((mode: HapticsMode) => {
    selectionAsync();
    playbackSettingsStore.getState().setHapticsMode(mode);
  }, []);

  const handleOpenPlaybackSettings = useCallback(() => {
    onClose();
    router.push('/settings-playback');
  }, [onClose, router]);

  const handleSelectPitch = useCallback((mode: PitchCorrection) => {
    selectionAsync();
    void applyPitchCorrection(mode);
  }, []);

  return (
    <BottomSheet visible={visible} onClose={onClose} maxHeight="85%">
      <Text style={[styles.title, { color: colors.textPrimary }]}>{t('playbackSpeed')}</Text>

      <View style={styles.stepperRow}>
        <Pressable
          onPress={() => handleStep(-PLAYBACK_RATE_STEP)}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={t('decreaseSpeed')}
          style={({ pressed }) => [
            styles.stepButton,
            { backgroundColor: colors.inputBg },
            pressed && styles.pillPressed,
          ]}
        >
          <Text style={[styles.stepLabel, { color: colors.textPrimary }]} allowFontScaling={false}>-</Text>
        </Pressable>
        <Text style={[styles.rateReadout, { color: colors.textPrimary }]} allowFontScaling={false}>
          {formatRate(playbackRate)}
        </Text>
        <Pressable
          onPress={() => handleStep(PLAYBACK_RATE_STEP)}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={t('increaseSpeed')}
          style={({ pressed }) => [
            styles.stepButton,
            { backgroundColor: colors.inputBg },
            pressed && styles.pillPressed,
          ]}
        >
          <Text style={[styles.stepLabel, { color: colors.textPrimary }]} allowFontScaling={false}>+</Text>
        </Pressable>
      </View>
      {showSemitoneControls && (
        <View style={styles.semitoneRow}>
          <Pressable
            onPress={() => handleSemitoneStep(-1)}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={t('decreaseSemitones', { step: semitoneStep })}
            style={({ pressed }) => [
              styles.semitoneButton,
              { backgroundColor: colors.inputBg },
              pressed && styles.pillPressed,
            ]}
          >
            <Text style={[styles.pillLabel, { color: colors.textPrimary }]} allowFontScaling={false}>
              {`-${semitoneStep}st`}
            </Text>
          </Pressable>
          <Text style={[styles.semitoneReadout, { color: colors.textSecondary }]} allowFontScaling={false}>
            {formatSemitones(playbackRate)}
          </Text>
          <Pressable
            onPress={() => handleSemitoneStep(1)}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={t('increaseSemitones', { step: semitoneStep })}
            style={({ pressed }) => [
              styles.semitoneButton,
              { backgroundColor: colors.inputBg },
              pressed && styles.pillPressed,
            ]}
          >
            <Text style={[styles.pillLabel, { color: colors.textPrimary }]} allowFontScaling={false}>
              {`+${semitoneStep}st`}
            </Text>
          </Pressable>
        </View>
      )}
      <Slider
        style={styles.slider}
        minimumValue={MIN_PLAYBACK_RATE}
        maximumValue={MAX_PLAYBACK_RATE}
        step={PLAYBACK_RATE_STEP}
        value={playbackRate}
        onValueChange={handleSliderChange}
        minimumTrackTintColor={colors.primary}
        maximumTrackTintColor={colors.border}
        thumbTintColor={colors.primary}
        accessibilityLabel={t('playbackSpeed')}
      />

      <View style={styles.speedGrid}>
        {playbackRatePresets.map((rate, index) => {
          const active = rate === playbackRate;
          return (
            <Pressable
              key={index}
              onPress={() => handleSelectRate(rate)}
              onLongPress={() => handleSavePreset(index)}
              style={({ pressed }) => [
                styles.pill,
                { backgroundColor: active ? colors.primary : colors.inputBg },
                pressed && styles.pillPressed,
              ]}
            >
              <Text
                style={[styles.pillLabel, { color: active ? '#fff' : colors.textSecondary }]}
                allowFontScaling={false}
                numberOfLines={1}
              >
                {formatRate(rate)}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={[styles.presetHint, { color: colors.textSecondary }]}>
        {t('speedPresetHint')}
      </Text>

      <Text style={[styles.sectionLabel, { color: colors.label }]}>
        {t('pitchCorrection')}
      </Text>
      <View style={styles.pitchRow}>
        {PITCH_CORRECTION_MODES.map((mode) => {
          const active = mode === pitchCorrection;
          return (
            <Pressable
              key={mode}
              onPress={() => handleSelectPitch(mode)}
              style={({ pressed }) => [
                styles.pill,
                styles.pitchPill,
                { backgroundColor: active ? colors.primary : colors.inputBg },
                pressed && styles.pillPressed,
              ]}
            >
              <Text style={[styles.pillLabel, { color: active ? '#fff' : colors.textSecondary }]}>
                {t(PITCH_LABEL_KEYS[mode])}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={[styles.sectionLabel, { color: colors.label }]}>{t('musicHapticsTitle')}</Text>
      <View style={styles.hapticsRow}>
        <Text style={[styles.hapticsLabel, { color: colors.textPrimary }]}>{t('musicHaptics')}</Text>
        <Switch
          value={musicHaptics}
          onValueChange={handleToggleHaptics}
          trackColor={{ false: colors.border, true: colors.primary }}
        />
      </View>
      {musicHaptics && systemHapticsAvailable && (
        <View style={styles.pitchRow}>
          {(['beat', 'system'] as const).map((mode) => {
            const active = mode === hapticsMode;
            return (
              <Pressable
                key={mode}
                onPress={() => handleSelectHapticsMode(mode)}
                style={({ pressed }) => [
                  styles.pill,
                  styles.pitchPill,
                  { backgroundColor: active ? colors.primary : colors.inputBg },
                  pressed && styles.pillPressed,
                ]}
              >
                <Text style={[styles.pillLabel, { color: active ? '#fff' : colors.textSecondary }]}>
                  {t(mode === 'beat' ? 'hapticsModeBeat' : 'hapticsModeSystem')}
                </Text>
              </Pressable>
            );
          })}
        </View>
      )}
      {musicHaptics && hapticsMode === 'beat' && (
        <View style={styles.hapticsDetail}>
          <View style={styles.hapticsDetailHeader}>
            <Text style={[styles.hapticsLabel, { color: colors.textPrimary }]}>{t('hapticsBluetoothDelay')}</Text>
            <Text style={[styles.hapticsLabel, { color: colors.primary }]}>
              {t('hapticsDelayValue', { value: hapticsDelayMs })}
            </Text>
          </View>
          <Slider
            style={styles.hapticsSlider}
            minimumValue={0}
            maximumValue={MAX_HAPTICS_BLUETOOTH_DELAY_MS}
            step={HAPTICS_BLUETOOTH_DELAY_STEP_MS}
            value={hapticsDelayMs}
            onValueChange={(value) => playbackSettingsStore.getState().setHapticsBluetoothDelayMs(value)}
            minimumTrackTintColor={colors.primary}
            maximumTrackTintColor={colors.border}
            thumbTintColor={colors.primary}
            accessibilityLabel={t('hapticsBluetoothDelay')}
          />
        </View>
      )}
      {musicHaptics && hapticsMode === 'system' && (
        <View style={styles.hapticsDetailHeader}>
          <Text style={[styles.hapticsLabel, { color: colors.textPrimary }]}>{t('systemHapticsStatus')}</Text>
          <Text style={[styles.hapticsLabel, { color: colors.primary }]}>
            {t(systemHapticsStatusKey(systemHapticsStatus))}
          </Text>
        </View>
      )}

      <Pressable
        onPress={handleOpenPlaybackSettings}
        accessibilityRole="button"
        accessibilityLabel={t('soundPlayback')}
        style={({ pressed }) => [styles.settingsLink, { borderTopColor: colors.border }, pressed && styles.pillPressed]}
      >
        <Ionicons name="settings-outline" size={20} color={colors.textSecondary} />
        <Text style={[styles.settingsLinkLabel, { color: colors.textPrimary }]}>{t('soundPlayback')}</Text>
        <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
      </Pressable>
    </BottomSheet>
  );
});

const styles = StyleSheet.create({
  title: { fontSize: 18, fontWeight: '700', paddingHorizontal: 4, marginBottom: 14 },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  stepButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepLabel: { fontSize: 26, fontWeight: '600', lineHeight: 30 },
  rateReadout: { fontSize: 32, fontWeight: '700', fontVariant: ['tabular-nums'] },
  semitoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    marginTop: 12,
  },
  semitoneButton: {
    minWidth: 72,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 16,
    alignItems: 'center',
  },
  semitoneReadout: { fontSize: 15, fontWeight: '600', fontVariant: ['tabular-nums'] },
  slider: { height: 40, marginTop: 8, marginBottom: 12 },
  presetHint: { fontSize: 12, paddingHorizontal: 4, marginTop: 8 },
  speedGrid: {
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 4,
    paddingBottom: 4,
  },
  pill: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 2,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillPressed: { opacity: 0.7 },
  pillLabel: { fontSize: 14, fontWeight: '600', fontVariant: ['tabular-nums'] },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: 4,
    marginTop: 24,
    marginBottom: 10,
  },
  pitchRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 4, marginTop: 10 },
  pitchPill: { flex: 1 },
  hapticsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  hapticsLabel: { fontSize: 15 },
  hapticsDetail: { paddingHorizontal: 4, marginTop: 10 },
  hapticsDetailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    marginTop: 10,
  },
  hapticsSlider: { height: 40 },
  settingsLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 4,
    paddingVertical: 14,
    marginTop: 20,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  settingsLinkLabel: { flex: 1, fontSize: 15 },
});
