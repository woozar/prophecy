'use client';

import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import Image from 'next/image';

import { useUser } from '@/hooks/useUser';

type AvatarSize = 'sm' | 'md' | 'lg' | 'xl';
export type AvatarEffect = 'glow' | 'particles' | 'lightning' | 'halo' | 'none';

interface UserData {
  username: string;
  displayName?: string | null;
  avatarUrl?: string | null;
  avatarEffect?: string | null;
  avatarEffectColors?: string[];
}

export type UserAvatarProps = {
  /** Size of the avatar */
  size?: AvatarSize;
  /** Additional CSS classes */
  className?: string;
} & ({ userId: string } | { user: UserData });

/** Props for AvatarPreview - used for previews in editors */
export interface AvatarPreviewProps {
  /** Username to generate initials from */
  username: string;
  /** Optional display name (used for initials if provided) */
  displayName?: string | null;
  /** Avatar image URL */
  avatarUrl?: string | null;
  /** Avatar effect type */
  avatarEffect?: AvatarEffect | null;
  /** Avatar effect colors (animation picks randomly) */
  avatarEffectColors?: string[];
  /** Size of the avatar */
  size?: AvatarSize;
  /** Additional CSS classes */
  className?: string;
}

const sizeClasses: Record<AvatarSize, string> = {
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-12 h-12 text-base',
  xl: 'w-16 h-16 text-xl',
};

const sizePx: Record<AvatarSize, number> = {
  sm: 32,
  md: 40,
  lg: 48,
  xl: 64,
};

const EFFECT_COLORS: Record<string, { glow: string; particle: string; hex: string }> = {
  cyan: { glow: 'shadow-cyan-500/60', particle: 'bg-cyan-400', hex: '#22d3ee' },
  teal: { glow: 'shadow-teal-500/60', particle: 'bg-teal-400', hex: '#2dd4bf' },
  violet: { glow: 'shadow-violet-500/60', particle: 'bg-violet-400', hex: '#a78bfa' },
  emerald: { glow: 'shadow-emerald-500/60', particle: 'bg-emerald-400', hex: '#34d399' },
  rose: { glow: 'shadow-rose-500/60', particle: 'bg-rose-400', hex: '#fb7185' },
  amber: { glow: 'shadow-amber-500/60', particle: 'bg-amber-400', hex: '#fbbf24' },
  blue: { glow: 'shadow-blue-500/60', particle: 'bg-blue-400', hex: '#60a5fa' },
  pink: { glow: 'shadow-pink-500/60', particle: 'bg-pink-400', hex: '#f472b6' },
};

/**
 * Generate a consistent color based on a string
 */
function getColorFromString(str: string): string {
  const colors = [
    'bg-cyan-500/30 text-cyan-300 border-cyan-500/50',
    'bg-violet-500/30 text-violet-300 border-violet-500/50',
    'bg-green-500/30 text-green-300 border-green-500/50',
    'bg-amber-500/30 text-amber-300 border-amber-500/50',
    'bg-rose-500/30 text-rose-300 border-rose-500/50',
    'bg-blue-500/30 text-blue-300 border-blue-500/50',
    'bg-teal-500/30 text-teal-300 border-teal-500/50',
    'bg-pink-500/30 text-pink-300 border-pink-500/50',
  ];

  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (str.codePointAt(i) ?? 0) + ((hash << 5) - hash);
  }

  return colors[Math.abs(hash) % colors.length];
}

/**
 * Get initials from a name
 */
function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    const lastPart = parts.at(-1) ?? '';
    return (parts[0][0] + lastPart[0]).toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
}

type Sparkle = {
  id: number;
  angle: number;
  distance: number;
  size: number;
  color: string;
  createdAt: number;
};

const SPARKLE_LIFETIME = 700; // ms

function updateSparklesWithNew(
  prev: Sparkle[],
  newSparkle: Sparkle,
  maxSparkles: number
): Sparkle[] {
  const now = newSparkle.createdAt;
  const filtered = prev.filter((s) => now - s.createdAt < SPARKLE_LIFETIME);
  const limited = filtered.slice(-maxSparkles + 1);
  return [...limited, newSparkle];
}

interface SparkleElementProps {
  sparkle: Sparkle;
  currentTime: number;
  center: number;
  offset: number;
  size: number;
}

/**
 * Single sparkle element with 4-point star shape
 */
