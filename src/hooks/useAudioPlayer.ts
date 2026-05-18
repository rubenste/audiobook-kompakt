import { useCallback, useEffect, useRef, useState } from 'react';
import { Audio, AVPlaybackStatus } from 'expo-av';
import { Audiobook, Chapter } from '../types';
import {
  loadPosition, savePosition,
  loadChapterIndex, saveChapterIndex,
  markChapterDone, saveDuration, getTotalBookDuration,
} from '../utils/positionStorage';
import { getDefaultSpeed, nextSpeed } from '../utils/settings';
import { preloadBookDurations } from '../utils/durationLoader';

export interface AudioPlayerHandle {
  chapterIndex: number;
  isPlaying: boolean;
  positionMs: number;
  durationMs: number;
  audioLoaded: boolean;
  speed: number;
  showTotal: boolean;
  totalDurMs: number | null;
  currentChapter: Chapter | undefined;
  triggerAutoPlay: () => void;
  togglePlay: () => Promise<void>;
  skip: (offsetMs: number) => Promise<void>;
  goToChapter: (index: number) => Promise<void>;
  cycleSpeed: () => Promise<void>;
  toggleShowTotal: () => void;
  unload: () => Promise<void>;
  seekTo: (ms: number) => Promise<void>;
}

export function useAudioPlayer(book: Audiobook | null): AudioPlayerHandle {
  const soundRef          = useRef<Audio.Sound | null>(null);
  const chapterIndexRef   = useRef(0);
  const speedRef          = useRef(1);
  const shouldAutoPlayRef = useRef(false);
  // Tracks latest known duration so markChapterDone can save it even when
  // status.durationMillis is missing at didJustFinish.
  const durationMsRef     = useRef(0);

  const [initialized,    setInitialized]    = useState(false);
  // Incremented by unload() to force the init effect to re-run even when
  // book?.folderUri hasn't changed (e.g. process survived BackHandler.exitApp).
  const [reinitTrigger,  setReinitTrigger]  = useState(0);
  const [chapterIndex, setChapterIndex] = useState(0);
  const [isPlaying,    setIsPlaying]    = useState(false);
  const [positionMs,   setPositionMs]   = useState(0);
  const [durationMs,   setDurationMs]   = useState(0);
  const [audioLoaded,  setAudioLoaded]  = useState(false);
  const [speed,        setSpeed]        = useState(1);
  const [showTotal,    setShowTotal]    = useState(false);
  const [totalDurMs,   setTotalDurMs]   = useState<number | null>(null);

  // Mirror chapterIndex into a ref so closures (status callbacks) always
  // see the latest value without being recreated.
  useEffect(() => { chapterIndexRef.current = chapterIndex; }, [chapterIndex]);

  const currentChapter = book?.chapters[chapterIndex];

  // Mirror currentChapter into a ref so unload() can read the URI without
  // capturing currentChapter as a dependency (which would recreate the callback
  // on every chapter change).
  const currentChapterRef = useRef(currentChapter);
  useEffect(() => { currentChapterRef.current = currentChapter; }, [currentChapter]);

  const unloadCurrent = useCallback(async () => {
    const sound = soundRef.current;
    soundRef.current = null;
    if (!sound) return;
    try { await sound.stopAsync();   } catch {}
    try { await sound.unloadAsync(); } catch {}
  }, []);

  const saveCurrentPosition = useCallback(async (uri: string) => {
    const sound = soundRef.current;
    if (!sound) return;
    try {
      const status = await sound.getStatusAsync();
      if (status.isLoaded) await savePosition(uri, status.positionMillis);
    } catch {}
  }, []);

  // ── Init / reset when the selected book changes ────────────────────────────
  useEffect(() => {
    if (!book) {
      // No book selected — tear down any running audio and clear the autoplay
      // flag so it can never fire unexpectedly when a book is later restored.
      shouldAutoPlayRef.current = false;
      unloadCurrent();
      setInitialized(false);
      return;
    }

    // Reset all playback state synchronously before async init completes.
    setInitialized(false);
    setChapterIndex(0);
    chapterIndexRef.current = 0;
    setIsPlaying(false);
    setPositionMs(0);
    setDurationMs(0);
    setAudioLoaded(false);
    setShowTotal(false);
    setTotalDurMs(null);
    durationMsRef.current = 0;
    // NOTE: shouldAutoPlayRef is intentionally NOT reset here.
    // App.tsx calls triggerAutoPlay() before changing `book`, so the flag
    // must survive until the audio-load effect reads it.

    let cancelled = false;

    Promise.all([
      loadChapterIndex(book.folderUri),
      getDefaultSpeed(),
      getTotalBookDuration(book),
    ]).then(([savedIdx, defaultSpd, totalDur]) => {
      if (cancelled) return;
      const clamped = Math.min(savedIdx, book.chapters.length - 1);
      speedRef.current = defaultSpd;
      setSpeed(defaultSpd);
      setTotalDurMs(totalDur);
      setChapterIndex(clamped);
      setInitialized(true);
    });

    // Fire-and-forget: cache durations then refresh total.
    preloadBookDurations(book).then(() => {
      if (cancelled) return;
      getTotalBookDuration(book).then(dur => {
        if (!cancelled && dur != null) setTotalDurMs(dur);
      });
    });

    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [book?.folderUri, reinitTrigger]);

  // ── Load audio whenever chapter changes (gated on initialization) ──────────
  useEffect(() => {
    if (!initialized || !book || !currentChapter) return;

    // Narrow the type inside this closure so TypeScript knows it's non-null.
    const safeBook = book;
    let mounted = true;
    setAudioLoaded(false);
    setPositionMs(0);
    setDurationMs(0);
    setIsPlaying(false);
    durationMsRef.current = 0;

    // Keep original (encoded) URI for audio loading; storage functions normalise internally.
    const chapterUri = currentChapter.uri;
    const startPlay  = shouldAutoPlayRef.current;
    shouldAutoPlayRef.current = false;

    async function load() {
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
        shouldDuckAndroid: false,
      });

      const savedPos = await loadPosition(chapterUri);

      const { sound } = await Audio.Sound.createAsync(
        { uri: chapterUri },
        {
          shouldPlay: startPlay,
          positionMillis: savedPos,
          progressUpdateIntervalMillis: 1000,
          rate: speedRef.current,
          shouldCorrectPitch: true,
        },
        (status: AVPlaybackStatus) => {
          if (!mounted || !status.isLoaded) return;
          setPositionMs(status.positionMillis);
          // Save on every tick (~1 s) so tab-switching never loses progress.
          // Guard > 0: stopAsync() fires a final callback with positionMillis: 0
          // while mounted is still true, which would overwrite the real position
          // saved by unload() just before the sound was destroyed.
          if (status.positionMillis > 0) {
            savePosition(chapterUri, status.positionMillis);
          }
          if (status.durationMillis) {
            durationMsRef.current = status.durationMillis;
            setDurationMs(status.durationMillis);
            saveDuration(chapterUri, status.durationMillis);
          }
          setIsPlaying(status.isPlaying);

          if (status.didJustFinish) {
            markChapterDone(chapterUri, durationMsRef.current || undefined);
            savePosition(chapterUri, 0);
            const nextIndex = chapterIndexRef.current + 1;
            if (nextIndex < safeBook.chapters.length) {
              saveChapterIndex(safeBook.folderUri, nextIndex);
              shouldAutoPlayRef.current = true;
              setChapterIndex(nextIndex);
            }
          }
        }
      );

      if (!mounted) { await sound.unloadAsync(); return; }

      soundRef.current = sound;
      const status = await sound.getStatusAsync();
      if (status.isLoaded) {
        setPositionMs(status.positionMillis);
        if (status.durationMillis) {
          durationMsRef.current = status.durationMillis;
          setDurationMs(status.durationMillis);
          saveDuration(chapterUri, status.durationMillis);
          // Near-end detection: treat as finished if within 5 s of end.
          if (status.positionMillis > 0 &&
              status.durationMillis - status.positionMillis <= 5000) {
            markChapterDone(chapterUri, status.durationMillis);
          }
        }
        setAudioLoaded(true);
      }
    }

    load();

    return () => {
      mounted = false;
      unloadCurrent();
    };
  // currentChapter?.uri drives chapter switches; initialized gates the whole effect.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentChapter?.uri, book?.chapters.length, book?.folderUri, unloadCurrent, initialized]);

  // ── Controls ───────────────────────────────────────────────────────────────

  const goToChapter = useCallback(async (newIndex: number) => {
    if (!book) return;
    if (newIndex < 0 || newIndex >= book.chapters.length) return;
    const leavingUri = book.chapters[chapterIndexRef.current].uri;
    await saveCurrentPosition(leavingUri);
    // Mark forward-skipped chapters done so progress % includes them.
    if (newIndex > chapterIndexRef.current && durationMsRef.current > 0) {
      markChapterDone(leavingUri, durationMsRef.current);
    }
    await saveChapterIndex(book.folderUri, newIndex);
    shouldAutoPlayRef.current = true;
    setChapterIndex(newIndex);
  }, [book, saveCurrentPosition]);

  const togglePlay = useCallback(async () => {
    const sound = soundRef.current;
    if (!sound || !audioLoaded) return;
    if (isPlaying) {
      await sound.pauseAsync();
      if (currentChapter) await saveCurrentPosition(currentChapter.uri);
    } else {
      await sound.playAsync();
    }
  }, [audioLoaded, isPlaying, currentChapter, saveCurrentPosition]);

  const skip = useCallback(async (offsetMs: number) => {
    const sound = soundRef.current;
    if (!sound || !audioLoaded) return;
    const status = await sound.getStatusAsync();
    if (!status.isLoaded) return;
    const next = Math.max(0, Math.min(status.positionMillis + offsetMs, durationMs));
    await sound.setPositionAsync(next);
    setPositionMs(next);
  }, [audioLoaded, durationMs]);

  const cycleSpeed = useCallback(async () => {
    const newSpeed = nextSpeed(speed);
    speedRef.current = newSpeed;
    setSpeed(newSpeed);
    const sound = soundRef.current;
    if (sound) {
      try { await sound.setRateAsync(newSpeed, true); } catch {}
    }
  }, [speed]);

  const triggerAutoPlay = useCallback(() => {
    shouldAutoPlayRef.current = true;
  }, []);

  const toggleShowTotal = useCallback(() => setShowTotal(t => !t), []);

  const seekTo = useCallback(async (ms: number) => {
    const sound = soundRef.current;
    if (!sound || !audioLoaded) return;
    const clamped = Math.max(0, Math.min(ms, durationMs));
    await sound.setPositionAsync(clamped);
    setPositionMs(clamped);
  }, [audioLoaded, durationMs]);

  /** Stop and unload audio immediately — call before exiting the app.
   *  Saves the current position first so it survives the unload, then
   *  resets initialized + bumps reinitTrigger so the init effect re-fires
   *  on the next render (or relaunch if the process survived). */
  const unload = useCallback(async () => {
    // Save position before destroying the sound, so loadPosition() finds it
    // on the next launch/relaunch.
    const uri = currentChapterRef.current?.uri;
    const sound = soundRef.current;
    if (uri && sound) {
      try {
        const status = await sound.getStatusAsync();
        if (status.isLoaded && status.positionMillis != null && status.positionMillis > 0) {
          await savePosition(uri, status.positionMillis);
        }
      } catch {}
    }
    await unloadCurrent();
    setIsPlaying(false);
    setAudioLoaded(false);
    setInitialized(false);
    setReinitTrigger(t => t + 1);
  }, [unloadCurrent]);

  return {
    chapterIndex,
    isPlaying,
    positionMs,
    durationMs,
    audioLoaded,
    speed,
    showTotal,
    totalDurMs,
    currentChapter,
    triggerAutoPlay,
    togglePlay,
    skip,
    goToChapter,
    cycleSpeed,
    toggleShowTotal,
    unload,
    seekTo,
  };
}
