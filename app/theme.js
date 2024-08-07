import { createTheme } from '@mui/material/styles';

const light_theme = createTheme({
  typography: {
    fontFamily: [
      'Arial, sans-serif',
    ],
  }
});

// Light theme
export const lightTheme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
  typography: {
    fontFamily: 'Arial, sans-serif',
  },
});

// Dark theme
export const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#90caf9',
    },
    secondary: {
      main: '#f48fb1',
    },
  },
  typography: {
    fontFamily: 'Arial, sans-serif',
  },
});

export default light_theme;