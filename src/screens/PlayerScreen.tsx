import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, StatusBar } from 'react-native';
import { Audio, AVPlaybackStatus } from 'expo-av';
import { Audiobook } from '../types';
import {
  loadPosition, savePosition,
  loadChapterIndex, saveChapterIndex,
  markChapterDone, saveDuration, getTotalBookDuration,
} from '../utils/positionStorage';
import { getDefaultSpeed, nextSpeed, formatSpeed } from '../utils/settings';
import {
  PlayIcon, PauseIcon,
  PrevChapterIcon, NextChapterIcon,
} from '../components/Icon';

interface Props {
  book: Audiobook;
  autoPlay?: boolean;
}

function formatTime(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${m}:${String(s).padStart(2, '0')}`;
}

const DISABLED_COLOR = '#ccc';

export default function PlayerScreen({ book, autoPlay }: Props) {
  const soundRef          = useRef<Audio.Sound | null>(null);
  const chapterIndexRef   = useRef(0);
  const speedRef          = useRef(1);
  const shouldAutoPlayRef = useRef(false);

  const [initialized,  setInitialized]  = useState(false);
  const [chapterIndex, setChapterIndex] = useState(0);
  const [isPlaying,    setIsPlaying]    = useState(false);
  const [positionMs,   setPositionMs]   = useState(0);
  const [durationMs,   setDurationMs]   = useState(0);
  const [loaded,       setLoaded]       = useState(false);
  const [speed,        setSpeed]        = useState(1);
  const [showTotal,    setShowTotal]    = useState(false);
  const [totalDurMs,   setTotalDurMs]   = useState<number | null>(null);

  const currentChapter = book.chapters[chapterIndex];

  useEffect(() => { chapterIndexRef.current = chapterIndex; }, [chapterIndex]);

  // Restore chapter index + default speed + prefetch total duration
  useEffect(() => {
    Promise.all([
      loadChapterIndex(book.folderUri),
      getDefaultSpeed(),
      getTotalBookDuration(book),
    ]).then(([savedIdx, defaultSpd, totalDur]) => {
      const clamped = Math.min(savedIdx, book.chapters.length - 1);
      speedRef.current = defaultSpd;
      setSpeed(defaultSpd);
      setTotalDurMs(totalDur);
      if (autoPlay) shouldAutoPlayRef.current = true;
      setChapterIndex(clamped);
      setInitialized(true);
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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

  const goToChapter = useCallback(async (newIndex: number) => {
    if (newIndex < 0 || newIndex >= book.chapters.length) return;
    await saveCurrentPosition(book.chapters[chapterIndexRef.current].uri);
    await saveChapterIndex(book.folderUri, newIndex);
    shouldAutoPlayRef.current = true;
    setChapterIndex(newIndex);
  }, [book.chapters, book.folderUri, saveCurrentPosition]);

  // Load audio whenever chapter changes (gated on initialization)
  useEffect(() => {
    if (!initialized) return;
    let mounted = true;
    setLoaded(false);
    setPositionMs(0);
    setDurationMs(0);
    setIsPlaying(false);

    const chapterUri  = currentChapter.uri;
    const startPlay   = shouldAutoPlayRef.current;
    shouldAutoPlayRef.current = false;

    async function load() {
      await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
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
          // Save position on every tick (every 1 s) so tab-switching never loses progress
          savePosition(chapterUri, status.positionMillis);
          if (status.durationMillis) {
            setDurationMs(status.durationMillis);
            saveDuration(chapterUri, status.durationMillis);
          }
          setIsPlaying(status.isPlaying);

          if (status.didJustFinish) {
            markChapterDone(chapterUri);
            savePosition(chapterUri, 0);
            const nextIndex = chapterIndexRef.current + 1;
            if (nextIndex < book.chapters.length) {
              saveChapterIndex(book.folderUri, nextIndex);
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
          setDurationMs(status.durationMillis);
          saveDuration(chapterUri, status.durationMillis);
        }
        setLoaded(true);
      }
    }

    load();

    return () => {
      mounted = false;
      unloadCurrent();
    };
  }, [currentChapter.uri, book.chapters.length, book.folderUri, unloadCurrent, initialized]);

  const togglePlay = async () => {
    const sound = soundRef.current;
    if (!sound || !loaded) return;
    if (isPlaying) {
      await sound.pauseAsync();
      await saveCurrentPosition(currentChapter.uri);
    } else {
      await sound.playAsync();
    }
  };

  const skip = async (offsetMs: number) => {
    const sound = soundRef.current;
    if (!sound || !loaded) return;
    const status = await sound.getStatusAsync();
    if (!status.isLoaded) return;
    const next = Math.max(0, Math.min(status.positionMillis + offsetMs, durationMs));
    await sound.setPositionAsync(next);
    setPositionMs(next);
  };

  const cycleSpeed = async () => {
    const newSpeed = nextSpeed(speed);
    speedRef.current = newSpeed;
    setSpeed(newSpeed);
    const sound = soundRef.current;
    if (sound) {
      try { await sound.setRateAsync(newSpeed, true); } catch {}
    }
  };

  const progressFraction = durationMs > 0 ? positionMs / durationMs : 0;

  const rightTime = showTotal
    ? (totalDurMs != null ? formatTime(totalDurMs) : '--:--')
    : (durationMs > 0     ? formatTime(durationMs) : '--:--');

  const prevDisabled = chapterIndex === 0;
  const nextDisabled = chapterIndex === book.chapters.length - 1;

  return (
    <View style={styles.container}>
      <StatusBar hidden />

      {/* Center: title + chapter nav */}
      <View style={styles.center}>
        <Text style={styles.bookTitle} numberOfLines={2}>{book.title}</Text>

        <View style={styles.chapterRow}>
          <TouchableOpacity
            style={styles.chapterNavBtn}
            onPress={() => goToChapter(chapterIndex - 1)}
            disabled={prevDisabled}
            activeOpacity={0.7}
          >
            <PrevChapterIcon size={31} color={prevDisabled ? DISABLED_COLOR : '#000'} />
          </TouchableOpacity>

          <Text style={styles.chapterLabel}>
            Ch {chapterIndex + 1} of {book.chapters.length}
          </Text>

          <TouchableOpacity
            style={styles.chapterNavBtn}
            onPress={() => goToChapter(chapterIndex + 1)}
            disabled={nextDisabled}
            activeOpacity={0.7}
          >
            <NextChapterIcon size={31} color={nextDisabled ? DISABLED_COLOR : '#000'} />
          </TouchableOpacity>
        </View>

        <Text style={styles.chapterFilename} numberOfLines={3}>
          {currentChapter.filename}
        </Text>
      </View>

      {/* Bottom: speed + progress bar + time + controls */}
      <View style={styles.bottomArea}>
        <TouchableOpacity onPress={cycleSpeed} activeOpacity={0.7} style={styles.speedTap}>
          <Text style={styles.speedText}>{formatSpeed(speed)}</Text>
        </TouchableOpacity>

        {/* Progress bar: bordered outer track, black fill */}
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${progressFraction * 100}%` }]} />
        </View>

        <TouchableOpacity
          style={styles.timeRow}
          onPress={() => setShowTotal(t => !t)}
          activeOpacity={0.7}
        >
          <Text style={styles.timeText}>{formatTime(positionMs)}</Text>
          <Text style={styles.timeText}>{rightTime}</Text>
        </TouchableOpacity>

        <View style={styles.controls}>
          <TouchableOpacity
            style={styles.skipBtn}
            onPress={() => skip(-60000)}
            disabled={!loaded}
            activeOpacity={0.7}
          >
            <Text style={styles.skipText}>−1m</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.skipBtn}
            onPress={() => skip(-10000)}
            disabled={!loaded}
            activeOpacity={0.7}
          >
            <Text style={styles.skipText}>−10s</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.playBtn}
            onPress={togglePlay}
            disabled={!loaded}
            activeOpacity={0.7}
          >
            {isPlaying
              ? <PauseIcon size={34} color="#fff" />
              : <PlayIcon  size={34} color="#fff" />}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.skipBtn}
            onPress={() => skip(10000)}
            disabled={!loaded}
            activeOpacity={0.7}
          >
            <Text style={styles.skipText}>+10s</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.skipBtn}
            onPress={() => skip(60000)}
            disabled={!loaded}
            activeOpacity={0.7}
          >
            <Text style={styles.skipText}>+1m</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  bookTitle: {
    fontSize: 28,
    fontFamily: 'DMSans_700Bold',
    fontWeight: 'bold',
    color: '#000',
    textAlign: 'center',
    marginBottom: 20,
  },
  chapterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
    marginBottom: 10,
  },
  chapterNavBtn: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chapterLabel: {
    fontSize: 18,
    fontFamily: 'DMSans_400Regular',
    color: '#000',
  },
  chapterFilename: {
    fontSize: 16,
    fontFamily: 'DMSans_400Regular',
    color: '#888',
    textAlign: 'center',
    flexShrink: 1,
  },
  bottomArea: {
    paddingHorizontal: 20,
    paddingBottom: 28,
  },
  speedTap: {
    alignSelf: 'flex-start',
    paddingVertical: 4,
    marginBottom: 8,
  },
  speedText: {
    fontSize: 22,
    fontFamily: 'DMSans_700Bold',
    fontWeight: 'bold',
    color: '#000',
  },
  progressTrack: {
    width: '100%',
    height: 8,
    borderWidth: 2,
    borderColor: '#000',
    backgroundColor: '#fff',
    borderRadius: 4,
    marginBottom: 10,
  },
  progressFill: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    backgroundColor: '#000',
    borderRadius: 2,
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  timeText: {
    fontSize: 17,
    fontFamily: 'DMSans_400Regular',
    color: '#000',
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
  },
  skipBtn: {
    flex: 1,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#fff',
    borderWidth: 2.5,
    borderColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  skipText: {
    fontSize: 15,
    fontFamily: 'DMSans_700Bold',
    fontWeight: '700',
    color: '#000',
  },
  playBtn: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: '#000',
    borderWidth: 2,
    borderColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
