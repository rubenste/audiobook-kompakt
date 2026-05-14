import AsyncStorage from '@react-native-async-storage/async-storage';
import { Audiobook } from '../types';

const POS_PREFIX  = 'pos:';
const CH_PREFIX   = 'ch:';
const DONE_PREFIX = 'done:';
const DUR_PREFIX  = 'dur:';

export async function savePosition(uri: string, positionMs: number): Promise<void> {
  try { await AsyncStorage.setItem(POS_PREFIX + uri, String(Math.floor(positionMs))); } catch {}
}

export async function loadPosition(uri: string): Promise<number> {
  try {
    const val = await AsyncStorage.getItem(POS_PREFIX + uri);
    return val ? parseInt(val, 10) : 0;
  } catch { return 0; }
}

export async function saveChapterIndex(folderUri: string, index: number): Promise<void> {
  try { await AsyncStorage.setItem(CH_PREFIX + folderUri, String(index)); } catch {}
}

export async function loadChapterIndex(folderUri: string): Promise<number> {
  try {
    const val = await AsyncStorage.getItem(CH_PREFIX + folderUri);
    return val ? parseInt(val, 10) : 0;
  } catch { return 0; }
}

export async function markChapterDone(uri: string): Promise<void> {
  try { await AsyncStorage.setItem(DONE_PREFIX + uri, '1'); } catch {}
}

export async function saveDuration(uri: string, ms: number): Promise<void> {
  try { await AsyncStorage.setItem(DUR_PREFIX + uri, String(Math.floor(ms))); } catch {}
}

export async function loadDuration(uri: string): Promise<number | null> {
  try {
    const val = await AsyncStorage.getItem(DUR_PREFIX + uri);
    return val ? parseInt(val, 10) : null;
  } catch { return null; }
}

export async function getTotalBookDuration(book: Audiobook): Promise<number | null> {
  try {
    const pairs = await AsyncStorage.multiGet(book.chapters.map(ch => DUR_PREFIX + ch.uri));
    let total = 0;
    for (const [, val] of pairs) {
      if (!val) return null;
      total += parseInt(val, 10);
    }
    return total;
  } catch { return null; }
}

export type BookStatus = 'new' | 'in-progress' | 'finished';

export interface BookInfo {
  status: BookStatus;
  /** 0–100 rounded; null when duration data is not yet cached */
  progress: number | null;
}

/** Single multiGet for status + progress — use this in list views. */
export async function getBookInfo(book: Audiobook): Promise<BookInfo> {
  try {
    const posKeys  = book.chapters.map(ch => POS_PREFIX  + ch.uri);
    const durKeys  = book.chapters.map(ch => DUR_PREFIX  + ch.uri);
    const doneKeys = book.chapters.map(ch => DONE_PREFIX + ch.uri);
    const pairs = await AsyncStorage.multiGet([...posKeys, ...durKeys, ...doneKeys]);
    const vals: Record<string, string | null> = Object.fromEntries(pairs);

    const lastCh   = book.chapters[book.chapters.length - 1];
    const lastDone = vals[DONE_PREFIX + lastCh.uri] === '1';
    const anyProgress = book.chapters.some(
      ch => parseInt(vals[POS_PREFIX + ch.uri] ?? '0', 10) > 0
         || vals[DONE_PREFIX + ch.uri] === '1'
    );
    const status: BookStatus = lastDone ? 'finished' : anyProgress ? 'in-progress' : 'new';

    let totalPos = 0, totalDur = 0, allDurKnown = true;
    for (const ch of book.chapters) {
      const dur = parseInt(vals[DUR_PREFIX + ch.uri] ?? '0', 10);
      if (!dur) { allDurKnown = false; break; }
      const done = vals[DONE_PREFIX + ch.uri] === '1';
      const pos  = done ? dur : parseInt(vals[POS_PREFIX + ch.uri] ?? '0', 10);
      totalPos += pos;
      totalDur += dur;
    }
    const progress = allDurKnown && totalDur > 0
      ? Math.round((totalPos / totalDur) * 100)
      : null;

    return { status, progress };
  } catch {
    return { status: 'new', progress: null };
  }
}

export async function getBookStatus(book: Audiobook): Promise<BookStatus> {
  return (await getBookInfo(book)).status;
}
