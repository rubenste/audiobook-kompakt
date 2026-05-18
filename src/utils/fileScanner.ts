import * as FileSystem from 'expo-file-system';
import { PermissionsAndroid, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Audiobook, Chapter } from '../types';

const DEFAULT_ROOT = '/sdcard/Audiobooks';
const AUDIO_EXTENSIONS = ['.mp3', '.m4b', '.m4a', '.mp4'];

async function requestStoragePermission(): Promise<boolean> {
  if (Platform.OS !== 'android') return true;
  const apiLevel = typeof Platform.Version === 'number' ? Platform.Version : parseInt(Platform.Version, 10);

  if (apiLevel >= 33) {
    // API 33+: request audio AND video separately — .mp4 is a video container
    // and READ_MEDIA_AUDIO alone does not cover it.
    const results = await PermissionsAndroid.requestMultiple([
      PermissionsAndroid.PERMISSIONS.READ_MEDIA_AUDIO,
      PermissionsAndroid.PERMISSIONS.READ_MEDIA_VIDEO,
    ]);
    const audioOk = results[PermissionsAndroid.PERMISSIONS.READ_MEDIA_AUDIO] === PermissionsAndroid.RESULTS.GRANTED;
    const videoOk = results[PermissionsAndroid.PERMISSIONS.READ_MEDIA_VIDEO] === PermissionsAndroid.RESULTS.GRANTED;
    console.log('[requestStoragePermission] audio:', audioOk, '| video:', videoOk);
    return audioOk; // audio is mandatory; video is best-effort for .mp4 files
  }

  const result = await PermissionsAndroid.request(
    PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE
  );
  return result === PermissionsAndroid.RESULTS.GRANTED;
}

async function getRootUri(): Promise<string> {
  const path = (await AsyncStorage.getItem('rootFolder')) ?? DEFAULT_ROOT;
  return `file://${path}`;
}

async function scanChapters(folderUri: string): Promise<Chapter[]> {
  try {
    const entries = await FileSystem.readDirectoryAsync(folderUri);
    const matched = entries.filter(name =>
      AUDIO_EXTENSIONS.some(ext => name.toLowerCase().endsWith(ext))
    );
    console.log(
      '[scanChapters]', folderUri,
      '| all files:', entries.join(', ') || '(empty)',
      '| matched:', matched.join(', ') || '(none)',
    );
    return matched
      .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }))
      .map(filename => ({
        filename,
        uri: `${folderUri}/${encodeURIComponent(filename)}`,
      }));
  } catch (e) {
    console.log('[scanChapters] ERROR reading', folderUri, ':', String(e));
    return [];
  }
}

/** Parse "Author - Title" folder names. Returns both parts if separator is found. */
function parseFolderName(name: string): { title: string; author?: string } {
  const sep = ' - ';
  const idx = name.indexOf(sep);
  if (idx > 0) {
    return {
      author: name.slice(0, idx).trim(),
      title:  name.slice(idx + sep.length).trim(),
    };
  }
  return { title: name };
}

/**
 * Scan one entry inside rootUri.
 * - If the folder contains audio files directly → one Audiobook (old behaviour).
 * - If the folder contains only sub-directories → each sub-directory is a book
 *   whose author is the parent folder name and whose title is the sub-folder name.
 * Returns zero or more Audiobook objects.
 */
async function scanEntry(rootUri: string, name: string): Promise<Audiobook[]> {
  const uri = `${rootUri}/${encodeURIComponent(name)}`;
  console.log('[scanEntry] checking:', name, '| uri:', uri);

  const info = await FileSystem.getInfoAsync(uri);
  if (!info.exists || !info.isDirectory) {
    console.log('[scanEntry] skip (not a directory or missing):', name);
    return [];
  }

  // Priority 1: folder contains audio files directly → treat as a book.
  const chapters = await scanChapters(uri);
  if (chapters.length > 0) {
    const { title, author } = parseFolderName(name);
    console.log('[scanEntry] flat book found:', name, `(${chapters.length} chapter(s))`);
    return [{ title, author, folderUri: uri, chapters }];
  }

  // Priority 2: no audio files here — look one level deeper.
  // Each sub-directory becomes a book; this folder's name is the author.
  console.log('[scanEntry] no direct audio in', name, '— scanning subdirectories');
  try {
    const subEntries = await FileSystem.readDirectoryAsync(uri);
    console.log('[scanEntry] sub-entries of', name, ':', subEntries.join(', ') || '(empty)');

    const books = await Promise.all(
      subEntries.map(async subName => {
        const subUri = `${uri}/${encodeURIComponent(subName)}`;
        const subInfo = await FileSystem.getInfoAsync(subUri);
        console.log('[scanEntry]  subentry:', subName, '| isDirectory:', subInfo.isDirectory ?? '(undefined)');
        if (!subInfo.exists || !subInfo.isDirectory) return null;
        const subChapters = await scanChapters(subUri);
        if (subChapters.length === 0) {
          console.log('[scanEntry]  subdir has no audio:', subName);
          return null;
        }
        console.log('[scanEntry]  book found:', subName, `by "${name}" (${subChapters.length} chapter(s))`);
        return {
          title:     subName,
          author:    name,
          folderUri: subUri,
          chapters:  subChapters,
        } as Audiobook;
      })
    );
    return books.filter((b): b is Audiobook => b !== null);
  } catch (e) {
    console.log('[scanEntry] ERROR scanning subdirs of', name, ':', String(e));
    return [];
  }
}

export async function scanAudiobooks(): Promise<Audiobook[]> {
  const granted = await requestStoragePermission();
  console.log('[scanAudiobooks] permission granted:', granted);
  if (!granted) return [];

  const rootUri = await getRootUri();
  console.log('[scanAudiobooks] rootUri:', rootUri);

  try {
    const entries = await FileSystem.readDirectoryAsync(rootUri);
    console.log('[scanAudiobooks] top-level entries:', entries.join(', ') || '(empty)');

    const nested = await Promise.all(entries.map(name => scanEntry(rootUri, name)));
    const results = nested.flat();

    console.log('[scanAudiobooks] total books found:', results.length,
      results.map(b => `"${b.title}" by ${b.author ?? '?'}`).join(', '));
    return results.sort((a, b) =>
      a.title.localeCompare(b.title, undefined, { sensitivity: 'base' })
    );
  } catch (e) {
    console.log('[scanAudiobooks] ERROR reading rootUri:', String(e));
    return [];
  }
}
