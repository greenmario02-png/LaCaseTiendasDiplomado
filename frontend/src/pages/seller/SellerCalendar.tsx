import CalendarView from '../../components/ui/CalendarView';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import { PageHeader, SurfaceCard } from '../../components/redesign/PageHeader';

export default function SellerCalendar() {
  return (
    <div>
      <PageHeader
        title="Calendario de mi tienda"
        subtitle="Promociones activas (rojo), cierre de subastas (morado) y ventas por día (verde) de tu tienda."
        icon={<CalendarMonthIcon />}
      />
      <SurfaceCard>
        <CalendarView endpoint="/seller/calendar-events" />
      </SurfaceCard>
    </div>
  );
}
