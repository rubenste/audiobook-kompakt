import React, { useEffect, useRef, useState } from 'react';
import { useDebounce } from '../utils/debounce';
import {
  View, Text, TouchableOpacity, StyleSheet, StatusBar,
  Platform, ScrollView, Modal, BackHandler,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import {
  DEFAULT_ROOT_PATH, getRootPath, setRootPath,
  getDefaultSpeed, setDefaultSpeed, nextSpeed, formatSpeed,
} from '../utils/settings';

function safUriToPath(safUri: string): string {
  const match = safUri.match(/\/tree\/(.+)$/);
  if (!match) return DEFAULT_ROOT_PATH;
  const decoded = decodeURIComponent(match[1]);
  if (decoded.startsWith('primary:')) {
    return '/sdcard/' + decoded.slice('primary:'.length);
  }
  const colonIdx = decoded.indexOf(':');
  if (colonIdx !== -1) {
    return `/storage/${decoded.slice(0, colonIdx)}/${decoded.slice(colonIdx + 1)}`;
  }
  return DEFAULT_ROOT_PATH;
}

interface StorageEntry {
  key: string;
  value: string | null;
}

interface Props {
  onStop?: () => void;
}

export default function SettingsScreen({ onStop }: Props) {
  const [rootPath, setCurrentPath] = useState(DEFAULT_ROOT_PATH);
  const [speed, setSpeed] = useState(1);
  const [debugVisible, setDebugVisible] = useState(false);
  const [storageEntries, setStorageEntries] = useState<StorageEntry[]>([]);
  const [loadingStorage, setLoadingStorage] = useState(false);
  const titleTapCount = useRef(0);
  const titleLastTap  = useRef(0);

  useEffect(() => {
    Promise.all([getRootPath(), getDefaultSpeed()]).then(([path, spd]) => {
      setCurrentPath(path);
      setSpeed(spd);
    });
  }, []);

  const pickFolder = async () => {
    if (Platform.OS !== 'android') return;
    try {
      const result = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
      if (!result.granted) return;
      const path = safUriToPath(result.directoryUri);
      await setRootPath(path);
      setCurrentPath(path);
    } catch {}
  };

  const handleTitleTap = () => {
    const now = Date.now();
    if (now - titleLastTap.current < 2000) {
      titleTapCount.current += 1;
    } else {
      titleTapCount.current = 1;
    }
    titleLastTap.current = now;
    if (titleTapCount.current >= 5) {
      titleTapCount.current = 0;
      showStorage();
    }
  };

  const handleSpeedTap = async () => {
    const newSpd = nextSpeed(speed);
    setSpeed(newSpd);
    await setDefaultSpeed(newSpd);
  };

  const debouncedPickFolder  = useDebounce(pickFolder);
  const debouncedSpeedTap    = useDebounce(handleSpeedTap);
  const debouncedStop        = useDebounce(async () => { await onStop?.(); BackHandler.exitApp(); });

  const showStorage = async () => {
    setLoadingStorage(true);
    setDebugVisible(true);
    try {
      const keys = await AsyncStorage.getAllKeys();
      const sorted = [...keys].sort();
      const pairs = await AsyncStorage.multiGet(sorted);
      setStorageEntries(pairs.map(([key, value]) => ({ key, value })));
    } catch (e) {
      setStorageEntries([{ key: 'ERROR', value: String(e) }]);
    } finally {
      setLoadingStorage(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar hidden />

      <View style={styles.header}>
        <TouchableOpacity onPress={handleTitleTap} activeOpacity={1}>
          <Text style={styles.title}>Settings</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.divider} />

      <View style={styles.list}>
        <TouchableOpacity style={styles.row} onPress={debouncedPickFolder} activeOpacity={0.7}>
          <View style={styles.rowInfo}>
            <Text style={styles.rowLabel}>Root folder</Text>
            <Text style={styles.rowValue}>{rootPath}</Text>
          </View>
        </TouchableOpacity>
        <View style={styles.rowSep} />

        <TouchableOpacity style={styles.rowInline} onPress={debouncedSpeedTap} activeOpacity={0.7}>
          <Text style={styles.rowLabel}>Default speed</Text>
          <Text style={styles.rowRight}>{formatSpeed(speed)}</Text>
        </TouchableOpacity>
        <View style={styles.rowSep} />

        <TouchableOpacity style={styles.row} onPress={debouncedStop} activeOpacity={0.7}>
          <Text style={styles.rowLabel}>Stop app</Text>
        </TouchableOpacity>
        <View style={styles.rowSep} />
      </View>

      {/* Full-screen modal showing all AsyncStorage keys/values */}
      <Modal visible={debugVisible} animationType="none" onRequestClose={() => setDebugVisible(false)}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              AsyncStorage ({storageEntries.length} keys)
            </Text>
            <TouchableOpacity style={styles.closeBtn} onPress={() => setDebugVisible(false)} activeOpacity={0.7}>
              <Text style={styles.closeBtnText}>CLOSE</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.divider} />

          {loadingStorage ? (
            <View style={styles.center}>
              <Text style={styles.loadingText}>Reading...</Text>
            </View>
          ) : (
            <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
              {storageEntries.length === 0 ? (
                <Text style={styles.emptyText}>No entries found.</Text>
              ) : (
                storageEntries.map(({ key, value }) => (
                  <View key={key} style={styles.entry}>
                    <Text style={styles.entryKey} selectable>{key}</Text>
                    <Text style={styles.entryValue} selectable>{value ?? '<null>'}</Text>
                  </View>
                ))
              )}
            </ScrollView>
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  // Design: title at top 32px, fontSize 24, fontWeight 700
  header: {
    paddingTop: 32,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  title: {
    fontSize: 24,
    fontFamily: 'Lato_900Black',
    fontWeight: '900',
    color: '#000',
    lineHeight: 24,
  },
  // Design: divider after header = 2px
  divider: {
    height: 2,
    backgroundColor: '#000',
  },
  list: {
    paddingHorizontal: 20,
  },
  row: {
    paddingVertical: 20,
    justifyContent: 'center',
    minHeight: 60,
  },
  rowInfo: {
    gap: 6,
  },
  rowInline: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 20,
    minHeight: 60,
  },
  // Design: label fontSize 21, fontWeight 900 (use 700)
  rowLabel: {
    fontSize: 21,
    fontFamily: 'Lato_700Bold',
    fontWeight: 'bold',
    color: '#000',
  },
  // Design: value fontSize 18, fontWeight 400
  rowValue: {
    fontSize: 18,
    fontFamily: 'Lato_400Regular',
    color: '#000',
  },
  // Design: right-aligned value fontSize 18, fontWeight 700
  rowRight: {
    fontSize: 18,
    fontFamily: 'Lato_700Bold',
    fontWeight: 'bold',
    color: '#000',
  },
  // Design: item separator = 1px
  rowSep: {
    height: 1,
    backgroundColor: '#000',
  },
  // Modal
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    height: 64,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: 'Lato_700Bold',
    fontWeight: 'bold',
    color: '#000',
  },
  closeBtn: {
    borderWidth: 1,
    borderColor: '#000',
    paddingHorizontal: 16,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeBtnText: {
    fontSize: 14,
    fontFamily: 'Lato_700Bold',
    fontWeight: 'bold',
    color: '#000',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    fontFamily: 'Lato_400Regular',
    color: '#000',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingVertical: 8,
  },
  entry: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#000',
  },
  entryKey: {
    fontSize: 12,
    fontFamily: 'Lato_700Bold',
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 3,
  },
  entryValue: {
    fontSize: 12,
    fontFamily: 'Lato_400Regular',
    color: '#000',
  },
  emptyText: {
    padding: 24,
    fontSize: 16,
    fontFamily: 'Lato_400Regular',
    color: '#000',
  },
});
