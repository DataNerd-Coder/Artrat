import React from 'react';
import { Platform, Text } from 'react-native';

export interface IconProps {
  size?: number;
  color?: string;
}

const SvgIcon: React.FC<{
  size?: number;
  color?: string;
  children: React.ReactNode;
  fallback?: string;
}> = ({ size = 16, color = '#171426', children, fallback = '•' }) => {
  if (Platform.OS !== 'web') {
    return <Text style={{ fontSize: size * 0.85, color }}>{fallback}</Text>;
  }
  return React.createElement(
    'svg',
    {
      width: size,
      height: size,
      viewBox: '0 0 24 24',
      fill: 'none',
      stroke: color,
      strokeWidth: 1.75,
      strokeLinecap: 'round',
      strokeLinejoin: 'round',
      style: { flexShrink: 0, display: 'inline-block' },
    },
    children
  );
};

const p = (d: string, key?: string) =>
  React.createElement('path', { d, key });
const c = (cx: number, cy: number, r: number, key?: string) =>
  React.createElement('circle', { cx, cy, r, key });
const poly = (points: string, key?: string) =>
  React.createElement('polyline', { points, key });
const line = (
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  key?: string
) => React.createElement('line', { x1, y1, x2, y2, key });
const rect = (
  x: number,
  y: number,
  width: number,
  height: number,
  rx: number,
  key?: string
) => React.createElement('rect', { x, y, width, height, rx, key });

export const ArrowLeft: React.FC<IconProps> = (props) => (
  <SvgIcon {...props}>
    {p('m12 19-7-7 7-7', '1')}
    {p('M19 12H5', '2')}
  </SvgIcon>
);

export const ArrowRight: React.FC<IconProps> = (props) => (
  <SvgIcon {...props}>
    {p('M5 12h14', '1')}
    {p('m12 5 7 7-7 7', '2')}
  </SvgIcon>
);

export const Bell: React.FC<IconProps> = (props) => (
  <SvgIcon {...props}>
    {p('M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9', '1')}
    {p('M10.3 21a1.94 1.94 0 0 0 3.4 0', '2')}
  </SvgIcon>
);

export const CalendarClock: React.FC<IconProps> = (props) => (
  <SvgIcon {...props}>
    {p('M21 7.5V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h3.5', '1')}
    {p('M16 2v4', '2')}
    {p('M8 2v4', '3')}
    {p('M3 10h5', '4')}
    {c(16, 16, 6, '5')}
    {p('M16 14v2l1 1', '6')}
  </SvgIcon>
);

export const Check: React.FC<IconProps> = (props) => (
  <SvgIcon {...props}>{p('M20 6 9 17l-5-5')}</SvgIcon>
);

export const CheckCircle2: React.FC<IconProps> = (props) => (
  <SvgIcon {...props}>
    {c(12, 12, 10, '1')}
    {p('m9 12 2 2 4-4', '2')}
  </SvgIcon>
);

export const CheckSquare: React.FC<IconProps> = (props) => (
  <SvgIcon {...props}>
    {rect(3, 3, 18, 18, 3, '1')}
    {p('m9 12 2 2 4-4', '2')}
  </SvgIcon>
);

export const ChevronDown: React.FC<IconProps> = (props) => (
  <SvgIcon {...props}>{p('m6 9 6 6 6-6')}</SvgIcon>
);

export const ChevronUp: React.FC<IconProps> = (props) => (
  <SvgIcon {...props}>{p('m18 15-6-6-6 6')}</SvgIcon>
);

export const Download: React.FC<IconProps> = (props) => (
  <SvgIcon {...props}>
    {p('M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4', '1')}
    {poly('7 10 12 15 17 10', '2')}
    {line(12, 15, 12, 3, '3')}
  </SvgIcon>
);

export const AlertCircle: React.FC<IconProps> = (props) => (
  <SvgIcon {...props}>
    {c(12, 12, 10, '1')}
    {line(12, 8, 12, 12, '2')}
    {line(12, 16, 12.01, 16, '3')}
  </SvgIcon>
);

export const MessageSquare: React.FC<IconProps> = (props) => (
  <SvgIcon {...props}>
    {p('M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z')}
  </SvgIcon>
);

