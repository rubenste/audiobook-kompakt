import AsyncStorage from '@react-native-async-storage/async-storage';

export const DEFAULT_ROOT_PATH = '/sdcard/Audiobooks';

export const SPEED_CYCLE = [1, 1.25, 1.5, 2, 0.5, 0.75];

export function nextSpeed(current: number): number {
  const idx = SPEED_CYCLE.indexOf(current);
  return SPEED_CYCLE[(idx + 1) % SPEED_CYCLE.length];
}

export function formatSpeed(speed: number): string {
  return `${speed}x`;
}

export async function getRootPath(): Promise<string> {
  return (await AsyncStorage.getItem('rootFolder')) ?? DEFAULT_ROOT_PATH;
}

export async function setRootPath(path: string): Promise<void> {
  await AsyncStorage.setItem('rootFolder', path);
}

export async function getDefaultSpeed(): Promise<number> {
  const val = await AsyncStorage.getItem('defaultSpeed');
  return val ? parseFloat(val) : 1;
}

export async function setDefaultSpeed(speed: number): Promise<void> {
  await AsyncStorage.setItem('defaultSpeed', String(speed));
}
