import { Box, Container, Typography } from '@mui/material';
import { PrimaryButton } from '../components/redesign/Buttons';

export default function NotFoundPage() {
  return (
    <Container maxWidth="sm" sx={{ py: 10, textAlign: 'center' }}>
      <Typography variant="h1" fontWeight={800} color="primary">
        404
      </Typography>
      <Typography variant="h5" mb={2}>
        Página no encontrada
      </Typography>
      <Typography color="text.secondary" mb={3}>
        La página que buscás no existe o fue movida.
      </Typography>
      <PrimaryButton to="/">Volver al inicio</PrimaryButton>
    </Container>
  );
}
