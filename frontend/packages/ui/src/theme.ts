// Vilokanam Design System
// Based on modern streaming platform aesthetics

export const colors = {
  // Primary colors (using.twitch-inspired purple as base)
  primary: {
    50: '#f5f3ff',
    100: '#ede9fe',
    200: '#ddd6fe',
    300: '#c4b5fd',
    400: '#a78bfa',
    500: '#8b5cf6', // Main primary color (purple)
    600: '#7c3aed',
    700: '#6d28d9',
    800: '#5b21b6',
    900: '#4c1d95',
  },
  
  // Secondary colors (complementary colors)
  secondary: {
    50: '#f0f9ff',
    100: '#e0f2fe',
    200: '#bae6fd',
    300: '#7dd3fc',
    400: '#38bdf8',
    500: '#0ea5e9',
    600: '#0284c7',
    700: '#0369a1',
    800: '#075985',
    900: '#0c4a6e',
  },
  
  // Accent colors
  accent: {
    green: '#10b981', // Success/emerald
    yellow: '#f59e0b', // Warning/amber
    red: '#ef4444', // Danger/red
    pink: '#ec4899', // Pink accent
  },
  
  // Neutrals
  neutral: {
    50: '#fafafa',
    100: '#f5f5f5',
    200: '#e5e5e5',
    300: '#d4d4d4',
    400: '#a3a3a3',
    500: '#737373',
    600: '#525252',
    700: '#404040',
    800: '#262626',
    900: '#171717',
  },
  
  // Backgrounds
  background: {
    dark: '#0e0e10', // Dark background for streaming
    darker: '#000000', // Pure black
    light: '#ffffff', // White background
    card: '#1f1f23', // Card background
    overlay: 'rgba(0, 0, 0, 0.7)', // Overlay for modals
  },
  
  // Text
  text: {
    primary: '#ffffff', // Primary text (white)
    secondary: '#adadb8', // Secondary text
    muted: '#71717a', // Muted text
    dark: '#18181b', // Dark text
  },
  
  // Status
  status: {
    live: '#ef4444', // Live indicator (red)
    offline: '#71717a', // Offline indicator
    online: '#10b981', // Online status (green)
  },
  
  // Social
  social: {
    twitch: '#8b5cf6',
    youtube: '#ff0000',
    twitter: '#1da1f2',
    discord: '#5865f2',
  }
};

export const spacing = {
  xs: '0.25rem', // 4px
  sm: '0.5rem', // 8px
  md: '1rem', // 16px
  lg: '1.5rem', // 24px
  xl: '2rem', // 32px
  '2xl': '3rem', // 48px
  '3xl': '4rem', // 64px
};

export const borderRadius = {
  sm: '0.25rem', // 4px
  md: '0.5rem', // 8px
  lg: '0.75rem', // 12px
  xl: '1rem', // 16px
  full: '9999px',
};

export const boxShadow = {
  sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
  lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
  xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
  '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
  inner: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)',
  none: 'none',
};

export const typography = {
  fontFamily: {
    sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'sans-serif'],
    mono: ['Roboto Mono', 'ui-monospace', 'monospace'],
  },
  fontSize: {
    xs: '0.75rem', // 12px
    sm: '0.875rem', // 14px
    base: '1rem', // 16px
    lg: '1.125rem', // 18px
    xl: '1.25rem', // 20px
    '2xl': '1.5rem', // 24px
    '3xl': '1.875rem', // 30px
    '4xl': '2.25rem', // 36px
    '5xl': '3rem', // 48px
    '6xl': '3.75rem', // 60px
    '7xl': '4.5rem', // 72px
  },
  fontWeight: {
    thin: '100',
    extralight: '200',
    light: '300',
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
    extrabold: '800',
    black: '900',
  },
  lineHeight: {
    none: '1',
    tight: '1.25',
    snug: '1.375',
    normal: '1.5',
    relaxed: '1.625',
    loose: '2',
  }
};

export const breakpoints = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
};

export const zIndex = {
  auto: 'auto',
  0: '0',
  10: '10',
  20: '20',
  30: '30',
  40: '40',
  50: '50',
};

// Component-specific styles
export const components = {
  button: {
    variants: {
      primary: {
        backgroundColor: colors.primary[600],
        color: colors.text.primary,
        hoverBackgroundColor: colors.primary[700],
        focusRingColor: colors.primary[500],
      },
      secondary: {
        backgroundColor: colors.secondary[600],
        color: colors.text.primary,
        hoverBackgroundColor: colors.secondary[700],
        focusRingColor: colors.secondary[500],
      },
      danger: {
        backgroundColor: colors.accent.red,
        color: colors.text.primary,
        hoverBackgroundColor: '#dc2626',
        focusRingColor: '#f87171',
      },
      outline: {
        backgroundColor: 'transparent',
        color: colors.text.primary,
        borderColor: colors.neutral[600],
        hoverBackgroundColor: colors.neutral[800],
        focusRingColor: colors.primary[500],
      },
      ghost: {
        backgroundColor: 'transparent',
        color: colors.text.primary,
        hoverBackgroundColor: colors.neutral[800],
        focusRingColor: colors.primary[500],
      }
    },
    sizes: {
      sm: {
        padding: `${spacing.xs} ${spacing.sm}`,
        fontSize: typography.fontSize.sm,
        borderRadius: borderRadius.sm,
      },
      md: {
        padding: `${spacing.sm} ${spacing.md}`,
        fontSize: typography.fontSize.base,
        borderRadius: borderRadius.md,
      },
      lg: {
        padding: `${spacing.md} ${spacing.lg}`,
        fontSize: typography.fontSize.lg,
        borderRadius: borderRadius.lg,
      }
    }
  },
  
  card: {
    backgroundColor: colors.background.card,
    borderColor: colors.neutral[800],
    borderRadius: borderRadius.lg,
    boxShadow: boxShadow.md,
  },
  
  header: {
    backgroundColor: colors.background.dark,
    borderColor: colors.neutral[800],
    height: '4rem', // 64px
  },
  
  stream: {
    liveIndicator: {
      backgroundColor: colors.status.live,
      color: colors.text.primary,
      borderRadius: borderRadius.full,
      padding: `${spacing.xs} ${spacing.sm}`,
      fontSize: typography.fontSize.xs,
      fontWeight: typography.fontWeight.bold,
    },
    thumbnail: {
      borderRadius: borderRadius.md,
      aspectRatio: '16/9',
    }
  }
};

export default {
  colors,
  spacing,
  borderRadius,
  boxShadow,
  typography,
  breakpoints,
  zIndex,
  components
};