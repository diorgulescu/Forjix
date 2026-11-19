// SPDX-License-Identifier: GPL-3.0-or-later

import React from 'react';

interface IconProps {
  size?: number;
}

export const AnvilLogoIcon: React.FC<IconProps> = ({ size = 30 }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
    {/* Pixel Forge Sparks */}
    <rect x="4" y="4" width="2.5" height="2.5" fill="#FFE054" />
    <rect x="25" y="3" width="2.5" height="2.5" fill="#38F2FF" />
    <rect x="26" y="11" width="2" height="2" fill="#FF6B1A" />
    {/* Wooden Hammer Shaft & Golden Voxel Hammer Head */}
    <path
      d="M7 14L14 7L16.5 9.5L9.5 16.5L7 14Z"
      fill="#9A6230"
      stroke="#0F1320"
      strokeWidth="1.2"
      strokeLinejoin="round"
    />
    <path
      d="M12.5 4.5L17.5 3.5L22 8L21 13L16 14L11.5 9.5L12.5 4.5Z"
      fill="#FFD43B"
      stroke="#0F1320"
      strokeWidth="1.3"
      strokeLinejoin="round"
    />
    <rect x="15.5" y="7.5" width="2.5" height="2.5" fill="#38F2FF" />
    {/* Glowing Voxel Anvil */}
    <path
      d="M3 18.5H28V22H23L21 24.5H11L9 22H5.5L3 19.5V18.5Z"
      fill="#D8E6F8"
      stroke="#0F1320"
      strokeWidth="1.3"
      strokeLinejoin="round"
    />
    <rect x="12" y="19.5" width="8" height="2" rx="0.5" fill="#FF6B1A" />
    <rect x="14" y="19.5" width="4" height="1.2" fill="#FFE054" />
    <path
      d="M11 24.5H21L22.5 27H25.5V29.5H6.5V27H9.5L11 24.5Z"
      fill="#8B9BB4"
      stroke="#0F1320"
      strokeWidth="1.3"
      strokeLinejoin="round"
    />
  </svg>
);

export const VolumeOnIcon: React.FC<IconProps> = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path
      d="M11 5L6 9H3V15H6L11 19V5Z"
      stroke="currentColor"
      strokeWidth="2.1"
      strokeLinejoin="round"
    />
    <path
      d="M15.5 8.5C16.8 9.8 16.8 14.2 15.5 15.5M18.5 6C21.2 8.7 21.2 15.3 18.5 18"
      stroke="currentColor"
      strokeWidth="2.1"
      strokeLinecap="round"
    />
  </svg>
);

export const VolumeMuteIcon: React.FC<IconProps> = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path
      d="M11 5L6 9H3V15H6L11 19V5Z"
      stroke="currentColor"
      strokeWidth="2.1"
      strokeLinejoin="round"
    />
    <path
      d="M16 9L21 15M21 9L16 15"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
    />
  </svg>
);

export const Pixel2DIcon: React.FC<IconProps> = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <rect x="3" y="3" width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth="2.2" />
    <rect x="13" y="3" width="8" height="8" rx="1.5" fill="currentColor" fillOpacity="0.35" stroke="currentColor" strokeWidth="2.2" />
    <rect x="3" y="13" width="8" height="8" rx="1.5" fill="currentColor" fillOpacity="0.35" stroke="currentColor" strokeWidth="2.2" />
    <rect x="13" y="13" width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth="2.2" />
  </svg>
);

export const Cube3DIcon: React.FC<IconProps> = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path
      d="M12 2L21 7V17L12 22L3 17V7L12 2Z"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinejoin="round"
    />
    <path
      d="M12 22V12M12 12L21 7M12 12L3 7"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinejoin="round"
    />
  </svg>
);

export const HeartFullIcon: React.FC<IconProps> = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <path
      d="M2 5C2 3.3 3.3 2 5 2C6.3 2 7.4 2.8 8 3.9C8.6 2.8 9.7 2 11 2C12.7 2 14 3.3 14 5C14 8.6 8 13.5 8 13.5C8 13.5 2 8.6 2 5Z"
      fill="#FF3B5C"
      stroke="#8A1027"
      strokeWidth="1.3"
    />
    <rect x="4" y="4" width="2" height="2" rx="0.5" fill="#FF9EB0" />
  </svg>
);

export const HeartHalfIcon: React.FC<IconProps> = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <path
      d="M2 5C2 3.3 3.3 2 5 2C6.3 2 7.4 2.8 8 3.9C8.6 2.8 9.7 2 11 2C12.7 2 14 3.3 14 5C14 8.6 8 13.5 8 13.5C8 13.5 2 8.6 2 5Z"
      fill="#261A28"
      stroke="#5E3C52"
      strokeWidth="1.3"
    />
    <path
      d="M8 3.9C7.4 2.8 6.3 2 5 2C3.3 2 2 3.3 2 5C2 8.6 8 13.5 8 13.5V3.9Z"
      fill="#FF3B5C"
    />
    <rect x="4" y="4" width="2" height="2" rx="0.5" fill="#FF9EB0" />
  </svg>
);

