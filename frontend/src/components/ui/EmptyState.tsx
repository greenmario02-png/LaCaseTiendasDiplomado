import { Box, Typography } from '@mui/material';
import SentimentDissatisfiedIcon from '@mui/icons-material/SentimentDissatisfied';

interface Props {
  message?: string;
  action?: React.ReactNode;
}

export default function EmptyState({ message = 'No se encontraron resultados', action }: Props) {
  return (
    <Box sx={{ textAlign: 'center', py: 8 }}>
      <SentimentDissatisfiedIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
      <Typography variant="h6" color="text.secondary">
        {message}
      </Typography>
      {action && <Box mt={2}>{action}</Box>}
    </Box>
  );
}
