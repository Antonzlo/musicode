import { useMemo } from 'react';
import { StyleSheet, Switch, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { useTheme } from '../../hooks/useTheme';
import { settingsStyles } from '../../styles/settingsStyles';
import { playbackSettingsStore, SEMITONE_STEPS, type SemitoneStep } from '../../store/playbackSettingsStore';
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
        <View
          style={[
            styles.toggleRow,
            showSemitoneControls && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
          ]}
        >
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
            isLast
          />
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
