import React from 'react';
import Svg, { Path, Rect, Polygon } from 'react-native-svg';

interface IconProps {
  size?: number;
  color?: string;
}

export function PlayIcon({ size = 24, color = '#000000' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="m19.875 10.915-12-6.925a1.242 1.242 0 0 0-1.25 0A1.24 1.24 0 0 0 6 5.075V18.93a1.251 1.251 0 0 0 1.875 1.085l12-6.93c.39-.225.625-.63.625-1.085 0-.455-.235-.855-.625-1.085Z"
        fill={color}
      />
    </Svg>
  );
}

export function PauseIcon({ size = 24, color = '#000000' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Rect x="5" y="4" width="4" height="16" fill={color} />
      <Rect x="15" y="4" width="4" height="16" fill={color} />
    </Svg>
  );
}

export function BookIcon({ size = 24, color = '#000000' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        fillRule="evenodd"
        d="M6.75 3.5c-.69 0-1.25.56-1.25 1.25V16.8c.375-.192.8-.3 1.25-.3H18.5v-13H6.75ZM18.5 18H6.75a1.25 1.25 0 1 0 0 2.5H18.5V18ZM4 19.25V4.75A2.75 2.75 0 0 1 6.75 2H20v20H6.75A2.75 2.75 0 0 1 4 19.25Z"
        fill={color}
      />
    </Svg>
  );
}

export function SettingsIcon({ size = 24, color = '#000000' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        fillRule="evenodd"
        d="M9.995 21.8c.655.13 1.33.2 2.005.2v-.005c.67 0 1.35-.065 2.005-.2.58-.115.995-.63.995-1.225v-1.155a7.777 7.777 0 0 0 1.925-1.11l1 .575c.515.295 1.17.195 1.555-.245a9.956 9.956 0 0 0 2.01-3.48 1.247 1.247 0 0 0-.565-1.47l-1-.575a8.224 8.224 0 0 0 0-2.22l1-.58c.51-.295.75-.915.565-1.47a9.956 9.956 0 0 0-2.01-3.48c-.39-.44-1.04-.54-1.555-.245l-1 .575a7.907 7.907 0 0 0-1.92-1.11V3.425c0-.59-.42-1.11-.995-1.225-1.31-.27-2.7-.27-4.015 0-.58.115-.995.63-.995 1.225V4.58a7.777 7.777 0 0 0-1.925 1.11l-1-.575a1.248 1.248 0 0 0-1.555.245 9.956 9.956 0 0 0-2.01 3.48c-.185.555.05 1.175.565 1.47l1 .58a8.224 8.224 0 0 0 0 2.22l-1 .58c-.51.295-.75.915-.565 1.47a9.88 9.88 0 0 0 2.01 3.48c.39.44 1.04.54 1.555.245l1-.575c.59.46 1.235.83 1.925 1.11v1.155c0 .59.42 1.11.995 1.225Zm3.505-1.43a8.637 8.637 0 0 1-3 0v-2.02l-.52-.17a6.501 6.501 0 0 1-2.325-1.345l-.405-.365-1.75 1.01A8.421 8.421 0 0 1 4 14.885l1.75-1.01-.11-.53c-.095-.44-.14-.89-.14-1.345 0-.455.05-.905.14-1.345l.11-.53L4 9.115A8.38 8.38 0 0 1 5.5 6.52l1.75 1.01.405-.365A6.428 6.428 0 0 1 9.98 5.82l.52-.17V3.63a8.637 8.637 0 0 1 3 0v2.015l.52.17c.865.28 1.645.735 2.325 1.345l.405.365 1.75-1.01A8.38 8.38 0 0 1 20 9.11l-1.75 1.01.11.53c.095.44.14.89.14 1.345 0 .455-.05.905-.14 1.345l-.11.53L20 14.88a8.346 8.346 0 0 1-1.5 2.6l-1.75-1.01-.405.365a6.428 6.428 0 0 1-2.325 1.345l-.52.17v2.02ZM8 12c0 2.205 1.795 4 4 4s4-1.795 4-4-1.795-4-4-4-4 1.795-4 4Zm1.5 0a2.5 2.5 0 0 1 5 0 2.5 2.5 0 0 1-5 0Z"
        fill={color}
      />
    </Svg>
  );
}

export function ArrowLeftIcon({ size = 24, color = '#000000' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M15 18l-6-6 6-6"
        stroke={color}
        strokeWidth={2}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

// Vertical bar on left + two left-pointing triangles
export function PrevChapterIcon({ size = 24, color = '#000000' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Rect x="2" y="3" width="2.5" height="18" fill={color} />
      <Polygon points="13,4 13,20 5,12" fill={color} />
      <Polygon points="21,4 21,20 13,12" fill={color} />
    </Svg>
  );
}

// Two right-pointing triangles + vertical bar on right
export function NextChapterIcon({ size = 24, color = '#000000' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Polygon points="3,4 3,20 11,12" fill={color} />
      <Polygon points="11,4 11,20 19,12" fill={color} />
      <Rect x="19.5" y="3" width="2.5" height="18" fill={color} />
    </Svg>
  );
}