export const Clock: React.FC<IconProps> = (props) => (
  <SvgIcon {...props}>
    {c(12, 12, 10, '1')}
    {poly('12 6 12 12 16 14', '2')}
  </SvgIcon>
);

export const ExternalLink: React.FC<IconProps> = (props) => (
  <SvgIcon {...props}>
    {p('M15 3h6v6', '1')}
    {p('M10 14 21 3', '2')}
    {p('M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6', '3')}
  </SvgIcon>
);

export const FileCheck2: React.FC<IconProps> = (props) => (
  <SvgIcon {...props}>
    {p('M4 22h14a2 2 0 0 0 2-2V7l-5-5H6a2 2 0 0 0-2 2v4', '1')}
    {p('M14 2v4a2 2 0 0 0 2 2h4', '2')}
    {p('m3 15 2 2 4-4', '3')}
  </SvgIcon>
);

export const FileText: React.FC<IconProps> = (props) => (
  <SvgIcon {...props}>
    {p('M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z', '1')}
    {p('M14 2v4a2 2 0 0 0 2 2h4', '2')}
    {p('M10 9H8', '3')}
    {p('M16 13H8', '4')}
    {p('M16 17H8', '5')}
  </SvgIcon>
);

export const FolderArchive: React.FC<IconProps> = (props) => (
  <SvgIcon {...props}>
    {p(
      'M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z',
      '1'
    )}
    {p('M12 10v6', '2')}
    {p('m9 13 3 3 3-3', '3')}
  </SvgIcon>
);

export const FolderClosed: React.FC<IconProps> = (props) => (
  <SvgIcon {...props}>
    {p(
      'M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z',
      '1'
    )}
    {p('M2 10h20', '2')}
  </SvgIcon>
);

export const FolderOpen: React.FC<IconProps> = (props) => (
  <SvgIcon {...props}>
    {p(
      'm6 14 1.5-2.9A2 2 0 0 1 9.24 10H20a2 2 0 0 1 1.94 2.5l-1.54 6a2 2 0 0 1-1.95 1.5H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H18a2 2 0 0 1 2 2v2',
      '1'
    )}
  </SvgIcon>
);

export const History: React.FC<IconProps> = (props) => (
  <SvgIcon {...props}>
    {p('M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8', '1')}
    {p('M3 3v5h5', '2')}
    {p('M12 7v5l4 2', '3')}
  </SvgIcon>
);

export const Home: React.FC<IconProps> = (props) => (
  <SvgIcon {...props}>
    {p('m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z', '1')}
    {poly('9 22 9 12 15 12 15 22', '2')}
  </SvgIcon>
);

export const Layers: React.FC<IconProps> = (props) => (
  <SvgIcon {...props}>
    {p(
      'm12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z',
      '1'
    )}
    {p('m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65', '2')}
    {p('m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65', '3')}
  </SvgIcon>
);

export const Link2: React.FC<IconProps> = (props) => (
  <SvgIcon {...props}>
    {p('M9 17H7A5 5 0 0 1 7 7h2', '1')}
    {p('M15 7h2a5 5 0 1 1 0 10h-2', '2')}
    {line(8, 12, 16, 12, '3')}
  </SvgIcon>
);

export const Mail: React.FC<IconProps> = (props) => (
  <SvgIcon {...props}>
    {rect(2, 4, 20, 16, 2, '1')}
    {p('m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7', '2')}
  </SvgIcon>
);

export const Pencil: React.FC<IconProps> = (props) => (
  <SvgIcon {...props}>
    {p('M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z', '1')}
    {p('m15 5 4 4', '2')}
  </SvgIcon>
);

export const PenLine: React.FC<IconProps> = (props) => (
  <SvgIcon {...props}>
    {p('M12 20h9', '1')}
    {p('M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z', '2')}
  </SvgIcon>
);

export const RefreshCw: React.FC<IconProps> = (props) => (
  <SvgIcon {...props}>
    {p('M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8', '1')}
    {p('M21 3v5h-5', '2')}
    {p('M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16', '3')}
    {p('M8 16H3v5', '4')}
  </SvgIcon>
);

export const Send: React.FC<IconProps> = (props) => (
  <SvgIcon {...props}>
    {p('m22 2-7 20-4-9-9-4Z', '1')}
    {p('M22 2 11 13', '2')}
  </SvgIcon>
);

