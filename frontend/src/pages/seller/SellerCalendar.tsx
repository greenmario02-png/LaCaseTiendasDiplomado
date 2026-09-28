import { useTranslation } from 'react-i18next';
import CalendarView from '../../components/ui/CalendarView';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import { PageHeader, SurfaceCard } from '../../components/redesign/PageHeader';

export default function SellerCalendar() {
  const { t } = useTranslation();
  return (
    <div>
      <PageHeader
        title={t('seller.calendar.title')}
        subtitle={t('seller.calendar.subtitle')}
        icon={<CalendarMonthIcon />}
      />
      <SurfaceCard>
        <CalendarView endpoint="/seller/calendar-events" />
      </SurfaceCard>
    </div>
  );
}
