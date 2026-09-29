import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import { useTranslation } from 'react-i18next';
import CalendarView from '../../components/ui/CalendarView';
import { PageHeader } from '../../components/redesign/PageHeader';

export default function AdminCalendar() {
  const { t } = useTranslation();
  return (
    <>
      <PageHeader
        title={t('admin.calendar.title')}
        subtitle={t('admin.calendar.subtitle')}
        icon={<CalendarMonthIcon />}
      />
      <CalendarView endpoint="/admin/calendar-events" />
    </>
  );
}
