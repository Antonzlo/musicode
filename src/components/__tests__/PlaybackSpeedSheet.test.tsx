jest.mock('../../store/persistence/kvStorage', () => require('../../store/persistence/__mocks__/kvStorage'));

jest.mock('../../hooks/useTheme', () => ({
  useTheme: () => ({
    colors: {
      primary: '#ff6600',
      textPrimary: '#ffffff',
      textSecondary: '#888888',
      label: '#aaaaaa',
      border: '#333333',
      background: '#000000',
      card: '#1e1e1e',
      inputBg: '#2a2a2a',
    },
  }),
}));

jest.mock('../BottomSheet', () => ({
  BottomSheet: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock('@react-native-community/slider', () => {
  const { View } = require('react-native');
  return { __esModule: true, default: (props: object) => <View testID="rate-slider" {...props} /> };
});

jest.mock('../../services/playerService', () => ({
  applyPlaybackRate: jest.fn(async (rate: number) => {
    require('../../store/playbackSettingsStore').playbackSettingsStore.getState().setPlaybackRate(rate);
  }),
  applyPitchCorrection: jest.fn(),
}));

jest.mock('../../utils/haptics', () => ({ selectionAsync: jest.fn() }));

import React from 'react';
import { act, fireEvent, render } from '@testing-library/react-native';

import { applyPlaybackRate } from '../../services/playerService';
import {
  DEFAULT_PLAYBACK_RATE_PRESETS,
  playbackSettingsStore,
} from '../../store/playbackSettingsStore';
import { PlaybackSpeedSheet } from '../PlaybackSpeedSheet';

beforeEach(() => {
  jest.clearAllMocks();
  playbackSettingsStore.setState({
    playbackRate: 1,
    playbackRatePresets: [...DEFAULT_PLAYBACK_RATE_PRESETS],
  });
});

function renderSheet() {
  return render(<PlaybackSpeedSheet visible onClose={() => {}} />);
}

describe('PlaybackSpeedSheet', () => {
  it('shows the current rate and the preset pills', () => {
    playbackSettingsStore.setState({ playbackRate: 1.25 });
    const { getAllByText, getByText } = renderSheet();
    expect(getAllByText('1.25x')).toHaveLength(2);
    expect(getByText('.5x')).toBeTruthy();
    expect(getByText('2x')).toBeTruthy();
  });

  it('applies a preset on tap', () => {
    const { getByText } = renderSheet();
    fireEvent.press(getByText('1.5x'));
    expect(applyPlaybackRate).toHaveBeenCalledWith(1.5);
  });

  it('steps up and down by 0.05', () => {
    const { getByLabelText } = renderSheet();
    fireEvent.press(getByLabelText('Increase speed'));
    expect(applyPlaybackRate).toHaveBeenLastCalledWith(1.05);
    fireEvent.press(getByLabelText('Decrease speed'));
    fireEvent.press(getByLabelText('Decrease speed'));
    expect(applyPlaybackRate).toHaveBeenLastCalledWith(0.95);
  });

  it('does not step past the bounds', () => {
    playbackSettingsStore.setState({ playbackRate: 0.25 });
    const { getByLabelText } = renderSheet();
    fireEvent.press(getByLabelText('Decrease speed'));
    expect(applyPlaybackRate).toHaveBeenLastCalledWith(0.25);
  });

  it('applies slider values in real time and skips unchanged ones', () => {
    const { getByTestId } = renderSheet();
    const slider = getByTestId('rate-slider');
    act(() => slider.props.onValueChange(1.3000000000000003));
    expect(applyPlaybackRate).toHaveBeenCalledWith(1.3);
    (applyPlaybackRate as jest.Mock).mockClear();
    act(() => slider.props.onValueChange(1.3));
    expect(applyPlaybackRate).not.toHaveBeenCalled();
  });

  it('replaces a preset with the current rate on long-press', () => {
    playbackSettingsStore.setState({ playbackRate: 1.8 });
    const { getByText } = renderSheet();
    fireEvent(getByText('1.5x'), 'longPress');
    expect(playbackSettingsStore.getState().playbackRatePresets).toEqual([0.5, 0.75, 1, 1.25, 1.8, 2]);
  });
});
