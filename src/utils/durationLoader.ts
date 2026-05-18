/**
 * Eagerly loads and caches chapter durations in the background.
 * Only fetches chapters whose duration is not yet stored.
 * Called fire-and-forget from PlayerScreen on mount.
 */
import { Audio } from 'expo-av';
import { Audiobook } from '../types';
import { loadDuration, saveDuration } from './positionStorage';

export async function preloadBookDurations(book: Audiobook): Promise<void> {
  for (const chapter of book.chapters) {
    // Skip if already cached
    const existing = await loadDuration(chapter.uri);
    if (existing != null) {
      console.log('[durationLoader] cached:', chapter.filename, existing, 'ms');
      continue;
    }

    try {
      const { sound, status } = await Audio.Sound.createAsync(
        { uri: chapter.uri },
        { shouldPlay: false },
      );
      // createAsync may return duration directly in status
      let durationMs: number | undefined =
        status.isLoaded ? status.durationMillis ?? undefined : undefined;

      // Fall back to a separate getStatusAsync if not yet available
      if (!durationMs) {
        const s = await sound.getStatusAsync();
        if (s.isLoaded && s.durationMillis) durationMs = s.durationMillis;
      }

      if (durationMs) {
        await saveDuration(chapter.uri, durationMs);
        console.log('[durationLoader] preloaded:', chapter.filename, durationMs, 'ms');
      } else {
        console.log('[durationLoader] no duration:', chapter.filename);
      }

      await sound.unloadAsync();
    } catch (e) {
      console.log('[durationLoader] error:', chapter.filename, String(e));
    }
  }
  console.log('[durationLoader] done for:', book.title);
}
