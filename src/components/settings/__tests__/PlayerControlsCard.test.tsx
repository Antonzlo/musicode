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
  playbackSettingsStore.setState({ showSemitoneControls: false, semitoneStep: 1 });
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