const SparkleElement = memo(function SparkleElement({
  sparkle,
  currentTime,
  center,
  offset,
  size,
}: SparkleElementProps) {
  const age = currentTime - sparkle.createdAt;
  const opacity = Math.max(0, 1 - age / SPARKLE_LIFETIME);
  const rad = (sparkle.angle * Math.PI) / 180;
  const x = center + offset + Math.cos(rad) * sparkle.distance;
  const y = center + offset + Math.sin(rad) * sparkle.distance;
  const colorHex = EFFECT_COLORS[sparkle.color]?.hex || '#22d3ee';
  const s = sparkle.size;

  return (
    <g style={{ opacity }}>
      {/* 4-point star shape */}
      <path
        d={`M ${x} ${y - s} L ${x + s * 0.3} ${y - s * 0.3} L ${x + s} ${y} L ${x + s * 0.3} ${y + s * 0.3} L ${x} ${y + s} L ${x - s * 0.3} ${y + s * 0.3} L ${x - s} ${y} L ${x - s * 0.3} ${y - s * 0.3} Z`}
        fill={colorHex}
        filter={`url(#sparkle-glow-${size})`}
      />
      {/* Bright center */}
      <circle cx={x} cy={y} r={s * 0.3} fill="#ffffff" style={{ opacity: 0.9 }} />
    </g>
  );
});

/**
 * Sparkle effect wrapper - twinkling stars around the avatar
 */
const SparkleWrapper = memo(function SparkleWrapper({
  children,
  colors,
  size,
}: {
  children: React.ReactNode;
  colors: string[];
  size: number;
}) {
  const maxSparkles = size >= 48 ? 8 : 6;
  const idCounterRef = useRef(0);
  const [sparkles, setSparkles] = useState<Sparkle[]>([]);
  const [currentTime, setCurrentTime] = useState(() => Date.now());

  // Create new sparkles
  useEffect(() => {
    const createSparkle = () => {
      const now = Date.now();
      const angle = Math.random() * 360;
      const distance = size / 2 + 2 + Math.random() * 8;
      const sparkleSize = 2 + Math.random() * 3;
      const color = colors[Math.floor(Math.random() * colors.length)] || 'cyan';

      const newSparkle: Sparkle = {
        id: idCounterRef.current++,
        angle,
        distance,
        size: sparkleSize,
        color,
        createdAt: now,
      };
      setSparkles((prev) => updateSparklesWithNew(prev, newSparkle, maxSparkles));
    };

    // Initial sparkles
    createSparkle();
    const t1 = setTimeout(createSparkle, 150);
    const t2 = setTimeout(createSparkle, 300);

    const interval = setInterval(createSparkle, 400);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearInterval(interval);
    };
  }, [colors, size, maxSparkles]);

  // Animation loop for opacity updates
  useEffect(() => {
    const animationInterval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 50);
    return () => clearInterval(animationInterval);
  }, []);

  const center = size / 2;
  const svgSize = size + 24;
  const offset = 12;

  const visibleSparkles = sparkles.filter((s) => currentTime - s.createdAt < SPARKLE_LIFETIME);

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg
        className="absolute pointer-events-none"
        width={svgSize}
        height={svgSize}
        style={{
          top: -offset,
          left: -offset,
          overflow: 'visible',
        }}
      >
        <defs>
          <filter id={`sparkle-glow-${size}`} x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="1.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        {visibleSparkles.map((sparkle) => (
          <SparkleElement
            key={sparkle.id}
            sparkle={sparkle}
            currentTime={currentTime}
            center={center}
            offset={offset}
            size={size}
          />
        ))}
      </svg>
      {children}
    </div>
  );
});

/**
 * Lightning effect wrapper - renders bolts around the avatar
 */
