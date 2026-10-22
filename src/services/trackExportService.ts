import { Directory, File, Paths } from 'expo-file-system';

import { getLocalTrackUri } from './musicCacheService';
import { ensureCoverArtAuth, getOriginalFileUrl, type Child } from './subsonicService';

/**
 * Ask the user for a folder to save into. Resolves null when they dismiss the
 * picker.
 */
export async function pickExportDirectory(): Promise<Directory | null> {
  try {
    return await Directory.pickDirectoryAsync();
  } catch {
    // The picker rejects when dismissed; nothing to save in that case.
    return null;
  }
}

/** "Artist - Title.ext" with characters that file systems reject replaced. */
export function exportFileName(track: Child, extension: string): string {
  const base = `${track.artist ?? ''} - ${track.title}`
    .replace(/^ - /, '')
    // eslint-disable-next-line no-control-regex
    .replace(/[\\/:*?"<>|\u0000-\u001f]/g, '_')
    .trim()
    .slice(0, 120);
  return `${base || track.id}.${extension}`;
}

/**
 * Save the track's file into `directory`. Uses the downloaded copy when there
 * is one, otherwise fetches the original file from the server. Throws on failure.
 */
export async function saveTrackToDirectory(track: Child, directory: Directory): Promise<void> {
  const localUri = getLocalTrackUri(track.id);
  const extension = localUri ? (localUri.split('.').pop() ?? 'dat') : (track.suffix ?? 'dat');
  const staging = new Directory(Paths.cache, 'exports');
  staging.create({ idempotent: true, intermediates: true });
  const staged = new File(staging, exportFileName(track, extension));
  if (staged.exists) staged.delete();

  try {
    if (localUri) {
      new File(localUri).copy(staged);
    } else {
      await ensureCoverArtAuth();
      const url = getOriginalFileUrl(track.id);
      if (!url) throw new Error('No server URL for the track');
      await File.downloadFileAsync(url, staged, { idempotent: true });
    }
    if (!staged.exists || !staged.size) throw new Error('Empty file');
    staged.copy(directory);
  } finally {
    if (staged.exists) staged.delete();
  }
}
