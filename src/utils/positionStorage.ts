import AsyncStorage from '@react-native-async-storage/async-storage';
import { Audiobook } from '../types';

const POS_PREFIX  = 'pos:';
const CH_PREFIX   = 'ch:';
const DONE_PREFIX = 'done:';
const DUR_PREFIX  = 'dur:';
const LAST_BOOK   = 'lastBook';

/** Decode percent-encoding so keys are stable regardless of how the URI was constructed. */
export function normalizeUri(uri: string): string {
  return decodeURIComponent(uri);
}

export async function savePosition(uri: string, positionMs: number): Promise<void> {
  try { await AsyncStorage.setItem(POS_PREFIX + normalizeUri(uri), String(Math.floor(positionMs))); } catch {}
}

export async function loadPosition(uri: string): Promise<number> {
  try {
    const val = await AsyncStorage.getItem(POS_PREFIX + normalizeUri(uri));
    return val ? parseInt(val, 10) : 0;
  } catch { return 0; }
}

export async function saveChapterIndex(folderUri: string, index: number): Promise<void> {
  try { await AsyncStorage.setItem(CH_PREFIX + normalizeUri(folderUri), String(index)); } catch {}
}

export async function loadChapterIndex(folderUri: string): Promise<number> {
  try {
    const val = await AsyncStorage.getItem(CH_PREFIX + normalizeUri(folderUri));
    return val ? parseInt(val, 10) : 0;
  } catch { return 0; }
}

/** Mark chapter done. Also saves duration so getBookInfo can include it in progress even
 *  if the status callback's durationMillis was unavailable at finish time. */
export async function markChapterDone(uri: string, durationMs?: number): Promise<void> {
  try {
    const key = normalizeUri(uri);
    const writes: [string, string][] = [[DONE_PREFIX + key, '1']];
    if (durationMs && durationMs > 0) {
      writes.push([DUR_PREFIX + key, String(Math.floor(durationMs))]);
    }
    await AsyncStorage.multiSet(writes);
  } catch {}
}

export async function saveDuration(uri: string, ms: number): Promise<void> {
  try { await AsyncStorage.setItem(DUR_PREFIX + normalizeUri(uri), String(Math.floor(ms))); } catch {}
}

export async function loadDuration(uri: string): Promise<number | null> {
  try {
    const val = await AsyncStorage.getItem(DUR_PREFIX + normalizeUri(uri));
    return val ? parseInt(val, 10) : null;
  } catch { return null; }
}

export async function getTotalBookDuration(book: Audiobook): Promise<number | null> {
  try {
    const pairs = await AsyncStorage.multiGet(
      book.chapters.map(ch => DUR_PREFIX + normalizeUri(ch.uri))
    );
    let total = 0;
    for (const [, val] of pairs) {
      if (!val) return null;
      total += parseInt(val, 10);
    }
    return total;
  } catch { return null; }
}

export async function saveLastBook(folderUri: string): Promise<void> {
  try { await AsyncStorage.setItem(LAST_BOOK, normalizeUri(folderUri)); } catch {}
}

export async function loadLastBook(): Promise<string | null> {
  try {
    const val = await AsyncStorage.getItem(LAST_BOOK);
    return val ? normalizeUri(val) : null;
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
    const posKeys  = book.chapters.map(ch => POS_PREFIX  + normalizeUri(ch.uri));
    const durKeys  = book.chapters.map(ch => DUR_PREFIX  + normalizeUri(ch.uri));
    const doneKeys = book.chapters.map(ch => DONE_PREFIX + normalizeUri(ch.uri));
    const pairs = await AsyncStorage.multiGet([...posKeys, ...durKeys, ...doneKeys]);
    const vals: Record<string, string | null> = Object.fromEntries(pairs);

    const lastCh   = book.chapters[book.chapters.length - 1];
    const lastDone = vals[DONE_PREFIX + normalizeUri(lastCh.uri)] === '1';
    const anyProgress = book.chapters.some(
      ch => parseInt(vals[POS_PREFIX + normalizeUri(ch.uri)] ?? '0', 10) > 0
         || vals[DONE_PREFIX + normalizeUri(ch.uri)] === '1'
    );
    const status: BookStatus = lastDone ? 'finished' : anyProgress ? 'in-progress' : 'new';

    let totalPos = 0, totalDur = 0;
    for (const ch of book.chapters) {
      const key  = normalizeUri(ch.uri);
      const dur  = parseInt(vals[DUR_PREFIX  + key] ?? '0', 10);
      const done = vals[DONE_PREFIX + key] === '1';
      const pos  = done ? dur : parseInt(vals[POS_PREFIX + key] ?? '0', 10);
      console.log('[getBookInfo ch]', ch.filename, '| dur:', dur, '| done:', done, '| pos:', pos);
      if (!dur) continue; // skip chapters whose duration isn't cached yet
      totalPos += pos;
      totalDur += dur;
    }
    // Partial percentage: uses only chapters with known duration
    const progress = totalDur > 0 ? Math.round((totalPos / totalDur) * 100) : null;
    console.log('[getBookInfo total]', book.title,
      '| totalPos:', totalPos, 'totalDur:', totalDur, '| progress:', progress);

    return { status, progress };
  } catch {
    return { status: 'new', progress: null };
  }
}

export async function getBookStatus(book: Audiobook): Promise<BookStatus> {
  return (await getBookInfo(book)).status;
}
