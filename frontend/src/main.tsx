import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import 'dayjs/locale/es';
import App from './App';
import ErrorBoundary from './components/ErrorBoundary';
import { useThemeStore } from './stores/themeStore';
import { ensureSessionId } from './stores/cartStore';
import { buildTheme } from './theme';
import './index.css';

ensureSessionId();

function Root() {
  const darkMode = useThemeStore((s) => s.darkMode);
  const theme = buildTheme(darkMode);
  return (
    <StrictMode>
      <ErrorBoundary>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="es">
            <BrowserRouter>
              <App />
            </BrowserRouter>
          </LocalizationProvider>
          <Toaster position="top-right" toastOptions={{ duration: 3000 }} />
        </ThemeProvider>
      </ErrorBoundary>
    </StrictMode>
  );
}

createRoot(document.getElementById('root')!).render(<Root />);
