import { Box, Typography } from '@mui/material';
import CalendarView from '../../components/ui/CalendarView';

export default function SellerCalendar() {
  return (
    <Box>
      <Typography variant="h5" fontWeight={700} mb={2}>
        Calendario de mi tienda
      </Typography>
      <Typography variant="body2" color="text.secondary" mb={3}>
        Promociones activas (rojo), cierre de subastas (morado) y ventas por día (verde) de tu tienda.
      </Typography>
      <CalendarView endpoint="/seller/calendar-events" />
    </Box>
  );
}
