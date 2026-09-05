import { Box, Typography } from '@mui/material';
import { EmptyState } from '../../components/redesign/States';

export default function OrgPedidosPage() {
  return (
    <Box>
      <Typography variant="h5" fontWeight={800} gutterBottom>
        Pedidos
      </Typography>
      <EmptyState message="Esta sección del organizador estará disponible con el backend de eventos (Fase 5-6 del plan)." />
    </Box>
  );
}
