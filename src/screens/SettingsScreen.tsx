import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, StatusBar, Platform } from 'react-native';
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

export default function SettingsScreen() {
  const [rootPath, setCurrentPath] = useState(DEFAULT_ROOT_PATH);
  const [speed, setSpeed] = useState(1);

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

  const handleSpeedTap = async () => {
    const newSpd = nextSpeed(speed);
    setSpeed(newSpd);
    await setDefaultSpeed(newSpd);
  };

  return (
    <View style={styles.container}>
      <StatusBar hidden />

      <View style={styles.header}>
        <Text style={styles.title}>Settings</Text>
      </View>
      <View style={styles.hr} />

      <TouchableOpacity style={styles.row} onPress={pickFolder} activeOpacity={0.7}>
        <Text style={styles.rowLabel}>Root folder</Text>
        <Text style={styles.rowValue}>{rootPath}</Text>
      </TouchableOpacity>
      <View style={styles.hr} />

      <TouchableOpacity style={styles.rowInline} onPress={handleSpeedTap} activeOpacity={0.7}>
        <Text style={styles.rowLabel}>Default speed</Text>
        <Text style={styles.rowRight}>{formatSpeed(speed)}</Text>
      </TouchableOpacity>
      <View style={styles.hr} />
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
  title: {
    fontSize: 24,
    fontFamily: 'DMSans_700Bold',
    fontWeight: 'bold',
    color: '#000',
  },
  hr: {
    height: 1,
    backgroundColor: '#000',
  },
  row: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    minHeight: 64,
    justifyContent: 'center',
  },
  rowInline: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    minHeight: 56,
  },
  rowLabel: {
    fontSize: 19,
    fontFamily: 'DMSans_700Bold',
    fontWeight: 'bold',
    color: '#000',
  },
  rowValue: {
    fontSize: 17,
    fontFamily: 'DMSans_400Regular',
    color: '#000',
    marginTop: 4,
  },
  rowRight: {
    fontSize: 17,
    fontFamily: 'DMSans_400Regular',
    color: '#000',
  },
});
