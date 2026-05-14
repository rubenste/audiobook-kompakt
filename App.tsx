import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { useFonts, DMSans_400Regular, DMSans_700Bold } from '@expo-google-fonts/dm-sans';
import LibraryScreen from './src/screens/LibraryScreen';
import PlayerScreen from './src/screens/PlayerScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import { scanAudiobooks } from './src/utils/fileScanner';
import { Audiobook } from './src/types';
import { BookIcon, PlayIcon, SettingsIcon } from './src/components/Icon';

type Tab = 'books' | 'player' | 'settings';

export default function App() {
  const [fontsLoaded] = useFonts({ DMSans_400Regular, DMSans_700Bold });
  useEffect(() => { if (fontsLoaded) console.log('[App] DM Sans fonts loaded'); }, [fontsLoaded]);

  const [books,        setBooks]        = useState<Audiobook[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [selectedBook, setSelectedBook] = useState<Audiobook | null>(null);
  const [activeTab,    setActiveTab]    = useState<Tab>('player');
  // Increments each time a new book is selected, forcing PlayerScreen to remount
  const [playerKey,   setPlayerKey]    = useState(0);

  useEffect(() => {
    setLoading(true);
    scanAudiobooks().then(found => {
      setBooks(found);
      setLoading(false);
    });
  }, []);

  const openBook = (book: Audiobook) => {
    const isNewBook = book.folderUri !== selectedBook?.folderUri;
    setSelectedBook(book);
    if (isNewBook) setPlayerKey(k => k + 1);
    setActiveTab('player');
  };

  if (!fontsLoaded) return null;

  return (
    <SafeAreaProvider>
    <SafeAreaView style={styles.root}>
      {/* All three screens stay mounted; only one is visible at a time */}
      <View style={[styles.screen, activeTab !== 'books'    && styles.hidden]}>
        <LibraryScreen books={books} loading={loading} onSelect={openBook} />
      </View>

      <View style={[styles.screen, activeTab !== 'player'   && styles.hidden]}>
        {selectedBook ? (
          <PlayerScreen
            key={playerKey}
            book={selectedBook}
            autoPlay={true}
          />
        ) : (
          <View style={styles.emptyPlayer}>
            <Text style={styles.emptyText}>No book selected</Text>
            <Text style={styles.emptyHint}>Open a book from the Books tab</Text>
          </View>
        )}
      </View>

      <View style={[styles.screen, activeTab !== 'settings' && styles.hidden]}>
        <SettingsScreen />
      </View>

      {/* 2dp white gap above the tab bar border, per spec */}
      <View style={styles.tabPreDivider} />
      {/* Bottom tab bar: 1dp border + tab row */}
      <View style={styles.tabBar}>
        <View style={styles.tabTopBand} />
        <View style={styles.tabWhiteDivider} />
        <View style={styles.tabRow}>
          <TabItem
            label="Books"
            active={activeTab === 'books'}
            onPress={() => setActiveTab('books')}
            icon={<BookIcon     size={18} color="#000" />}
          />
          <TabItem
            label="Player"
            active={activeTab === 'player'}
            onPress={() => setActiveTab('player')}
            icon={<PlayIcon     size={18} color="#000" />}
          />
          <TabItem
            label="Settings"
            active={activeTab === 'settings'}
            onPress={() => setActiveTab('settings')}
            icon={<SettingsIcon size={18} color="#000" />}
          />
        </View>
      </View>
    </SafeAreaView>
    </SafeAreaProvider>
  );
}

interface TabItemProps {
  label: string;
  active: boolean;
  onPress: () => void;
  icon: React.ReactNode;
}

function TabItem({ label, active, onPress, icon }: TabItemProps) {
  return (
    <TouchableOpacity style={styles.tabItem} onPress={onPress} activeOpacity={0.7}>
      {/* icon: 18×18 */}
      {icon}
      {/* label: fontSize 15, lineHeight 15; 2dp gap above (marginTop) */}
      <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>{label}</Text>
      {/* bottom section: 4dp indicator + 8dp padding */}
      <View style={[styles.tabIndicator, active && styles.tabIndicatorActive]} />
      <View style={styles.tabBottomPad} />
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
    fontFamily: 'DMSans_700Bold',
    fontWeight: 'bold',
    color: '#000',
  },
  emptyHint: {
    fontSize: 16,
    fontFamily: 'DMSans_400Regular',
    color: '#555',
  },
  tabPreDivider: {
    height: 2,
    backgroundColor: '#fff',
  },
  // Total bar height: 8 (black band) + 2 (white divider) + 18 (icon) + 2 (gap) + 15 (label) + 4 (indicator) + 8 (bottom) = 57
  tabBar: {
    flexDirection: 'column',
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#000',
  },
  tabTopBand: {
    height: 8,
    backgroundColor: '#000',
  },
  tabWhiteDivider: {
    height: 2,
    backgroundColor: '#fff',
  },
  tabRow: {
    flexDirection: 'row',
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
  },
  tabLabel: {
    fontSize: 15,
    lineHeight: 15,
    fontFamily: 'DMSans_400Regular',
    color: '#000',
    marginTop: 2,  // 2dp gap between icon and label
  },
  tabLabelActive: {
    fontFamily: 'DMSans_700Bold',
    fontWeight: 'bold',
  },
  tabIndicator: {
    width: '100%',
    height: 4,
    backgroundColor: 'transparent',
    marginTop: 2,  // small visual breathing room before indicator
  },
  tabIndicatorActive: {
    backgroundColor: '#000',
  },
  tabBottomPad: {
    height: 6,  // 8dp total bottom - 2dp marginTop on indicator = 6dp remaining
  },
});
