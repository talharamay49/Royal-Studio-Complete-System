import React from 'react';

// Official Royal Studio Brand Assets — Uses the exact uploaded /RoyalLogo.png and /logo.png assets AS-IS
export const ROYAL_LOGO_DATA_URL = '/RoyalLogo.png';
export const ROYAL_MARK_DATA_URL = '/RoyalLogo.png';

export const RoyalLogo: React.FC<{ className?: string; height?: number; src?: string }> = ({
  className = 'h-12',
  height,
  src = '/RoyalLogo.png',
}) => {
  return (
    <img
      src={src}
      alt="Royal Studio Official Logo"
      style={height ? { height: `${height}px` } : undefined}
      className={`inline-block select-none object-contain ${className}`}
      onError={(e) => {
        const target = e.currentTarget as HTMLImageElement;
        if (!target.src.endsWith('/RoyalLogo.png')) {
          target.src = '/RoyalLogo.png';
        }
      }}
    />
  );
};

export const RoyalMark: React.FC<{ className?: string; src?: string }> = ({
  className = 'h-10',
  src = '/RoyalLogo.png',
}) => {
  return (
    <img
      src={src}
      alt="Royal Studio Official Emblem"
      className={`inline-block select-none object-contain ${className}`}
      onError={(e) => {
        const target = e.currentTarget as HTMLImageElement;
        if (!target.src.endsWith('/RoyalLogo.png')) {
          target.src = '/RoyalLogo.png';
        }
      }}
    />
  );
};

export const BrandLogoLockup: React.FC<{
  theme?: 'light' | 'dark';
  size?: 'sm' | 'md' | 'lg';
  src?: string;
}> = ({ size = 'md', src = '/RoyalLogo.png' }) => {
  const sizeClass = size === 'sm' ? 'h-9' : size === 'lg' ? 'h-14' : 'h-11';
  return (
    <img
      src={src}
      alt="Royal Studio"
      className={`inline-block select-none object-contain ${sizeClass} w-auto`}
      onError={(e) => {
        const target = e.currentTarget as HTMLImageElement;
        if (!target.src.endsWith('/RoyalLogo.png')) {
          target.src = '/RoyalLogo.png';
        }
      }}
    />
  );
};

export const CameraApertureGraphic: React.FC<{ className?: string }> = ({ className = 'w-12 h-12' }) => {
  return (
    <img
      src="/RoyalLogo.png"
      alt="Royal Studio"
      className={`inline-block select-none object-contain ${className}`}
    />
  );
};
