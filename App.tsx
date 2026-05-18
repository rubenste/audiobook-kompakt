import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { useFonts, Lato_400Regular, Lato_700Bold, Lato_900Black } from '@expo-google-fonts/lato';
import LibraryScreen from './src/screens/LibraryScreen';
import PlayerScreen from './src/screens/PlayerScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import { scanAudiobooks } from './src/utils/fileScanner';
import { saveLastBook, loadLastBook } from './src/utils/positionStorage';
import { Audiobook } from './src/types';
import { BookIcon, PlayIcon, PauseIcon, SettingsIcon } from './src/components/Icon';
import { useAudioPlayer } from './src/hooks/useAudioPlayer';
import { useDebounce } from './src/utils/debounce';

type Tab = 'books' | 'player' | 'settings';

// Height of the persistent mini-controls bar.
// LibraryScreen uses this to pad its list so the last item isn't obscured.
// 8px floatingBar + 28px paddingTop + 70px play button + 20px paddingBottom = 126
export const PERSISTENT_CONTROLS_HEIGHT = 126;

export default function App() {
  const [fontsLoaded] = useFonts({ Lato_400Regular, Lato_700Bold, Lato_900Black });
  useEffect(() => { if (fontsLoaded) console.log('[App] Lato fonts loaded'); }, [fontsLoaded]);

  const [books,        setBooks]        = useState<Audiobook[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [selectedBook, setSelectedBook] = useState<Audiobook | null>(null);
  const [activeTab,    setActiveTab]    = useState<Tab>('player');
  // Increments when Books tab is pressed to trigger a bookInfos refresh.
  const [libraryRefreshKey, setLibraryRefreshKey] = useState(0);

  const player = useAudioPlayer(selectedBook);

  useEffect(() => {
    setLoading(true);
    scanAudiobooks().then(async found => {
      setBooks(found);
      setLoading(false);
      // Restore last played book — intentionally NO call to triggerAutoPlay()
      // so audio never starts automatically on relaunch.
      const lastFolderUri = await loadLastBook();
      if (lastFolderUri) {
        const match = found.find(b => b.folderUri === lastFolderUri);
        if (match) setSelectedBook(match);
      }
    });
  }, []);

  const openBook = (book: Audiobook) => {
    const isNewBook = book.folderUri !== selectedBook?.folderUri;
    if (isNewBook) {
      // Signal that audio should start playing as soon as the chapter loads.
      // triggerAutoPlay sets shouldAutoPlayRef before the book state changes,
      // so the flag survives through the hook's init effect.
      player.triggerAutoPlay();
    }
    setSelectedBook(book);
    saveLastBook(book.folderUri);
    setActiveTab('player');
  };

  if (!fontsLoaded) return null;

  // Show the persistent mini-player whenever a book is loaded and we're not
  // already on the Player tab (where the full controls are visible).
  const showPersistentControls = selectedBook != null && activeTab !== 'player';

  return (
    <SafeAreaProvider>
    <SafeAreaView style={styles.root}>
      {/* All three screens stay mounted; only one is visible at a time */}
      <View style={[styles.screen, activeTab !== 'books'    && styles.hidden]}>
        <LibraryScreen
          books={books}
          loading={loading}
          onSelect={openBook}
          refreshKey={libraryRefreshKey}
          bottomOffset={0}
        />
      </View>

      <View style={[styles.screen, activeTab !== 'player'   && styles.hidden]}>
        {selectedBook ? (
          <PlayerScreen
            book={selectedBook}
            chapterIndex={player.chapterIndex}
            isPlaying={player.isPlaying}
            positionMs={player.positionMs}
            durationMs={player.durationMs}
            loaded={player.audioLoaded}
            speed={player.speed}
            showTotal={player.showTotal}
            totalDurMs={player.totalDurMs}
            onTogglePlay={player.togglePlay}
            onSkip={player.skip}
            onGoToChapter={player.goToChapter}
            onCycleSpeed={player.cycleSpeed}
            onToggleShowTotal={player.toggleShowTotal}
            onSeekTo={player.seekTo}
          />
        ) : (
          <View style={styles.emptyPlayer}>
            <Text style={styles.emptyText}>No book selected</Text>
            <Text style={styles.emptyHint}>Open a book from the Books tab</Text>
          </View>
        )}
      </View>

      <View style={[styles.screen, activeTab !== 'settings' && styles.hidden]}>
        <SettingsScreen onStop={player.unload} />
      </View>

      {/* Persistent mini-player — visible on Books and Settings tabs */}
      {showPersistentControls && (
        <PersistentControls
          isPlaying={player.isPlaying}
          positionMs={player.positionMs}
          durationMs={player.durationMs}
          loaded={player.audioLoaded}
          onTogglePlay={player.togglePlay}
          onSkipBack={(ms) => player.skip(-ms)}
          onSkipForward={(ms) => player.skip(ms)}
        />
      )}

      {/* Bottom tab bar — height 59, border-top 2px #000 */}
      <View style={styles.tabBar}>
        <TabItem
          label="Books"
          active={activeTab === 'books'}
          onPress={() => { setActiveTab('books'); setLibraryRefreshKey(k => k + 1); }}
          icon={<BookIcon     size={24} color="#000" />}
        />
        <TabItem
          label="Player"
          active={activeTab === 'player'}
          onPress={() => setActiveTab('player')}
          icon={<PlayIcon     size={24} color="#000" />}
        />
        <TabItem
          label="Settings"
          active={activeTab === 'settings'}
          onPress={() => setActiveTab('settings')}
          icon={<SettingsIcon size={24} color="#000" />}
        />
      </View>
    </SafeAreaView>
    </SafeAreaProvider>
  );
}

// ── Persistent mini-player ────────────────────────────────────────────────────

interface PersistentControlsProps {
  isPlaying: boolean;
  positionMs: number;
  durationMs: number;
  loaded: boolean;
  onTogglePlay: () => void;
  onSkipBack: (ms: number) => void;
  onSkipForward: (ms: number) => void;
}

function PersistentControls({
  isPlaying, positionMs, durationMs, loaded,
  onTogglePlay, onSkipBack, onSkipForward,
}: PersistentControlsProps) {
  const debouncedTogglePlay = useDebounce(onTogglePlay);
  const debouncedSkipBack   = useDebounce(onSkipBack);
  const debouncedSkipFwd    = useDebounce(onSkipForward);

  const progress = durationMs > 0 ? positionMs / durationMs : 0;

  return (
    <View style={pc.container}>
      {/* Progress bar — bottom border acts as the divider line */}
      <View style={pc.floatingBar}>
        <View style={[pc.floatingFill, { width: `${progress * 100}%` as `${number}%` }]} />
      </View>

      <View style={pc.row}>
        <TouchableOpacity
          style={pc.skipBtn}
          onPress={() => debouncedSkipBack(60000)}
          disabled={!loaded}
          activeOpacity={0.7}
        >
          <Text style={pc.skipText}>−1m</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={pc.skipBtn}
          onPress={() => debouncedSkipBack(10000)}
          disabled={!loaded}
          activeOpacity={0.7}
        >
          <Text style={pc.skipText}>−10s</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={pc.playBtn}
          onPress={debouncedTogglePlay}
          disabled={!loaded}
          activeOpacity={0.7}
        >
          {isPlaying
            ? <PauseIcon size={34} color="#fff" />
            : <PlayIcon  size={34} color="#fff" />}
        </TouchableOpacity>

        <TouchableOpacity
          style={pc.skipBtn}
          onPress={() => debouncedSkipFwd(10000)}
          disabled={!loaded}
          activeOpacity={0.7}
        >
          <Text style={pc.skipText}>+10s</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={pc.skipBtn}
          onPress={() => debouncedSkipFwd(60000)}
          disabled={!loaded}
          activeOpacity={0.7}
        >
          <Text style={pc.skipText}>+1m</Text>
        </TouchableOpacity>
      </View>

    </View>
  );
}

const pc = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
  },
  floatingBar: {
    height: 8,
    backgroundColor: '#fff',
    borderTopWidth: 2,
    borderTopColor: '#000',
    borderLeftWidth: 0,
    borderRightWidth: 0,
    borderBottomWidth: 2,
    borderBottomColor: '#000',
  },
  floatingFill: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    backgroundColor: '#000',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 28,   // matches controls.marginTop in PlayerScreen
    paddingBottom: 20, // matches bottomArea.paddingBottom in PlayerScreen
    gap: 12,
  },
  skipBtn: {
    flex: 1,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: '#000',
    backgroundColor: '#fff',
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

// ── Tab bar ───────────────────────────────────────────────────────────────────

interface TabItemProps {
  label: string;
  active: boolean;
  onPress: () => void;
  icon: React.ReactNode;
}

function TabItem({ label, active, onPress, icon }: TabItemProps) {
  return (
    <TouchableOpacity style={styles.tabItem} onPress={onPress} activeOpacity={0.7}>
      {icon}
      <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>{label}</Text>
      {active && <View style={styles.tabIndicator} />}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#fff',
  },
  screen: {
    flex: 1,
  },
  hidden: {
    display: 'none',
  },
  emptyPlayer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  emptyText: {
    fontSize: 20,
    fontFamily: 'Lato_700Bold',
    fontWeight: 'bold',
    color: '#000',
  },
  emptyHint: {
    fontSize: 16,
    fontFamily: 'Lato_400Regular',
    color: '#555',
  },
  // Design: height 59, border-top 2px #000, flex row
  tabBar: {
    height: 59,
    flexDirection: 'row',
    borderTopWidth: 2,
    borderTopColor: '#000',
    backgroundColor: '#fff',
  },
  tabItem: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    paddingBottom: 6,
    position: 'relative',
  },
  tabLabel: {
    fontSize: 15,
    fontFamily: 'Lato_400Regular',
    color: '#000',
  },
  tabLabelActive: {
    fontFamily: 'Lato_700Bold',
    fontWeight: 'bold',
  },
  // Active tab: 4px black bar at absolute bottom
  tabIndicator: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: '#000',
  },
});
