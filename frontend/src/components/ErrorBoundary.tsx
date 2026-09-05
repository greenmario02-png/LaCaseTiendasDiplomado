import { Component, ErrorInfo, ReactNode } from 'react';
import { Box, Typography, Button, Paper } from '@mui/material';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  message: string;
}

/**
 * Error boundary global: evita que un error en un componente rompa toda la app.
 * Patrón 2026: cada error se aísla y se muestra una pantalla de recuperación.
 */
export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary]', error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh" p={3}>
          <Paper sx={{ p: 5, textAlign: 'center', maxWidth: 480 }}>
            <ErrorOutlineIcon sx={{ fontSize: 64, color: 'error.main', mb: 2 }} />
            <Typography variant="h5" fontWeight={700} mb={1}>
              Algo salió mal
            </Typography>
            <Typography variant="body2" color="text.secondary" mb={3}>
              Ocurrió un error inesperado. Recargá la página para continuar.
            </Typography>
            <Button variant="contained" color="primary" onClick={this.handleReload}>
              Recargar aplicación
            </Button>
          </Paper>
        </Box>
      );
    }

    return this.props.children;
  }
}
