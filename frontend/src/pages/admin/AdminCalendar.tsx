import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import CalendarView from '../../components/ui/CalendarView';
import { PageHeader } from '../../components/redesign/PageHeader';

export default function AdminCalendar() {
  return (
    <>
      <PageHeader
        title="Calendario de ventas, promociones y subastas"
        subtitle="Vista mensual de todas las tiendas: promociones activas (rojo), cierre de subastas (morado) y ventas por día (verde)."
        icon={<CalendarMonthIcon />}
      />
      <CalendarView endpoint="/admin/calendar-events" />
    </>
  );
}
