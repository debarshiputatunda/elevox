import { createTheme, type ThemeOptions } from '@mui/material/styles';

export const palette = {
  main: '#FF7F11',
  sage: '#ACBFA4',
  cream: '#E2E8CE',
  charcoal: '#262626',
} as const;

export const darkPalette = {
  black: '#000000',
  deep: '#0B192C',
  muted: '#1E3E62',
  accent: '#FF6500',
} as const;

export const FONT_SANS = '"Inter", "Roboto", "Helvetica", "Arial", sans-serif';
export const FONT_MONO = '"Roboto Mono", "Courier New", monospace';
export const CARD_SHADOW = '0 1px 3px rgba(0,0,0,0.08)';
export const CONTENT_MAX_WIDTH = 1440;
export const SIDEBAR_BREAKPOINT = 'lg' as const;

const breakpoints: ThemeOptions['breakpoints'] = {
  values: {
    xs: 0,
    sm: 480,
    md: 768,
    lg: 992,
    xl: 1440,
  },
};

const typography: ThemeOptions['typography'] = {
  fontFamily: FONT_SANS,
  h4: { fontWeight: 700, fontSize: '1.75rem', letterSpacing: '-0.02em' },
  h5: { fontWeight: 700, fontSize: '1.35rem', letterSpacing: '-0.015em' },
  h6: { fontWeight: 600, fontSize: '1.1rem' },
  subtitle1: { fontWeight: 600 },
  subtitle2: { fontWeight: 600 },
  button: { fontWeight: 600, textTransform: 'none' },
  body1: { fontSize: '0.95rem' },
  body2: { fontSize: '0.875rem' },
  caption: { fontSize: '0.75rem' },
};

const sharedComponents: ThemeOptions['components'] = {
  MuiCssBaseline: {
    styleOverrides: {
      html: { overflowX: 'hidden' },
      body: { overflowX: 'hidden' },
      '#root': { minWidth: 0, overflowX: 'hidden' },
    },
  },
  MuiButton: {
    defaultProps: { disableElevation: true },
    styleOverrides: {
      root: {
        textTransform: 'none',
        fontWeight: 600,
        borderRadius: 10,
        minHeight: 40,
        px: 2,
      },
      sizeSmall: { minHeight: 36 },
      sizeLarge: { minHeight: 48 },
    },
  },
  MuiIconButton: {
    styleOverrides: {
      root: {
        borderRadius: 10,
      },
      sizeSmall: {
        width: 36,
        height: 36,
      },
    },
  },
  MuiCard: {
    styleOverrides: {
      root: {
        boxShadow: CARD_SHADOW,
        backgroundImage: 'none',
        overflow: 'hidden',
      },
    },
  },
  MuiPaper: {
    styleOverrides: {
      rounded: { borderRadius: 10 },
    },
  },
  MuiDialog: {
    styleOverrides: {
      paper: { borderRadius: 10 },
    },
  },
  MuiChip: {
    styleOverrides: {
      root: { borderRadius: 10, fontWeight: 600 },
      label: { px: 1 },
    },
  },
  MuiOutlinedInput: {
    styleOverrides: {
      root: { borderRadius: 10 },
    },
  },
  MuiFilledInput: {
    styleOverrides: {
      root: { borderRadius: 10 },
    },
  },
  MuiAlert: {
    styleOverrides: {
      root: { borderRadius: 10 },
    },
  },
  MuiTab: {
    styleOverrides: {
      root: {
        textTransform: 'none',
        fontWeight: 600,
        minHeight: 44,
      },
    },
  },
  MuiTabs: {
    styleOverrides: {
      root: { minHeight: 44 },
    },
  },
  MuiTooltip: {
    defaultProps: { arrow: true },
  },
  MuiLink: {
    defaultProps: { underline: 'hover' },
  },
  MuiTableCell: {
    styleOverrides: {
      head: { fontWeight: 600 },
    },
  },
  MuiListItemButton: {
    styleOverrides: {
      root: {
        borderRadius: 10,
        '&.Mui-selected': {
          fontWeight: 600,
        },
      },
    },
  },
  MuiSlider: {
    styleOverrides: {
      thumb: { width: 20, height: 20 },
      rail: { height: 8, borderRadius: 4, opacity: 1 },
      track: { height: 8, borderRadius: 4 },
    },
  },
  MuiButtonBase: {
    styleOverrides: {
      root: {
        '&.Mui-focusVisible': {
          outline: '2px solid',
          outlineOffset: 2,
        },
      },
    },
  },
};

const baseTheme: ThemeOptions = {
  breakpoints,
  typography,
  shape: { borderRadius: 10 },
  spacing: 8,
  components: sharedComponents,
};

export const lightTheme = createTheme({
  ...baseTheme,
  palette: {
    mode: 'light',
    primary: { main: palette.main, light: '#FFA04D', dark: '#CC6600', contrastText: '#FFFFFF' },
    secondary: { main: palette.sage, light: palette.cream, dark: '#8FA888' },
    success: { main: palette.sage, contrastText: palette.charcoal },
    warning: { main: palette.main },
    error: { main: '#D32F2F' },
    info: { main: '#1E3E62' },
    background: { default: palette.cream, paper: '#FFFFFF' },
    text: { primary: palette.charcoal, secondary: '#5C5C5C' },
    divider: 'rgba(38, 38, 38, 0.12)',
  },
});

export const darkTheme = createTheme({
  ...baseTheme,
  palette: {
    mode: 'dark',
    primary: { main: darkPalette.accent, light: '#FF8533', dark: '#CC5100', contrastText: '#FFFFFF' },
    secondary: { main: darkPalette.muted, light: '#2A5282', dark: darkPalette.deep },
    success: { main: '#7BC67E' },
    warning: { main: darkPalette.accent },
    error: { main: '#EF5350' },
    info: { main: '#90CAF9' },
    background: { default: darkPalette.deep, paper: darkPalette.muted },
    text: { primary: '#F5F5F5', secondary: '#B0BEC5' },
    divider: 'rgba(245, 245, 245, 0.12)',
  },
  components: {
    ...sharedComponents,
    MuiCssBaseline: {
      styleOverrides: {
        html: { overflowX: 'hidden' },
        body: { overflowX: 'hidden' },
        '#root': { minWidth: 0, overflowX: 'hidden' },
      },
    },
    MuiButtonBase: {
      styleOverrides: {
        root: {
          '&.Mui-focusVisible': {
            outline: '2px solid #FF6500',
            outlineOffset: 2,
          },
        },
      },
    },
  },
});