const LightningWrapper = memo(function LightningWrapper({
  children,
  colors,
  size,
}: {
  children: React.ReactNode;
  colors: string[];
  size: number;
}) {
  const [isVisible, setIsVisible] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [currentColor, setCurrentColor] = useState(colors[0] || 'cyan');

  useEffect(() => {
    const interval = setInterval(() => {
      // Blitz kurz anzeigen, dann ausblenden
      setIsVisible(true);
      setRotation(Math.random() * 360); // Zufällige Position
      setCurrentColor(colors[Math.floor(Math.random() * colors.length)] || 'cyan');

      // Nach 150ms ausblenden
      setTimeout(() => setIsVisible(false), 150);
    }, 800);
    return () => clearInterval(interval);
  }, [colors]);

  const svgSize = size + 40;
  const offset = 20;
  const svgCenter = svgSize / 2;

  // Blitz-Pfad der direkt am Avatar-Rand beginnt
  const lightningPath = useMemo(() => {
    // Startpunkt: oberer Rand des Avatars (vom SVG-Mittelpunkt aus gesehen)
    const startY = svgCenter - size / 2;

    // Zickzack-Blitz nach außen (nach oben = negative Y-Richtung)
    return `M ${svgCenter} ${startY}
            L ${svgCenter + 4} ${startY - 4}
            L ${svgCenter - 3} ${startY - 8}
            L ${svgCenter + 5} ${startY - 12}
            L ${svgCenter - 2} ${startY - 16}`;
  }, [size, svgCenter]);

  const colorHex = EFFECT_COLORS[currentColor]?.hex || '#22d3ee';

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg
        className="absolute pointer-events-none"
        width={svgSize}
        height={svgSize}
        style={{
          top: -offset,
          left: -offset,
          overflow: 'visible',
        }}
      >
        <defs>
          <filter id={`lightning-glow-${size}`} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <g transform={`rotate(${rotation} ${svgSize / 2} ${svgSize / 2})`}>
          {/* Glow layer */}
          <path
            d={lightningPath}
            fill="none"
            stroke={colorHex}
            strokeWidth={isVisible ? 4 : 0}
            strokeLinecap="square"
            strokeLinejoin="miter"
            style={{
              opacity: isVisible ? 0.6 : 0,
              filter: `blur(3px)`,
            }}
          />
          {/* Main bolt */}
          <path
            d={lightningPath}
            fill="none"
            stroke={colorHex}
            strokeWidth={isVisible ? 2 : 0}
            strokeLinecap="square"
            strokeLinejoin="miter"
            filter={`url(#lightning-glow-${size})`}
            style={{
              opacity: isVisible ? 1 : 0,
            }}
          />
          {/* Bright core */}
          <path
            d={lightningPath}
            fill="none"
            stroke="#ffffff"
            strokeWidth={isVisible ? 1 : 0}
            strokeLinecap="square"
            strokeLinejoin="miter"
            style={{
              opacity: isVisible ? 0.8 : 0,
            }}
          />
        </g>
      </svg>
      {children}
    </div>
  );
});

/**
 * Glow effect wrapper
 */
const GlowWrapper = memo(function GlowWrapper({
  children,
  colors,
}: {
  children: React.ReactNode;
  colors: string[];
}) {
  const [currentColorIndex, setCurrentColorIndex] = useState(0);

  useEffect(() => {
    if (colors.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentColorIndex((prev) => (prev + 1) % colors.length);
    }, 2000);
    return () => clearInterval(interval);
  }, [colors.length]);

  const currentColor = colors[currentColorIndex] || 'cyan';
  const colorHex = EFFECT_COLORS[currentColor]?.hex || '#22d3ee';

  const glowStyle = useMemo(
    () => ({
      '--avatar-glow-color': colorHex,
    }),
    [colorHex]
  ) as React.CSSProperties;

  return (
    <div
      className="animate-avatar-pulse-glow rounded-full transition-shadow duration-1000"
      style={glowStyle}
    >
      {children}
    </div>
  );
});

type HaloSparkle = {
  id: number;
  angle: number;
  color: string;
  createdAt: number;
};

const HALO_SPARKLE_LIFETIME = 600; // ms

interface HaloSparkleElementProps {
  sparkle: HaloSparkle;
  currentTime: number;
  centerX: number;
  centerY: number;
  haloWidth: number;
  haloHeight: number;
  size: number;
  fallbackColorHex: string;
}

/**
 * Single sparkle element on the halo ring
 */
const HaloSparkleElement = memo(function HaloSparkleElement({
  sparkle,
  currentTime,
  centerX,
  centerY,
  haloWidth,
  haloHeight,
  size,
  fallbackColorHex,
}: HaloSparkleElementProps) {
  const age = currentTime - sparkle.createdAt;
  const opacity = Math.max(0, 1 - age / HALO_SPARKLE_LIFETIME);
  const rad = (sparkle.angle * Math.PI) / 180;

  const x = centerX + Math.cos(rad) * (haloWidth / 2);
  const y = centerY + Math.sin(rad) * (haloHeight / 2);
  const sparkleColorHex = EFFECT_COLORS[sparkle.color]?.hex || fallbackColorHex;

  return (
    <g style={{ opacity }}>
      <circle
        cx={x}
        cy={y}
        r={2}
        fill={sparkleColorHex}
        filter={`url(#halo-sparkle-glow-${size})`}
      />
      <circle cx={x} cy={y} r={0.8} fill="#ffffff" style={{ opacity: 0.9 }} />
    </g>
  );
});

