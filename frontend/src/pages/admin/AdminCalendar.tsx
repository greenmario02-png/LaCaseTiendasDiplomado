import { Box, Typography } from '@mui/material';
import CalendarView from '../../components/ui/CalendarView';

export default function AdminCalendar() {
  return (
    <Box>
      <Typography variant="h5" fontWeight={700} mb={2}>
        Calendario de ventas, promociones y subastas
      </Typography>
      <Typography variant="body2" color="text.secondary" mb={3}>
        Vista mensual de todas las tiendas: promociones activas (rojo), cierre de subastas (morado) y ventas por día (verde).
      </Typography>
      <CalendarView endpoint="/admin/calendar-events" />
    </Box>
  );
}
