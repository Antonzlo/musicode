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

const mockAvailable = jest.fn(() => false);
const mockStatus = jest.fn(() => 'off');
jest.mock('expo-system-haptics', () => ({
  isSystemHapticsAvailable: () => mockAvailable(),
  getSystemHapticsStatus: () => mockStatus(),
}));

import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { Switch } from 'react-native';

import { MusicHapticsCard } from '../MusicHapticsCard';
import { playbackSettingsStore } from '../../../store/playbackSettingsStore';

beforeEach(() => {
  jest.useFakeTimers();
  mockAvailable.mockReturnValue(false);
  mockStatus.mockReturnValue('off');
  playbackSettingsStore.setState({
    musicHaptics: false,
    hapticsMode: 'beat',
    hapticsBluetoothDelayMs: 0,
  });
});

afterEach(() => {
  jest.useRealTimers();
});

describe('MusicHapticsCard', () => {
  it('shows only the toggle while off', () => {
    render(<MusicHapticsCard />);
    expect(screen.getByText('Vibrate to the beat')).toBeTruthy();
    expect(screen.queryByText('Haptics mode')).toBeNull();
    expect(screen.queryByText('Bluetooth delay')).toBeNull();
  });

  it('turning it on stores it and shows the mode and Bluetooth delay', () => {
    render(<MusicHapticsCard />);
    fireEvent(screen.UNSAFE_getByType(Switch), 'valueChange', true);
    expect(playbackSettingsStore.getState().musicHaptics).toBe(true);
    expect(screen.getByText('Haptics mode')).toBeTruthy();
    expect(screen.getByText('Beat pulses')).toBeTruthy();
    expect(screen.getByText('Bluetooth delay')).toBeTruthy();
    expect(screen.getByText('0 ms')).toBeTruthy();
  });

  it('sets the Bluetooth delay with the slider', () => {
    playbackSettingsStore.setState({ musicHaptics: true });
    render(<MusicHapticsCard />);
    fireEvent(screen.getByLabelText('Bluetooth delay'), 'valueChange', 250);
    expect(playbackSettingsStore.getState().hapticsBluetoothDelayMs).toBe(250);
    expect(screen.getByText('250 ms')).toBeTruthy();
  });

  it('offers only beat pulses where the system generator is missing', () => {
    playbackSettingsStore.setState({ musicHaptics: true });
    render(<MusicHapticsCard />);
    fireEvent.press(screen.getByText('Haptics mode'));
    expect(screen.queryByText('System haptics')).toBeNull();
  });

  describe('where the system generator exists', () => {
    beforeEach(() => {
      mockAvailable.mockReturnValue(true);
      playbackSettingsStore.setState({ musicHaptics: true });
    });

    it('lets the user pick it, which hides the Bluetooth delay', () => {
      render(<MusicHapticsCard />);
      fireEvent.press(screen.getByText('Haptics mode'));
      fireEvent.press(screen.getByText('System haptics'));
      expect(playbackSettingsStore.getState().hapticsMode).toBe('system');
      expect(screen.queryByText('Bluetooth delay')).toBeNull();
      expect(screen.getByText('Status')).toBeTruthy();
    });

    it.each([
      ['attached:1', 'Active'],
      ['off', 'Off'],
      ['unsupported', 'Not supported on this device'],
      ['waiting', 'Waiting for playback'],
      ['enable-failed:-22', 'Could not start'],
    ])('shows the %s status as "%s"', (status, label) => {
      playbackSettingsStore.setState({ hapticsMode: 'system' });
      mockStatus.mockReturnValue(status);
      render(<MusicHapticsCard />);
      expect(screen.getByText(label)).toBeTruthy();
    });

    it('follows the status while it is open', () => {
      playbackSettingsStore.setState({ hapticsMode: 'system' });
      mockStatus.mockReturnValue('waiting');
      render(<MusicHapticsCard />);
      expect(screen.getByText('Waiting for playback')).toBeTruthy();
      mockStatus.mockReturnValue('attached:1');
      act(() => {
        jest.advanceTimersByTime(1000);
      });
      expect(screen.getByText('Active')).toBeTruthy();
    });

    it('stops polling when the card closes', () => {
      playbackSettingsStore.setState({ hapticsMode: 'system' });
      const { unmount } = render(<MusicHapticsCard />);
      unmount();
      mockStatus.mockClear();
      jest.advanceTimersByTime(5000);
      expect(mockStatus).not.toHaveBeenCalled();
    });
  });
});
