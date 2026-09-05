import { Box, Typography } from '@mui/material';
import { EmptyState } from '../../components/redesign/States';

export default function OrgEstadisticasPage() {
  return (
    <Box>
      <Typography variant="h5" fontWeight={800} gutterBottom>
        Estadisticas
      </Typography>
      <EmptyState message="Esta sección del organizador estará disponible con el backend de eventos (Fase 5-6 del plan)." />
    </Box>
  );
}
