import Slider from '@react-native-community/slider';
import { useMemo, useState } from 'react';
import { StyleSheet, Switch, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { useTheme } from '../../hooks/useTheme';
import { settingsStyles } from '../../styles/settingsStyles';
import {
  MAX_SPEED_RAMP_MS,
  MIN_SPEED_RAMP_MS,
  playbackSettingsStore,
  SEMITONE_STEPS,
  SPEED_RAMP_PRESETS_MS,
  SPEED_RAMP_STEP_MS,
  type SemitoneStep,
} from '../../store/playbackSettingsStore';
import { DropdownRow, type DropdownOption } from './DropdownRow';
import { SettingsSectionTitle } from './SettingsSectionTitle';

export function PlayerControlsCard() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const showSkipIntervalButtons = playbackSettingsStore((s) => s.showSkipIntervalButtons);
  const showSleepTimerButton = playbackSettingsStore((s) => s.showSleepTimerButton);
  const setShowSkipIntervalButtons = playbackSettingsStore((s) => s.setShowSkipIntervalButtons);
  const setShowSleepTimerButton = playbackSettingsStore((s) => s.setShowSleepTimerButton);
  const showSemitoneControls = playbackSettingsStore((s) => s.showSemitoneControls);
  const semitoneStep = playbackSettingsStore((s) => s.semitoneStep);
  const setShowSemitoneControls = playbackSettingsStore((s) => s.setShowSemitoneControls);
  const setSemitoneStep = playbackSettingsStore((s) => s.setSemitoneStep);

  const gradualSpeedChange = playbackSettingsStore((s) => s.gradualSpeedChange);
  const speedRampMs = playbackSettingsStore((s) => s.speedRampMs);
  const setGradualSpeedChange = playbackSettingsStore((s) => s.setGradualSpeedChange);
  const setSpeedRampMs = playbackSettingsStore((s) => s.setSpeedRampMs);
  const [customRamp, setCustomRamp] = useState(
    () => !(SPEED_RAMP_PRESETS_MS as readonly number[]).includes(speedRampMs),
  );

  const rampOptions: DropdownOption<number | 'custom'>[] = useMemo(
    () => [
      ...SPEED_RAMP_PRESETS_MS.map((v) => ({ value: v, label: t('rampSecondsValue', { value: v / 1000 }) })),
      { value: 'custom' as const, label: t('custom') },
    ],
    [t],
  );

  const handleRampChange = (value: number | 'custom') => {
    if (value === 'custom') {
      setCustomRamp(true);
      return;
    }
    setCustomRamp(false);
    setSpeedRampMs(value);
  };

  const stepOptions: DropdownOption<SemitoneStep>[] = useMemo(
    () => SEMITONE_STEPS.map((v) => ({ value: v, label: t('semitoneStepValue', { value: v }) })),
    [t],
  );

  return (
    <View style={settingsStyles.section}>
      <SettingsSectionTitle>{t('playerControls')}</SettingsSectionTitle>
      <View style={[settingsStyles.card, { backgroundColor: colors.card }]}>
        <View style={[styles.toggleRow, { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }]}>
          <View style={styles.textWrap}>
            <Text style={[styles.label, { color: colors.textPrimary }]}>
              {t('showSkipIntervalButtons')}
            </Text>
            <Text style={[styles.hint, { color: colors.textSecondary }]}>
              {t('showSkipIntervalButtonsHint')}
            </Text>
          </View>
          <Switch
            value={showSkipIntervalButtons}
            onValueChange={setShowSkipIntervalButtons}
            trackColor={{ false: colors.border, true: colors.primary }}
          />
        </View>
        <View style={[styles.toggleRow, { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }]}>
          <View style={styles.textWrap}>
            <Text style={[styles.label, { color: colors.textPrimary }]}>
              {t('showSleepTimerButton')}
            </Text>
            <Text style={[styles.hint, { color: colors.textSecondary }]}>
              {t('showSleepTimerButtonHint')}
            </Text>
          </View>
          <Switch
            value={showSleepTimerButton}
            onValueChange={setShowSleepTimerButton}
            trackColor={{ false: colors.border, true: colors.primary }}
          />
        </View>
        <View style={[styles.toggleRow, { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }]}>
          <View style={styles.textWrap}>
            <Text style={[styles.label, { color: colors.textPrimary }]}>
              {t('showSemitoneControls')}
            </Text>
            <Text style={[styles.hint, { color: colors.textSecondary }]}>
              {t('showSemitoneControlsHint')}
            </Text>
          </View>
          <Switch
            value={showSemitoneControls}
            onValueChange={setShowSemitoneControls}
            trackColor={{ false: colors.border, true: colors.primary }}
          />
        </View>
        {showSemitoneControls && (
          <DropdownRow
            label={t('semitoneStep')}
            value={semitoneStep}
            options={stepOptions}
            onChange={setSemitoneStep}
          />
        )}
        <View
          style={[
            styles.toggleRow,
            gradualSpeedChange && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
          ]}
        >
          <View style={styles.textWrap}>
            <Text style={[styles.label, { color: colors.textPrimary }]}>
              {t('gradualSpeedChange')}
            </Text>
            <Text style={[styles.hint, { color: colors.textSecondary }]}>
              {t('gradualSpeedChangeHint')}
            </Text>
          </View>
          <Switch
            value={gradualSpeedChange}
            onValueChange={setGradualSpeedChange}
            trackColor={{ false: colors.border, true: colors.primary }}
          />
        </View>
        {gradualSpeedChange && (
          <DropdownRow
            label={t('speedRampDuration')}
            value={customRamp ? 'custom' : speedRampMs}
            options={rampOptions}
            onChange={handleRampChange}
            isLast={!customRamp}
          />
        )}
        {gradualSpeedChange && customRamp && (
          <View style={styles.sliderSection}>
            <View style={styles.sliderHeader}>
              <Text style={[styles.label, { color: colors.textPrimary }]}>{t('customDuration')}</Text>
              <Text style={[styles.label, { color: colors.primary }]}>
                {t('rampSecondsValue', { value: speedRampMs / 1000 })}
              </Text>
            </View>
            <Slider
              style={styles.slider}
              minimumValue={MIN_SPEED_RAMP_MS}
              maximumValue={MAX_SPEED_RAMP_MS}
              step={SPEED_RAMP_STEP_MS}
              value={speedRampMs}
              onValueChange={setSpeedRampMs}
              minimumTrackTintColor={colors.primary}
              maximumTrackTintColor={colors.border}
              thumbTintColor={colors.primary}
              accessibilityLabel={t('customDuration')}
            />
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
    paddingBottom: 8,
  },
  sliderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 4,
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