export const Trash2: React.FC<IconProps> = (props) => (
  <SvgIcon {...props}>
    {p('M3 6h18', '1')}
    {p('M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6', '2')}
    {p('M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2', '3')}
    {line(10, 11, 10, 17, '4')}
    {line(14, 11, 14, 17, '5')}
  </SvgIcon>
);

export const Upload: React.FC<IconProps> = (props) => (
  <SvgIcon {...props}>
    {p('M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4', '1')}
    {poly('17 8 12 3 7 8', '2')}
    {line(12, 3, 12, 15, '3')}
  </SvgIcon>
);

export const Wand2: React.FC<IconProps> = (props) => (
  <SvgIcon {...props}>
    {p('m21.64 3.64-1.28-1.28a1.21 1.21 0 0 0-1.72 0L2.36 18.64a1.21 1.21 0 0 0 0 1.72l1.28 1.28a1.2 1.2 0 0 0 1.72 0L21.64 5.36a1.2 1.2 0 0 0 0-1.72Z', '1')}
    {p('m14 7 3 3', '2')}
  </SvgIcon>
);

export const X: React.FC<IconProps> = (props) => (
  <SvgIcon {...props}>
    {p('M18 6 6 18', '1')}
    {p('m6 6 12 12', '2')}
  </SvgIcon>
);

export const User: React.FC<IconProps> = (props) => (
  <SvgIcon {...props}>
    {p('M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2', '1')}
    {c(12, 7, 4, '2')}
  </SvgIcon>
);

export const Settings: React.FC<IconProps> = (props) => (
  <SvgIcon {...props}>
    {c(12, 12, 3, '1')}
    {p(
      'M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z',
      '2'
    )}
  </SvgIcon>
);

export const Shield: React.FC<IconProps> = (props) => (
  <SvgIcon {...props}>
    {p('M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z')}
  </SvgIcon>
);

export const LogOut: React.FC<IconProps> = (props) => (
  <SvgIcon {...props}>
    {p('M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4', '1')}
    {poly('16 17 21 12 16 7', '2')}
    {line(21, 12, 9, 12, '3')}
  </SvgIcon>
);

export const Info: React.FC<IconProps> = (props) => (
  <SvgIcon {...props}>
    {c(12, 12, 10, '1')}
    {p('M12 16v-4', '2')}
    {p('M12 8h.01', '3')}
  </SvgIcon>
);

export const Cloud: React.FC<IconProps> = (props) => (
  <SvgIcon {...props}>
    {p('M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z')}
  </SvgIcon>
);

export const Smartphone: React.FC<IconProps> = (props) => (
  <SvgIcon {...props}>
    {rect(5, 2, 14, 20, 2, '1')}
    {p('M12 18h.01', '2')}
  </SvgIcon>
);

export const HelpCircle: React.FC<IconProps> = (props) => (
  <SvgIcon {...props}>
    {c(12, 12, 10, '1')}
    {p('M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3', '2')}
    {p('M12 17h.01', '3')}
  </SvgIcon>
);

export const Activity: React.FC<IconProps> = (props) => (
  <SvgIcon {...props}>
    {poly('22 12 18 12 15 21 9 3 6 12 2 12')}
  </SvgIcon>
);

export const KeyRound: React.FC<IconProps> = (props) => (
  <SvgIcon {...props}>
    {p('M2 18v3c0 .6.4 1 1 1h4v-3h3v-3h2l1.4-1.4a6.5 6.5 0 1 0-4-4Z', '1')}
    {c(16.5, 7.5, 0.5, '2')}
  </SvgIcon>
);

export const Award: React.FC<IconProps> = (props) => (
  <SvgIcon {...props}>
    {c(12, 8, 6, '1')}
    {p('M15.477 12.89 17 22l-5-3-5 3 1.523-9.11', '2')}
  </SvgIcon>
);

export const Plus: React.FC<IconProps> = (props) => (
  <SvgIcon {...props}>
    {line(12, 5, 12, 19, '1')}
    {line(5, 12, 19, 12, '2')}
  </SvgIcon>
);

export const Lock: React.FC<IconProps> = (props) => (
  <SvgIcon {...props}>
    {rect(3, 11, 18, 11, 2, '1')}
    {p('M7 11V7a5 5 0 0 1 10 0v4', '2')}
  </SvgIcon>
);