/**
 * Halo effect wrapper - renders a glowing halo ring above the avatar
 */
const HaloWrapper = memo(function HaloWrapper({
  children,
  colors,
  size,
}: {
  children: React.ReactNode;
  colors: string[];
  size: number;
}) {
  const [currentColorIndex, setCurrentColorIndex] = useState(0);
  const [pulsePhase, setPulsePhase] = useState(0);
  const [sparkles, setSparkles] = useState<HaloSparkle[]>([]);
  const [currentTime, setCurrentTime] = useState(() => Date.now());
  const idCounterRef = useRef(0);

  // Color cycling
  useEffect(() => {
    if (colors.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentColorIndex((prev) => (prev + 1) % colors.length);
    }, 2000);
    return () => clearInterval(interval);
  }, [colors.length]);

  // Pulse animation
  useEffect(() => {
    const interval = setInterval(() => {
      setPulsePhase((prev) => (prev + 0.05) % (Math.PI * 2));
    }, 50);
    return () => clearInterval(interval);
  }, []);

  // Sparkle creation along the halo
  useEffect(() => {
    const createSparkle = () => {
      const now = Date.now();
      const angle = Math.random() * 360;
      const color = colors[Math.floor(Math.random() * colors.length)] || 'cyan';

      const newSparkle: HaloSparkle = {
        id: idCounterRef.current++,
        angle,
        color,
        createdAt: now,
      };

      const isSparkleActive = (s: HaloSparkle) => now - s.createdAt < HALO_SPARKLE_LIFETIME;

      setSparkles((prev) => [...prev.filter(isSparkleActive).slice(-5), newSparkle]);
    };

    createSparkle();
    const interval = setInterval(createSparkle, 300);
    return () => clearInterval(interval);
  }, [colors]);

  // Animation loop for sparkle opacity
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 50);
    return () => clearInterval(interval);
  }, []);

  const currentColor = colors[currentColorIndex] || 'cyan';
  const colorHex = EFFECT_COLORS[currentColor]?.hex || '#22d3ee';

  // Halo dimensions
  const haloWidth = size * 0.9;
  const haloHeight = size * 0.25; // Perspectively flattened
  const haloOffsetY = -size * 0.45; // Position well above avatar head

  const svgSize = size + 40;
  const offset = 20;
  const centerX = svgSize / 2;
  const centerY = svgSize / 2 + haloOffsetY;

  // Pulse opacity (0.4 to 0.9)
  const pulseOpacity = 0.65 + Math.sin(pulsePhase) * 0.25;

  const visibleSparkles = sparkles.filter((s) => currentTime - s.createdAt < HALO_SPARKLE_LIFETIME);

  return (
    <div className="relative" style={{ width: size, height: size }}>
      {children}
      <svg
        className="absolute pointer-events-none"
        width={svgSize}
        height={svgSize}
        style={{
          top: -offset,
          left: -offset,
          overflow: 'visible',
          zIndex: 10,
        }}
      >
        <defs>
          <filter id={`halo-glow-${size}`} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id={`halo-sparkle-glow-${size}`} x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="1" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Outer glow layer */}
        <ellipse
          cx={centerX}
          cy={centerY}
          rx={haloWidth / 2 + 2}
          ry={haloHeight / 2 + 1}
          fill="none"
          stroke={colorHex}
          strokeWidth={4}
          style={{
            opacity: pulseOpacity * 0.3,
            filter: 'blur(4px)',
          }}
        />

        {/* Main halo ring */}
        <ellipse
          cx={centerX}
          cy={centerY}
          rx={haloWidth / 2}
          ry={haloHeight / 2}
          fill="none"
          stroke={colorHex}
          strokeWidth={2.5}
          filter={`url(#halo-glow-${size})`}
          style={{
            opacity: pulseOpacity,
            transition: 'stroke 1s ease-in-out',
          }}
        />

        {/* Bright core */}
        <ellipse
          cx={centerX}
          cy={centerY}
          rx={haloWidth / 2}
          ry={haloHeight / 2}
          fill="none"
          stroke="#ffffff"
          strokeWidth={1}
          style={{
            opacity: pulseOpacity * 0.6,
          }}
        />

        {/* Sparkles along the halo */}
        {visibleSparkles.map((sparkle) => (
          <HaloSparkleElement
            key={sparkle.id}
            sparkle={sparkle}
            currentTime={currentTime}
            centerX={centerX}
            centerY={centerY}
            haloWidth={haloWidth}
            haloHeight={haloHeight}
            size={size}
            fallbackColorHex={colorHex}
          />
        ))}
      </svg>
    </div>
  );
});

