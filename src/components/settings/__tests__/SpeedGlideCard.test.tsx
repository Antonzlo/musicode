jest.mock('../../../store/persistence/kvStorage', () =>
  require('../../../store/persistence/__mocks__/kvStorage'),
);

jest.mock('../../../hooks/useTheme', () => ({
  useTheme: () => ({
    colors: {
      primary: '#ff6600',
      textPrimary: '#ffffff',
      textSecondary: '#888888',
      border: '#333333',
      card: '#1e1e1e',
      inputBg: '#2a2a2a',
    },
  }),
}));

import { Switch } from 'react-native';
import { fireEvent, render, screen } from '@testing-library/react-native';

import { SpeedGlideCard } from '../SpeedGlideCard';
import { playbackSettingsStore } from '../../../store/playbackSettingsStore';

beforeEach(() => {
  playbackSettingsStore.setState({
    gradualSpeedChange: false,
    speedRampMode: 'duration',
    speedRampMs: 500,
    speedRampSemitonesPerSec: 8,
  });
});

describe('SpeedGlideCard', () => {
  it('hides the style and duration rows while the toggle is off', () => {
    render(<SpeedGlideCard />);
    expect(screen.getByText('Gradual speed changes')).toBeTruthy();
    expect(screen.queryByText('Glide style')).toBeNull();
    expect(screen.queryByText('Glide duration')).toBeNull();
  });

  it('turning it on stores it and shows the style and current preset duration', () => {
    render(<SpeedGlideCard />);
    fireEvent(screen.UNSAFE_getByType(Switch), 'valueChange', true);
    expect(playbackSettingsStore.getState().gradualSpeedChange).toBe(true);
    expect(screen.getByText('Glide style')).toBeTruthy();
    expect(screen.getByText('Fixed duration')).toBeTruthy();
    expect(screen.getByText('Glide duration')).toBeTruthy();
    expect(screen.getByText('0.5 s')).toBeTruthy();
  });

  describe('fixed duration style', () => {
    beforeEach(() => playbackSettingsStore.setState({ gradualSpeedChange: true }));

    it('picking a preset stores its duration and keeps the slider hidden', () => {
      render(<SpeedGlideCard />);
      fireEvent.press(screen.getByText('Glide duration'));
      fireEvent.press(screen.getByText('2 s'));
      expect(playbackSettingsStore.getState().speedRampMs).toBe(2000);
      expect(screen.queryByText('Custom duration')).toBeNull();
    });

    it('Custom reveals a slider that sets any duration', () => {
      render(<SpeedGlideCard />);
      fireEvent.press(screen.getByText('Glide duration'));
      fireEvent.press(screen.getByText('Custom'));
      expect(screen.getByText('Custom duration')).toBeTruthy();
      fireEvent(screen.getByLabelText('Custom duration'), 'valueChange', 1350);
      expect(playbackSettingsStore.getState().speedRampMs).toBe(1350);
      expect(screen.getByText('1.35 s')).toBeTruthy();
    });

    it('starts in custom mode when the stored duration is not a preset', () => {
      playbackSettingsStore.setState({ speedRampMs: 1350 });
      render(<SpeedGlideCard />);
      expect(screen.getByText('Custom duration')).toBeTruthy();
    });
  });

  describe('constant speed style', () => {
    beforeEach(() =>
      playbackSettingsStore.setState({ gradualSpeedChange: true, speedRampMode: 'rate' }),
    );

    it('shows glide speed presets instead of the duration', () => {
      render(<SpeedGlideCard />);
      expect(screen.getByText('Constant speed')).toBeTruthy();
      expect(screen.getByText('Glide speed')).toBeTruthy();
      expect(screen.getByText('8 st/s')).toBeTruthy();
      expect(screen.queryByText('Glide duration')).toBeNull();
    });

    it('switching the style stores it', () => {
      playbackSettingsStore.setState({ speedRampMode: 'duration' });
      render(<SpeedGlideCard />);
      fireEvent.press(screen.getByText('Glide style'));
      fireEvent.press(screen.getByText('Constant speed'));
      expect(playbackSettingsStore.getState().speedRampMode).toBe('rate');
    });

    it('picking a preset stores its speed', () => {
      render(<SpeedGlideCard />);
      fireEvent.press(screen.getByText('Glide speed'));
      fireEvent.press(screen.getByText('16 st/s'));
      expect(playbackSettingsStore.getState().speedRampSemitonesPerSec).toBe(16);
    });

    it('Custom reveals a slider that sets any speed', () => {
      render(<SpeedGlideCard />);
      fireEvent.press(screen.getByText('Glide speed'));
      fireEvent.press(screen.getByText('Custom'));
      fireEvent(screen.getByLabelText('Custom glide speed'), 'valueChange', 11);
      expect(playbackSettingsStore.getState().speedRampSemitonesPerSec).toBe(11);
      expect(screen.getByText('11 st/s')).toBeTruthy();
    });
  });
});
