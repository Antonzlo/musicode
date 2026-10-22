const mockCreate = jest.fn();
const mockDownload = jest.fn();
const mockPick = jest.fn();
const mockCopy = jest.fn();
const mockDelete = jest.fn();
let mockStagedExists = false;
let mockStagedSize = 1000;

jest.mock('expo-file-system', () => {
  class File {
    uri: string;
    constructor(...parts: Array<string | { uri: string }>) {
      this.uri = parts.map((p) => (typeof p === 'string' ? p : p.uri)).join('/');
    }
    get exists() {
      return mockStagedExists;
    }
    get size() {
      return mockStagedSize;
    }
    copy = (dest: unknown) => {
      mockStagedExists = true;
      mockCopy(this.uri, dest);
    };
    delete = () => {
      mockStagedExists = false;
      mockDelete(this.uri);
    };
    static downloadFileAsync = (...args: unknown[]) => {
      mockStagedExists = true;
      return mockDownload(...args);
    };
  }
  class Directory {
    uri: string;
    constructor(...parts: Array<string | { uri: string }>) {
      this.uri = parts.map((p) => (typeof p === 'string' ? p : p.uri)).join('/');
    }
    create = mockCreate;
    static pickDirectoryAsync = (...args: unknown[]) => mockPick(...args);
  }
  return { File, Directory, Paths: { cache: { uri: 'file:///cache' } } };
});

const mockGetLocalTrackUri = jest.fn();
jest.mock('../musicCacheService', () => ({
  getLocalTrackUri: (id: string) => mockGetLocalTrackUri(id),
}));

const mockGetOriginalFileUrl = jest.fn();
jest.mock('../subsonicService', () => ({
  ensureCoverArtAuth: jest.fn(async () => {}),
  getOriginalFileUrl: (id: string) => mockGetOriginalFileUrl(id),
}));

import {
  exportFileName,
  pickExportDirectory,
  saveTrackToDirectory,
} from '../trackExportService';

const song = { id: 's1', title: 'Song', artist: 'Band', suffix: 'flac' } as any;
const target = { uri: 'content://tree/music' } as any;

beforeEach(() => {
  jest.clearAllMocks();
  mockStagedExists = false;
  mockStagedSize = 1000;
  mockGetLocalTrackUri.mockReturnValue(null);
  mockGetOriginalFileUrl.mockReturnValue('https://server/rest/download.view?id=s1');
  mockDownload.mockResolvedValue(undefined);
});

describe('exportFileName', () => {
  it('joins artist and title with the extension', () => {
    expect(exportFileName(song, 'flac')).toBe('Band - Song.flac');
  });

  it('drops a missing artist', () => {
    expect(exportFileName({ ...song, artist: undefined }, 'mp3')).toBe('Song.mp3');
  });

  it('replaces characters file systems reject', () => {
    expect(exportFileName({ ...song, title: 'AC/DC: Live? "Yes"' }, 'mp3')).toBe(
      'Band - AC_DC_ Live_ _Yes_.mp3',
    );
  });

  it('caps very long names and falls back to the id', () => {
    expect(exportFileName({ ...song, title: 'x'.repeat(300) }, 'mp3').length).toBeLessThanOrEqual(124);
    expect(exportFileName({ ...song, title: '', artist: '' }, 'mp3')).toBe('s1.mp3');
  });
});

describe('pickExportDirectory', () => {
  it('returns the picked directory', async () => {
    mockPick.mockResolvedValue(target);
    await expect(pickExportDirectory()).resolves.toBe(target);
  });

  it('returns null when the picker is dismissed', async () => {
    mockPick.mockRejectedValue(new Error('cancelled'));
    await expect(pickExportDirectory()).resolves.toBeNull();
  });
});

describe('saveTrackToDirectory', () => {
  it('downloads the original file, copies it into the folder, and cleans up', async () => {
    await saveTrackToDirectory(song, target);
    expect(mockDownload).toHaveBeenCalledWith(
      'https://server/rest/download.view?id=s1',
      expect.objectContaining({ uri: 'file:///cache/exports/Band - Song.flac' }),
      { idempotent: true },
    );
    expect(mockCopy).toHaveBeenCalledWith('file:///cache/exports/Band - Song.flac', target);
    expect(mockDelete).toHaveBeenCalled();
  });

  it('uses the downloaded copy and its extension when the song is on the device', async () => {
    mockGetLocalTrackUri.mockReturnValue('file:///music/s1.mp3');
    await saveTrackToDirectory(song, target);
    expect(mockDownload).not.toHaveBeenCalled();
    expect(mockCopy).toHaveBeenNthCalledWith(1, 'file:///music/s1.mp3', expect.objectContaining({
      uri: 'file:///cache/exports/Band - Song.mp3',
    }));
    expect(mockCopy).toHaveBeenNthCalledWith(2, 'file:///cache/exports/Band - Song.mp3', target);
  });

  it('fails without a server URL', async () => {
    mockGetOriginalFileUrl.mockReturnValue(null);
    await expect(saveTrackToDirectory(song, target)).rejects.toThrow('No server URL');
  });

  it('fails on an empty download and still cleans up', async () => {
    mockStagedSize = 0;
    await expect(saveTrackToDirectory(song, target)).rejects.toThrow('Empty file');
    expect(mockCopy).not.toHaveBeenCalled();
    expect(mockDelete).toHaveBeenCalled();
  });

  it('replaces a leftover staged file from an earlier attempt', async () => {
    mockStagedExists = true;
    await saveTrackToDirectory(song, target);
    expect(mockDelete).toHaveBeenCalledTimes(2);
  });
});