/**
 * AvatarImage - Internal component for avatar image with loading state
 * Using a separate component allows React to reset state when key (src) changes
 */
const AvatarImage = memo(function AvatarImage({
  src,
  alt,
  pixelSize,
  priority,
  initials,
}: {
  src: string;
  alt: string;
  pixelSize: number;
  priority: boolean;
  initials: string;
}) {
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  const handleImageError = useCallback(() => {
    setImageError(true);
  }, []);

  const handleImageLoad = useCallback(() => {
    setImageLoaded(true);
  }, []);

  if (imageError) {
    return <span>{initials}</span>;
  }

  return (
    <>
      <Image
        src={src}
        alt={alt}
        fill
        sizes={`${pixelSize}px`}
        className={`object-cover transition-opacity duration-200 ${
          imageLoaded ? 'opacity-100' : 'opacity-0'
        }`}
        onError={handleImageError}
        onLoad={handleImageLoad}
        priority={priority}
      />
      {!imageLoaded && <span className="opacity-50">{initials}</span>}
    </>
  );
});

/**
 * AvatarPreview - Renders avatar with given data (for previews in editors)
 */
export const AvatarPreview = memo(function AvatarPreview({
  username,
  displayName,
  avatarUrl,
  avatarEffect,
  avatarEffectColors = [],
  size = 'md',
  className = '',
}: Readonly<AvatarPreviewProps>) {
  const name = displayName || username || 'Unknown';
  const initials = getInitials(name);
  const colorClass = getColorFromString(username);
  const sizeClass = sizeClasses[size];
  const pixelSize = sizePx[size];

  const effectColors = useMemo(() => {
    return avatarEffectColors.length > 0 ? avatarEffectColors : ['cyan'];
  }, [avatarEffectColors]);

  const effect = avatarEffect || 'none';

  // Use a separate component for the image to manage loading state per-URL
  const avatarContent = (
    <div
      className={`${sizeClass} rounded-full flex items-center justify-center font-medium border relative overflow-hidden ${
        avatarUrl ? 'border-white/20' : colorClass
      } ${className}`}
      title={name}
    >
      {avatarUrl ? (
        <AvatarImage
          key={avatarUrl}
          src={avatarUrl}
          alt={name}
          pixelSize={pixelSize}
          priority={size === 'xl' || size === 'lg'}
          initials={initials}
        />
      ) : (
        <span>{initials}</span>
      )}
    </div>
  );

  // Wrap with effect wrappers
  if (effect === 'glow') {
    return <GlowWrapper colors={effectColors}>{avatarContent}</GlowWrapper>;
  }

  if (effect === 'particles') {
    return (
      <SparkleWrapper colors={effectColors} size={pixelSize}>
        {avatarContent}
      </SparkleWrapper>
    );
  }

  if (effect === 'lightning') {
    return (
      <LightningWrapper colors={effectColors} size={pixelSize}>
        {avatarContent}
      </LightningWrapper>
    );
  }

  if (effect === 'halo') {
    return (
      <HaloWrapper colors={effectColors} size={pixelSize}>
        {avatarContent}
      </HaloWrapper>
    );
  }

  return avatarContent;
});

/**
 * UserAvatar - Displays a user's avatar
 * Can be used with either userId (fetches from store) or user object (direct data)
 */
export const UserAvatar = memo(function UserAvatar(props: Readonly<UserAvatarProps>) {
  const { size = 'md', className = '' } = props;

  // Get user from store if userId is provided
  const userFromStore = useUser('userId' in props ? props.userId : undefined);

  // Use provided user data or store data
  const user = 'user' in props && props.user ? props.user : userFromStore;

  // User not found - show placeholder
  if (!user) {
    const sizeClass = sizeClasses[size];
    return (
      <div
        className={`${sizeClass} rounded-full flex items-center justify-center font-medium border bg-gray-500/30 text-gray-300 border-gray-500/50 ${className}`}
        title="Unbekannt"
      >
        <span>?</span>
      </div>
    );
  }

  return (
    <AvatarPreview
      username={user.username}
      displayName={user.displayName}
      avatarUrl={user.avatarUrl}
      avatarEffect={user.avatarEffect as AvatarEffect | null}
      avatarEffectColors={user.avatarEffectColors || []}
      size={size}
      className={className}
    />
  );
});