export const DrumstickIcon: React.FC<{ size?: number; filled?: boolean }> = ({
  size = 16,
  filled = true,
}) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <path
      d="M9.5 2.5C11.7 2.5 13.5 4.3 13.5 6.5C13.5 8.7 11.7 10.5 9.5 10.5C8.6 10.5 7.8 10.2 7.1 9.7L4.5 12.3L3.7 11.5L6.3 8.9C5.8 8.2 5.5 7.4 5.5 6.5C5.5 4.3 7.3 2.5 9.5 2.5Z"
      fill={filled ? '#E07A2E' : '#262D42'}
      stroke={filled ? '#6E320C' : '#3E4A6B'}
      strokeWidth="1.2"
    />
    <circle cx="3.2" cy="12.8" r="1.4" fill={filled ? '#FFF3DC' : '#38425E'} />
    <circle cx="4.6" cy="13.4" r="1.2" fill={filled ? '#FFF3DC' : '#38425E'} />
  </svg>
);

export const SaveFileIcon: React.FC<IconProps> = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path
      d="M5 4H16L20 8V19C20 20.1 19.1 21 18 21H6C4.9 21 4 20.1 4 19V5C4 4.4 4.4 4 5 4Z"
      stroke="currentColor"
      strokeWidth="2.1"
      strokeLinejoin="round"
    />
    <path d="M8 4V9H15V4" stroke="currentColor" strokeWidth="2" />
    <rect x="8" y="13" width="8" height="5" rx="1" stroke="currentColor" strokeWidth="2" />
  </svg>
);

export const FolderOpenIcon: React.FC<IconProps> = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path
      d="M3 6C3 4.9 3.9 4 5 4H9L11 6H19C20.1 6 21 6.9 21 8V18C21 19.1 20.1 20 19 20H5C3.9 20 3 19.1 3 18V6Z"
      stroke="currentColor"
      strokeWidth="2.1"
      strokeLinejoin="round"
    />
  </svg>
);

export const PencilIcon: React.FC<IconProps> = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path
      d="M4 20H8L19 9L15 5L4 16V20Z"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path d="M13 7L17 11" stroke="currentColor" strokeWidth="2.2" />
  </svg>
);

export const EraserIcon: React.FC<IconProps> = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path
      d="M19 19H9L4 14L14 4L20 10L12 18"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path d="M8 10L14 16" stroke="currentColor" strokeWidth="2.2" />
  </svg>
);

export const BucketIcon: React.FC<IconProps> = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path
      d="M4 12L11 5L18 12L11 19L4 12Z"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinejoin="round"
    />
    <path
      d="M8 5L11 2"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
    />
    <path
      d="M19 15C19 15 21.5 17.5 21.5 19C21.5 20.4 20.4 21.5 19 21.5C17.6 21.5 16.5 20.4 16.5 19C16.5 17.5 19 15 19 15Z"
      fill="currentColor"
    />
  </svg>
);

export const EyedropperIcon: React.FC<IconProps> = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path
      d="M14 6L18 10M16 4L20 8L17 11L13 7L16 4ZM13 7L5 15V19H9L17 11"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const MirrorXIcon: React.FC<IconProps> = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path
      d="M12 3V21"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeDasharray="3 3"
      strokeLinecap="round"
    />
    <path
      d="M8 7L3 12L8 17V7Z"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinejoin="round"
    />
    <path
      d="M16 7L21 12L16 17V7Z"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinejoin="round"
    />
  </svg>
);

export const MirrorYIcon: React.FC<IconProps> = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path
      d="M3 12H21"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeDasharray="3 3"
      strokeLinecap="round"
    />
    <path
      d="M7 8L12 3L17 8H7Z"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinejoin="round"
    />
    <path
      d="M7 16L12 21L17 16H7Z"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinejoin="round"
    />
  </svg>
);

export const UndoIcon: React.FC<IconProps> = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path
      d="M9 14L4 9L9 4"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M4 9H14.5C17.8 9 20.5 11.7 20.5 15C20.5 18.3 17.8 20 14.5 20H11"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
    />
  </svg>
);

export const RedoIcon: React.FC<IconProps> = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path
      d="M15 14L20 9L15 4"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M20 9H9.5C6.2 9 3.5 11.7 3.5 15C3.5 18.3 6.2 20 9.5 20H13"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
    />
  </svg>
);

export const GridIcon: React.FC<IconProps> = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <rect
      x="3"
      y="3"
      width="18"
      height="18"
      rx="2"
      stroke="currentColor"
      strokeWidth="2"
    />
    <path d="M9 3V21M15 3V21M3 9H21M3 15H21" stroke="currentColor" strokeWidth="1.8" />
  </svg>
);

export const HandBlockIcon: React.FC<IconProps> = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <rect
      x="4"
      y="10"
      width="8"
      height="11"
      rx="1.5"
      stroke="currentColor"
      strokeWidth="2.2"
    />
    <path
      d="M12 13L19 6L21 8L14 15"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const ResetCameraIcon: React.FC<IconProps> = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2.2" />
    <path
      d="M12 3V6M12 18V21M3 12H6M18 12H21"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
    />
  </svg>
);
