import ExpoSystemHapticsModule from '../ExpoSystemHapticsModule';
import { getSystemHapticsStatus, isSystemHapticsAvailable, setSystemHapticsEnabled } from '../index';

const mockModule = jest.mocked(ExpoSystemHapticsModule);

beforeEach(() => {
  jest.clearAllMocks();
});

describe('isSystemHapticsAvailable', () => {
  it('reports what the native side says', () => {
    mockModule.isAvailable.mockReturnValueOnce(true);
    expect(isSystemHapticsAvailable()).toBe(true);
    expect(isSystemHapticsAvailable()).toBe(false);
  });
});

describe('setSystemHapticsEnabled', () => {
  it('passes the flag to the native module', () => {
    setSystemHapticsEnabled(true);
    setSystemHapticsEnabled(false);
    expect(mockModule.setEnabled).toHaveBeenNthCalledWith(1, true);
    expect(mockModule.setEnabled).toHaveBeenNthCalledWith(2, false);
  });
});

describe('getSystemHapticsStatus', () => {
  it('returns the native status', () => {
    mockModule.getStatus.mockReturnValueOnce('attached:1');
    expect(getSystemHapticsStatus()).toBe('attached:1');
  });

  it('is off by default', () => {
    expect(getSystemHapticsStatus()).toBe('off');
  });
});
