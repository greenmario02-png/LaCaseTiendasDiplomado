import { Box, Typography } from '@mui/material';
import { PrimaryButton } from '../../components/redesign/Buttons';
import { EmptyState } from '../../components/redesign/States';
import { useNavigate } from 'react-router-dom';

export default function EventWizardPage() {
  const navigate = useNavigate();
  return (
    <Box>
      <Typography variant="h5" fontWeight={800} gutterBottom>
        Crear evento
      </Typography>
      <EmptyState
        message="El asistente de creación de eventos (4 pasos: Datos → Entradas → Preguntas → Publicar) estará disponible con el backend de eventos."
        action={<PrimaryButton onClick={() => navigate('/organizador')}>Volver a mis eventos</PrimaryButton>}
      />
    </Box>
  );
}
