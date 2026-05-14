import * as FileSystem from 'expo-file-system';
import { PermissionsAndroid, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Audiobook, Chapter } from '../types';

const DEFAULT_ROOT = '/sdcard/Audiobooks';
const AUDIO_EXTENSIONS = ['.mp3', '.m4b', '.m4a'];

async function requestStoragePermission(): Promise<boolean> {
  if (Platform.OS !== 'android') return true;
  const apiLevel = typeof Platform.Version === 'number' ? Platform.Version : parseInt(Platform.Version, 10);
  const permission =
    apiLevel >= 33
      ? PermissionsAndroid.PERMISSIONS.READ_MEDIA_AUDIO
      : PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE;
  const result = await PermissionsAndroid.request(permission);
  return result === PermissionsAndroid.RESULTS.GRANTED;
}

async function getRootUri(): Promise<string> {
  const path = (await AsyncStorage.getItem('rootFolder')) ?? DEFAULT_ROOT;
  return `file://${path}`;
}

async function scanChapters(folderUri: string): Promise<Chapter[]> {
  try {
    const entries = await FileSystem.readDirectoryAsync(folderUri);
    return entries
      .filter(name => AUDIO_EXTENSIONS.some(ext => name.toLowerCase().endsWith(ext)))
      .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }))
      .map(filename => ({
        filename,
        uri: `${folderUri}/${encodeURIComponent(filename)}`,
      }));
  } catch {
    return [];
  }
}

export async function scanAudiobooks(): Promise<Audiobook[]> {
  const granted = await requestStoragePermission();
  if (!granted) return [];

  const rootUri = await getRootUri();

  try {
    const entries = await FileSystem.readDirectoryAsync(rootUri);

    const results = await Promise.all(
      entries.map(async name => {
        const uri = `${rootUri}/${encodeURIComponent(name)}`;
        const info = await FileSystem.getInfoAsync(uri);
        if (!info.exists || !info.isDirectory) return null;
        const chapters = await scanChapters(uri);
        if (chapters.length === 0) return null;
        return { title: name, folderUri: uri, chapters } as Audiobook;
      })
    );

    return results
      .filter((b): b is Audiobook => b !== null)
      .sort((a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: 'base' }));
  } catch {
    return [];
  }
}
