import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Pressable, StyleSheet, StatusBar } from 'react-native';
import { useDebounce } from '../utils/debounce';
import { Audiobook } from '../types';
import { formatSpeed } from '../utils/settings';
import {
  PlayIcon, PauseIcon,
  PrevChapterIcon, NextChapterIcon,
} from '../components/Icon';

interface Props {
  book: Audiobook;
  chapterIndex: number;
  isPlaying: boolean;
  positionMs: number;
  durationMs: number;
  loaded: boolean;
  speed: number;
  showTotal: boolean;
  totalDurMs: number | null;
  onTogglePlay: () => void;
  onSkip: (offsetMs: number) => void;
  onGoToChapter: (index: number) => void;
  onCycleSpeed: () => void;
  onToggleShowTotal: () => void;
  onSeekTo: (ms: number) => void;
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

export default function PlayerScreen({
  book, chapterIndex, isPlaying, positionMs, durationMs, loaded,
  speed, showTotal, totalDurMs,
  onTogglePlay, onSkip, onGoToChapter, onCycleSpeed, onToggleShowTotal, onSeekTo,
}: Props) {
  const debouncedTogglePlay      = useDebounce(onTogglePlay);
  const debouncedSkip            = useDebounce(onSkip);
  const debouncedGoToChapter     = useDebounce(onGoToChapter);
  const debouncedCycleSpeed      = useDebounce(onCycleSpeed);
  const debouncedToggleShowTotal = useDebounce(onToggleShowTotal);
  const debouncedSeekTo          = useDebounce(onSeekTo);

  const [barWidth, setBarWidth] = useState(0);

  const currentChapter = book.chapters[chapterIndex];

  const progressFraction = durationMs > 0 ? positionMs / durationMs : 0;
  const chapterDuration  = durationMs > 0 ? formatTime(durationMs) : '--:--';
  const rightTime        = showTotal && totalDurMs != null
    ? formatTime(totalDurMs)
    : chapterDuration;

  const prevDisabled = chapterIndex === 0;
  const nextDisabled = chapterIndex === book.chapters.length - 1;

  return (
    <View style={styles.container}>
      <StatusBar hidden />

      {/* Center: title + chapter nav */}
      <View style={styles.center}>
        {book.author ? (
          <Text style={styles.bookAuthor} numberOfLines={1}>{book.author}</Text>
        ) : null}
        <Text style={styles.bookTitle} numberOfLines={4}>{book.title}</Text>

        {book.chapters.length > 1 && (
          <>
            <View style={styles.chapterRow}>
              <TouchableOpacity
                style={styles.chapterNavBtn}
                onPress={() => debouncedGoToChapter(chapterIndex - 1)}
                disabled={prevDisabled}
                activeOpacity={0.7}
              >
                <PrevChapterIcon size={28} color={prevDisabled ? DISABLED_COLOR : '#000'} />
              </TouchableOpacity>

              <Text style={styles.chapterLabel}>
                Ch {chapterIndex + 1} of {book.chapters.length}
              </Text>

              <TouchableOpacity
                style={styles.chapterNavBtn}
                onPress={() => debouncedGoToChapter(chapterIndex + 1)}
                disabled={nextDisabled}
                activeOpacity={0.7}
              >
                <NextChapterIcon size={28} color={nextDisabled ? DISABLED_COLOR : '#000'} />
              </TouchableOpacity>
            </View>

            <Text style={styles.chapterFilename} numberOfLines={3}>
              {currentChapter?.filename}
            </Text>
          </>
        )}
      </View>

      {/* Bottom: speed + flat progress bar + times + divider + controls */}
      <View style={styles.bottomArea}>
        <TouchableOpacity onPress={debouncedCycleSpeed} activeOpacity={0.7} style={styles.speedTap}>
          <Text style={styles.speedText}>{formatSpeed(speed)}</Text>
        </TouchableOpacity>

        {/* 8px progress track — tappable to seek */}
        <Pressable
          onLayout={e => setBarWidth(e.nativeEvent.layout.width)}
          onPress={e => {
            if (barWidth > 0 && durationMs > 0) {
              debouncedSeekTo(Math.round((e.nativeEvent.locationX / barWidth) * durationMs));
            }
          }}
          disabled={!loaded}
          hitSlop={{ top: 20, bottom: 0, left: 0, right: 0 }}
        >
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progressFraction * 100}%` }]} />
          </View>
        </Pressable>

        <TouchableOpacity
          style={styles.timeRow}
          onPress={debouncedToggleShowTotal}
          activeOpacity={0.7}
        >
          <Text style={styles.timeText}>{formatTime(positionMs)}</Text>
          <Text style={styles.timeText}>{rightTime}</Text>
        </TouchableOpacity>

        <View style={styles.controlsDivider} />

        <View style={styles.controls}>
          <TouchableOpacity
            style={styles.skipBtn}
            onPress={() => debouncedSkip(-60000)}
            disabled={!loaded}
            activeOpacity={0.7}
          >
            <Text style={styles.skipText}>−1m</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.skipBtn}
            onPress={() => debouncedSkip(-10000)}
            disabled={!loaded}
            activeOpacity={0.7}
          >
            <Text style={styles.skipText}>−10s</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.playBtn}
            onPress={debouncedTogglePlay}
            disabled={!loaded}
            activeOpacity={0.7}
          >
            {isPlaying
              ? <PauseIcon size={34} color="#fff" />
              : <PlayIcon  size={34} color="#fff" />}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.skipBtn}
            onPress={() => debouncedSkip(10000)}
            disabled={!loaded}
            activeOpacity={0.7}
          >
            <Text style={styles.skipText}>+10s</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.skipBtn}
            onPress={() => debouncedSkip(60000)}
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
  },
  bookAuthor: {
    fontSize: 18,
    fontFamily: 'Lato_400Regular',
    color: '#000',
    textAlign: 'center',
    paddingHorizontal: 39,
    alignSelf: 'stretch',
    marginBottom: 6,
  },
  bookTitle: {
    fontSize: 32,
    fontFamily: 'Lato_700Bold',
    fontWeight: 'bold',
    color: '#000',
    textAlign: 'center',
    lineHeight: 40,
    paddingHorizontal: 39,
    alignSelf: 'stretch',
    marginBottom: 20,
  },
  chapterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    alignSelf: 'stretch',
    marginBottom: 8,
  },
  chapterNavBtn: {
    width: 45,
    height: 45,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chapterLabel: {
    fontSize: 16,
    fontFamily: 'Lato_700Bold',
    fontWeight: 'bold',
    color: '#000',
    textAlign: 'center',
    flex: 1,
  },
  chapterFilename: {
    fontSize: 12,
    fontFamily: 'Lato_400Regular',
    color: '#000',
    textAlign: 'center',
    paddingHorizontal: 39,
    alignSelf: 'stretch',
    flexShrink: 1,
  },
  bottomArea: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  speedTap: {
    alignSelf: 'flex-start',
    paddingVertical: 4,
    marginBottom: 16,
  },
  speedText: {
    fontSize: 24,
    fontFamily: 'Lato_700Bold',
    fontWeight: 'bold',
    color: '#000',
  },
  progressTrack: {
    width: '100%',
    height: 8,
    borderWidth: 2,
    borderColor: '#000',
    backgroundColor: '#fff',
  },
  progressFill: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    backgroundColor: '#000',
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 13,
    marginBottom: 0,
  },
  timeText: {
    fontSize: 16,
    fontFamily: 'Lato_400Regular',
    color: '#000',
  },
  // 2px full-width divider; negative margin escapes the paddingHorizontal: 20
  controlsDivider: {
    height: 2,
    backgroundColor: '#000',
    marginTop: 28,
    marginHorizontal: -20,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 28,
  },
  skipBtn: {
    flex: 1,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  skipText: {
    fontSize: 16,
    fontFamily: 'Lato_700Bold',
    fontWeight: 'bold',
    color: '#000',
  },
  playBtn: {
    width: 80,
    height: 70,
    borderRadius: 18,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
