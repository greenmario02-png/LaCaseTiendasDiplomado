import { Box, Button, CircularProgress, Stack, Typography } from '@mui/material';

export interface EmptyStateProps {
  message: string;
  action?: React.ReactNode;
}

export function EmptyState({ message, action }: EmptyStateProps) {
  return (
    <Stack alignItems="center" spacing={1} sx={{ py: 6, color: 'text.secondary' }}>
      <Typography variant="h4">🗂️</Typography>
      <Typography>{message}</Typography>
      {action}
    </Stack>
  );
}

export function LoadingState() {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
      <CircularProgress role="progressbar" />
    </Box>
  );
}

export interface ErrorStateProps {
  message: string;
  onRetry?: () => void;
}

export function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <Stack alignItems="center" spacing={1} sx={{ py: 6, color: 'error.main' }}>
      <Typography variant="h4">⚠️</Typography>
      <Typography>{message}</Typography>
      {onRetry && (
        <Button variant="outlined" onClick={onRetry} sx={{ textTransform: 'none' }}>
          Reintentar
        </Button>
      )}
    </Stack>
  );
}
