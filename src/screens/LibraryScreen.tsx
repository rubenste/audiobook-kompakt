import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useDebounce } from '../utils/debounce';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  ScrollView,
  AppState,
  useWindowDimensions,
} from 'react-native';
import { Audiobook } from '../types';
import { BookInfo, getBookInfo } from '../utils/positionStorage';

type Tab = 'all' | 'new' | 'in-progress' | 'finished';

const TABS: { key: Tab; label: string }[] = [
  { key: 'all',         label: 'All' },
  { key: 'new',         label: 'New' },
  { key: 'in-progress', label: 'In Progress' },
  { key: 'finished',    label: 'Finished' },
];

interface Props {
  books: Audiobook[];
  loading: boolean;
  onSelect: (book: Audiobook) => void;
  refreshKey?: number;
  /** Extra bottom padding so the last list item clears any overlay (e.g. PersistentControls). */
  bottomOffset?: number;
}

function getSubtitle(book: Audiobook): string {
  const count = book.chapters.length;
  const match = book.chapters[0]?.filename.match(/\.(mp3|m4b|m4a|mp4)$/i);
  const ext = match ? `.${match[1].toLowerCase()}` : '';
  return `${count} ${count === 1 ? 'chapter' : 'chapters'}${ext ? `, ${ext}` : ''}`;
}

export default function LibraryScreen({ books, loading, onSelect, refreshKey, bottomOffset = 0 }: Props) {
  const { width } = useWindowDimensions();
  const scrollRef = useRef<ScrollView>(null);
  const [activeTab,   setActiveTab]   = useState<Tab>('all');
  const [bookInfos,   setBookInfos]   = useState<Record<string, BookInfo>>({});
  const [appTick,     setAppTick]     = useState(0);

  const refreshBookInfos = useCallback(() => {
    if (books.length === 0) return;
    Promise.all(
      books.map(async b => [b.folderUri, await getBookInfo(b)] as const)
    ).then(entries => setBookInfos(Object.fromEntries(entries)));
  }, [books]);

  useEffect(() => {
    refreshBookInfos();
  }, [refreshBookInfos, refreshKey, appTick]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', state => {
      if (state === 'active') setAppTick(t => t + 1);
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    const contentStyle = [styles.listContent, bottomOffset > 0 && { paddingBottom: bottomOffset }];
    console.log('[LibraryScreen] bottomOffset:', bottomOffset);
    console.log('[LibraryScreen] contentContainerStyle:', JSON.stringify(contentStyle));
  }, [bottomOffset]);

  const filteredLists = useMemo(() => ({
    all:           books,
    new:           books.filter(b => (bookInfos[b.folderUri]?.status ?? 'new') === 'new'),
    'in-progress': books.filter(b => bookInfos[b.folderUri]?.status === 'in-progress'),
    finished:      books.filter(b => bookInfos[b.folderUri]?.status === 'finished'),
  }), [books, bookInfos]);

  const tapTab = (tab: Tab) => {
    const idx = TABS.findIndex(t => t.key === tab);
    setActiveTab(tab);
    scrollRef.current?.scrollTo({ x: idx * width, animated: false });
  };
  const debouncedTapTab  = useDebounce(tapTab);
  const debouncedSelect  = useDebounce(onSelect);

  const onScrollEnd = (e: { nativeEvent: { contentOffset: { x: number } } }) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / width);
    setActiveTab(TABS[Math.max(0, Math.min(idx, TABS.length - 1))].key);
  };

  const renderBook = useCallback(({ item, index }: { item: Audiobook; index: number }) => {
    const info = bookInfos[item.folderUri];
    const pct  = info?.progress != null ? `${info.progress}%` : null;
    const isLast = filteredLists[activeTab].length - 1 === index;

    return (
      <TouchableOpacity
        style={[styles.item, isLast && styles.itemLast]}
        onPress={() => debouncedSelect(item)}
        activeOpacity={0.7}
      >
        <View style={styles.itemInfo}>
          {item.author ? <Text style={styles.itemAuthor} numberOfLines={1}>{item.author}</Text> : null}
          <Text style={styles.itemTitle} numberOfLines={3}>{item.title}</Text>
          <Text style={styles.itemSub}>{getSubtitle(item)}</Text>
        </View>
        {pct != null && <Text style={styles.itemPct}>{pct}</Text>}
      </TouchableOpacity>
    );
  }, [debouncedSelect, bookInfos, filteredLists, activeTab]);

  const Empty = () => (
    <View style={styles.emptyBox}>
      <Text style={styles.emptyText}>No books</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar hidden />

      {/* App bar */}
      <View style={styles.header}>
        <Text style={styles.heading}>Books</Text>
      </View>

      {/* Filter chips */}
      <View style={styles.chipBar}>
        {TABS.map(tab => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.chip, activeTab === tab.key && styles.chipActive]}
            onPress={() => debouncedTapTab(tab.key)}
            activeOpacity={0.7}
          >
            <Text style={[styles.chipText, activeTab === tab.key && styles.chipTextActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Section divider */}
      <View style={styles.divider} />

      {loading ? (
        <View style={styles.center}>
          <Text style={styles.loadingText}>Scanning...</Text>
        </View>
      ) : (
        <ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={onScrollEnd}
          scrollEventThrottle={32}
          style={styles.pager}
        >
          {TABS.map(tab => (
            <View key={tab.key} style={{ width }}>
              <FlatList
                data={filteredLists[tab.key]}
                keyExtractor={item => item.folderUri}
                renderItem={renderBook}
                ListEmptyComponent={Empty}
                contentContainerStyle={[styles.listContent, bottomOffset > 0 && { paddingBottom: bottomOffset }]}
              />
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    paddingTop: 32,
    paddingHorizontal: 20,
    paddingBottom: 17,
  },
  heading: {
    fontSize: 24,
    fontFamily: 'Lato_900Black',
    fontWeight: '900',
    color: '#000',
    lineHeight: 24,
  },
  chipBar: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingBottom: 16,
    gap: 16,
    alignItems: 'center',
  },
  chip: {
    height: 36,
    paddingHorizontal: 14,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: '#000',
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  chipActive: {
    backgroundColor: '#000',
  },
  chipText: {
    fontSize: 16,
    fontFamily: 'Lato_700Bold',
    fontWeight: 'bold',
    color: '#000',
  },
  chipTextActive: {
    color: '#fff',
  },
  divider: {
    height: 2,
    backgroundColor: '#000',
  },
  pager: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 18,
    fontFamily: 'Lato_400Regular',
    color: '#000',
  },
  item: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
    paddingBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#000',
    marginBottom: 24,
  },
  itemLast: {
    borderBottomWidth: 0,
    marginBottom: 0,
  },
  itemInfo: {
    flex: 1,
    minWidth: 0,
    gap: 6,
  },
  itemAuthor: {
    fontSize: 18,
    fontFamily: 'Lato_400Regular',
    color: '#000',
  },
  itemTitle: {
    fontSize: 21,
    fontFamily: 'Lato_700Bold',
    fontWeight: 'bold',
    color: '#000',
    lineHeight: 27,
  },
  itemSub: {
    fontSize: 18,
    fontFamily: 'Lato_400Regular',
    color: '#000',
  },
  itemPct: {
    fontSize: 16,
    fontFamily: 'Lato_400Regular',
    color: '#000',
    flexShrink: 0,
  },
  emptyBox: {
    paddingTop: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 18,
    fontFamily: 'Lato_400Regular',
    color: '#000',
  },
});
