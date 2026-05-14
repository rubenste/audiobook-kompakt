import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  ScrollView,
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
}

function getSubtitle(book: Audiobook): string {
  const count = book.chapters.length;
  const match = book.chapters[0]?.filename.match(/\.(mp3|m4b|m4a)$/i);
  const ext = match ? `.${match[1].toLowerCase()}` : '';
  return `${count} ${count === 1 ? 'chapter' : 'chapters'}${ext ? `, ${ext}` : ''}`;
}

export default function LibraryScreen({ books, loading, onSelect }: Props) {
  const { width } = useWindowDimensions();
  const scrollRef = useRef<ScrollView>(null);
  const [activeTab, setActiveTab] = useState<Tab>('all');
  const [bookInfos, setBookInfos] = useState<Record<string, BookInfo>>({});

  useEffect(() => {
    if (books.length === 0) return;
    Promise.all(
      books.map(async b => [b.folderUri, await getBookInfo(b)] as const)
    ).then(entries => setBookInfos(Object.fromEntries(entries)));
  }, [books]);

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

  const onScrollEnd = (e: { nativeEvent: { contentOffset: { x: number } } }) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / width);
    setActiveTab(TABS[Math.max(0, Math.min(idx, TABS.length - 1))].key);
  };

  const renderBook = useCallback(({ item }: { item: Audiobook }) => {
    const info   = bookInfos[item.folderUri];
    const showPct = info?.status === 'in-progress' || info?.status === 'finished';
    const pct    = showPct && info.progress != null ? `${info.progress}%` : null;

    return (
      <TouchableOpacity
        style={styles.item}
        onPress={() => onSelect(item)}
        activeOpacity={0.7}
      >
        <View style={styles.itemTitleRow}>
          <Text style={styles.itemTitle} numberOfLines={2}>{item.title}</Text>
          {pct != null && <Text style={styles.itemPct}>{pct}</Text>}
        </View>
        <Text style={styles.itemSub}>{getSubtitle(item)}</Text>
      </TouchableOpacity>
    );
  }, [onSelect, bookInfos]);

  const Separator = () => <View style={styles.divider} />;

  const Empty = () => (
    <View style={styles.emptyBox}>
      <Text style={styles.emptyText}>No books</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar hidden />

      <View style={styles.header}>
        <Text style={styles.heading}>Books</Text>
      </View>
      <View style={styles.hr} />

      <View style={styles.tabBar}>
        {TABS.map(tab => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.tabActive]}
            onPress={() => tapTab(tab.key)}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <View style={styles.hr} />

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
                ItemSeparatorComponent={Separator}
                ListEmptyComponent={Empty}
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
    paddingHorizontal: 16,
    height: 72,
    justifyContent: 'center',
  },
  heading: {
    fontSize: 34,
    fontFamily: 'DMSans_700Bold',
    fontWeight: 'bold',
    color: '#000',
  },
  hr: {
    height: 1,
    backgroundColor: '#000',
  },
  tabBar: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  tab: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: '#000',
  },
  tabText: {
    fontSize: 17,
    fontFamily: 'DMSans_400Regular',
    color: '#000',
  },
  tabTextActive: {
    color: '#fff',
  },
  pager: {
    flex: 1,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 19,
    fontFamily: 'DMSans_400Regular',
    color: '#000',
  },
  item: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    minHeight: 64,
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  itemTitleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  itemTitle: {
    flex: 1,
    fontSize: 22,
    fontFamily: 'DMSans_700Bold',
    fontWeight: 'bold',
    color: '#000',
  },
  itemPct: {
    fontSize: 17,
    fontFamily: 'DMSans_400Regular',
    color: '#000',
    paddingTop: 3,
    flexShrink: 0,
  },
  itemSub: {
    fontSize: 16,
    fontFamily: 'DMSans_400Regular',
    color: '#000',
    marginTop: 3,
  },
  divider: {
    height: 1,
    backgroundColor: '#000',
    marginHorizontal: 20,
  },
  emptyBox: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 17,
    fontFamily: 'DMSans_400Regular',
    color: '#000',
  },
});
