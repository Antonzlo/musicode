import Slider from '@react-native-community/slider';
import { useMemo, useState } from 'react';
import { StyleSheet, Switch, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { useTheme } from '../../hooks/useTheme';
import { settingsStyles } from '../../styles/settingsStyles';
import {
  MAX_SPEED_RAMP_MS,
  MAX_SPEED_RAMP_RATE,
  MIN_SPEED_RAMP_MS,
  MIN_SPEED_RAMP_RATE,
  playbackSettingsStore,
  SPEED_RAMP_PRESETS_MS,
  SPEED_RAMP_RATE_PRESETS,
  SPEED_RAMP_RATE_STEP,
  SPEED_RAMP_STEP_MS,
  type SpeedRampMode,
} from '../../store/playbackSettingsStore';
import { DropdownRow, type DropdownOption } from './DropdownRow';
import { SettingsSectionTitle } from './SettingsSectionTitle';

/** A preset dropdown with a trailing "Custom" entry that reveals a slider. */
function PresetOrCustomRows({
  label,
  customLabel,
  value,
  presets,
  formatValue,
  min,
  max,
  step,
  onChange,
  isLast,
}: {
  label: string;
  customLabel: string;
  value: number;
  presets: readonly number[];
  formatValue: (value: number) => string;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  isLast: boolean;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [custom, setCustom] = useState(() => !presets.includes(value));

  const options: DropdownOption<number | 'custom'>[] = useMemo(
    () => [
      ...presets.map((v) => ({ value: v, label: formatValue(v) })),
      { value: 'custom' as const, label: t('custom') },
    ],
    [presets, formatValue, t],
  );

  const handleChange = (next: number | 'custom') => {
    if (next === 'custom') {
      setCustom(true);
      return;
    }
    setCustom(false);
    onChange(next);
  };

  return (
    <>
      <DropdownRow
        label={label}
        value={custom ? 'custom' : value}
        options={options}
        onChange={handleChange}
        isLast={isLast && !custom}
      />
      {custom && (
        <View style={styles.sliderSection}>
          <View style={styles.sliderHeader}>
            <Text style={[styles.label, { color: colors.textPrimary }]}>{customLabel}</Text>
            <Text style={[styles.label, { color: colors.primary }]}>{formatValue(value)}</Text>
          </View>
          <Slider
            style={styles.slider}
            minimumValue={min}
            maximumValue={max}
            step={step}
            value={value}
            onValueChange={onChange}
            minimumTrackTintColor={colors.primary}
            maximumTrackTintColor={colors.border}
            thumbTintColor={colors.primary}
            accessibilityLabel={customLabel}
          />
        </View>
      )}
    </>
  );
}

export function SpeedGlideCard() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const gradualSpeedChange = playbackSettingsStore((s) => s.gradualSpeedChange);
  const speedRampMode = playbackSettingsStore((s) => s.speedRampMode);
  const speedRampMs = playbackSettingsStore((s) => s.speedRampMs);
  const speedRampSemitonesPerSec = playbackSettingsStore((s) => s.speedRampSemitonesPerSec);
  const setGradualSpeedChange = playbackSettingsStore((s) => s.setGradualSpeedChange);
  const setSpeedRampMode = playbackSettingsStore((s) => s.setSpeedRampMode);
  const setSpeedRampMs = playbackSettingsStore((s) => s.setSpeedRampMs);
  const setSpeedRampSemitonesPerSec = playbackSettingsStore((s) => s.setSpeedRampSemitonesPerSec);

  const modeOptions: DropdownOption<SpeedRampMode>[] = useMemo(
    () => [
      { value: 'duration', label: t('glideFixedDuration') },
      { value: 'rate', label: t('glideConstantSpeed') },
    ],
    [t],
  );
  const formatSeconds = useMemo(() => (ms: number) => t('rampSecondsValue', { value: ms / 1000 }), [t]);
  const formatRate = useMemo(() => (st: number) => t('rampSemitonesPerSecond', { value: st }), [t]);

  return (
    <View style={settingsStyles.section}>
      <SettingsSectionTitle>{t('speedGlide')}</SettingsSectionTitle>
      <View style={[settingsStyles.card, { backgroundColor: colors.card }]}>
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
          <>
            <DropdownRow
              label={t('glideStyle')}
              value={speedRampMode}
              options={modeOptions}
              onChange={setSpeedRampMode}
            />
            {speedRampMode === 'duration' ? (
              <PresetOrCustomRows
                label={t('speedRampDuration')}
                customLabel={t('customDuration')}
                value={speedRampMs}
                presets={SPEED_RAMP_PRESETS_MS}
                formatValue={formatSeconds}
                min={MIN_SPEED_RAMP_MS}
                max={MAX_SPEED_RAMP_MS}
                step={SPEED_RAMP_STEP_MS}
                onChange={setSpeedRampMs}
                isLast
              />
            ) : (
              <PresetOrCustomRows
                label={t('glideSpeed')}
                customLabel={t('customGlideSpeed')}
                value={speedRampSemitonesPerSec}
                presets={SPEED_RAMP_RATE_PRESETS}
                formatValue={formatRate}
                min={MIN_SPEED_RAMP_RATE}
                max={MAX_SPEED_RAMP_RATE}
                step={SPEED_RAMP_RATE_STEP}
                onChange={setSpeedRampSemitonesPerSec}
                isLast
              />
            )}
          </>
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
