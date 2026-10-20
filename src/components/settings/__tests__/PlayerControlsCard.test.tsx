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

import { PlayerControlsCard } from '../PlayerControlsCard';
import { playbackSettingsStore } from '../../../store/playbackSettingsStore';

beforeEach(() => {
  playbackSettingsStore.setState({
    showSemitoneControls: false,
    semitoneStep: 1,
    gradualSpeedChange: false,
    speedRampMs: 500,
  });
});

describe('PlayerControlsCard semitone settings', () => {
  it('hides the step picker while the toggle is off', () => {
    render(<PlayerControlsCard />);
    expect(screen.getByText('Show semitone controls')).toBeTruthy();
    expect(screen.queryByText('Semitone step')).toBeNull();
  });

  it('turning the toggle on stores it and reveals the step picker', () => {
    render(<PlayerControlsCard />);
    const [, , semitoneToggle] = screen.UNSAFE_getAllByType(Switch);
    fireEvent(semitoneToggle, 'valueChange', true);
    expect(playbackSettingsStore.getState().showSemitoneControls).toBe(true);
    expect(screen.getByText('Semitone step')).toBeTruthy();
    expect(screen.getByText('1 st')).toBeTruthy();
  });

  it('picking a step stores it', () => {
    playbackSettingsStore.setState({ showSemitoneControls: true });
    render(<PlayerControlsCard />);
    fireEvent.press(screen.getByText('Semitone step'));
    fireEvent.press(screen.getByText('0.25 st'));
    expect(playbackSettingsStore.getState().semitoneStep).toBe(0.25);
  });
});

describe('PlayerControlsCard gradual speed settings', () => {
  it('hides the duration picker while the toggle is off', () => {
    render(<PlayerControlsCard />);
    expect(screen.getByText('Gradual speed changes')).toBeTruthy();
    expect(screen.queryByText('Glide duration')).toBeNull();
  });

  it('turning it on stores it and shows the current preset duration', () => {
    render(<PlayerControlsCard />);
    const switches = screen.UNSAFE_getAllByType(Switch);
    fireEvent(switches[switches.length - 1], 'valueChange', true);
    expect(playbackSettingsStore.getState().gradualSpeedChange).toBe(true);
    expect(screen.getByText('Glide duration')).toBeTruthy();
    expect(screen.getByText('0.5 s')).toBeTruthy();
  });

  it('picking a preset stores its duration and keeps the slider hidden', () => {
    playbackSettingsStore.setState({ gradualSpeedChange: true });
    render(<PlayerControlsCard />);
    fireEvent.press(screen.getByText('Glide duration'));
    fireEvent.press(screen.getByText('2 s'));
    expect(playbackSettingsStore.getState().speedRampMs).toBe(2000);
    expect(screen.queryByText('Custom duration')).toBeNull();
  });

  it('Custom reveals a slider that sets any duration', () => {
    playbackSettingsStore.setState({ gradualSpeedChange: true });
    render(<PlayerControlsCard />);
    fireEvent.press(screen.getByText('Glide duration'));
    fireEvent.press(screen.getByText('Custom'));
    expect(screen.getByText('Custom duration')).toBeTruthy();
    fireEvent(screen.getByLabelText('Custom duration'), 'valueChange', 1350);
    expect(playbackSettingsStore.getState().speedRampMs).toBe(1350);
    expect(screen.getByText('1.35 s')).toBeTruthy();
  });

  it('starts in custom mode when the stored duration is not a preset', () => {
    playbackSettingsStore.setState({ gradualSpeedChange: true, speedRampMs: 1350 });
    render(<PlayerControlsCard />);
    expect(screen.getByText('Custom duration')).toBeTruthy();
  });
});
