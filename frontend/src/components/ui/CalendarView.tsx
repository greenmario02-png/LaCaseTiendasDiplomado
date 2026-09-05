import { useEffect, useRef, useState } from 'react';
import { Calendar, type CalendarRef } from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/react/daygrid';
import classicThemePlugin from '@fullcalendar/react/themes/classic';
import interactionPlugin from '@fullcalendar/react/interaction';
import '@fullcalendar/react/skeleton.css';
import '@fullcalendar/react/themes/classic/theme.css';
import '@fullcalendar/react/themes/classic/palette.css';
import {
  Box,
  Paper,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  CircularProgress,
} from '@mui/material';
import { api, getErrorMessage } from '../../services/api';
import toast from 'react-hot-toast';

interface CalendarEventData {
  id: string;
  title: string;
  start: string;
  end?: string;
  allDay?: boolean;
  backgroundColor?: string;
  extendedProps?: {
    type?: 'promotion' | 'auction' | 'sales';
    discount?: string;
    current?: number;
    count?: number;
    total?: number;
  };
}

interface CalendarViewProps {
  endpoint: '/admin/calendar-events' | '/seller/calendar-events';
}

const LEGEND: Array<{ label: string; color: string }> = [
  { label: 'Promociones', color: '#f0320a' },
  { label: 'Subastas', color: '#9c27b0' },
  { label: 'Ventas por día', color: '#00d12a' },
];

export default function CalendarView({ endpoint }: CalendarViewProps) {
  const calendarRef = useRef<CalendarRef | null>(null);
  const [events, setEvents] = useState<CalendarEventData[]>([]);
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<CalendarEventData | null>(null);

  // Cargar eventos al cambiar el rango visible
  const loadEvents = async (from: Date, to: Date) => {
    setLoading(true);
    try {
      const { data } = await api.get(endpoint, {
        params: {
          from: from.toISOString(),
          to: to.toISOString(),
        },
      });
      setEvents(data.data.events ?? []);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  // Cargar eventos iniciales (mes actual)
  useEffect(() => {
    const now = new Date();
    loadEvents(new Date(now.getFullYear(), now.getMonth(), 1), new Date(now.getFullYear(), now.getMonth() + 1, 1));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endpoint]);

  return (
    <Box>
      <Paper sx={{ p: 2, mb: 2 }}>
        <Box display="flex" alignItems="center" gap={2} flexWrap="wrap">
          {LEGEND.map((l) => (
            <Box key={l.label} display="flex" alignItems="center" gap={0.5}>
              <Box sx={{ width: 14, height: 14, borderRadius: 1, backgroundColor: l.color }} />
              <Typography variant="caption">{l.label}</Typography>
            </Box>
          ))}
          {loading && <CircularProgress size={16} />}
        </Box>
      </Paper>
      <Paper sx={{ p: 2 }}>
        <Calendar
          ref={calendarRef}
          plugins={[dayGridPlugin, classicThemePlugin, interactionPlugin]}
          initialView="dayGridMonth"
          locale="es"
          height="auto"
          events={events as any}
          eventClick={(info) => {
            const ev = info.event;
            setDetail({
              id: ev.id,
              title: ev.title,
              start: ev.start?.toISOString() ?? new Date().toISOString(),
              end: ev.end?.toISOString(),
              extendedProps: (ev.extendedProps ?? {}) as CalendarEventData['extendedProps'],
            });
          }}
          datesSet={(info) => {
            if (info.start && info.end) loadEvents(info.start, info.end);
          }}
        />
      </Paper>

      <Dialog open={Boolean(detail)} onClose={() => setDetail(null)} fullWidth maxWidth="xs">
        {detail && (
          <>
            <DialogTitle>{detail.title}</DialogTitle>
            <DialogContent dividers>
              {detail.extendedProps?.type === 'promotion' && (
                <>
                  <Typography variant="body2">Tipo: Promoción</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Descuento: {detail.extendedProps.discount ?? '—'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Inicio: {new Date(detail.start).toLocaleDateString('es-BO')} · Fin:{' '}
                    {detail.end ? new Date(detail.end).toLocaleDateString('es-BO') : '—'}
                  </Typography>
                </>
              )}
              {detail.extendedProps?.type === 'auction' && (
                <>
                  <Typography variant="body2">Tipo: Subasta</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Cierre: {new Date(detail.start).toLocaleString('es-BO')}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Precio actual: Bs {Number(detail.extendedProps.current ?? 0).toLocaleString('es-BO')}
                  </Typography>
                </>
              )}
              {detail.extendedProps?.type === 'sales' && (
                <>
                  <Typography variant="body2">Tipo: Ventas del día</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Órdenes: {detail.extendedProps.count ?? 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total: Bs {Number(detail.extendedProps.total ?? 0).toLocaleString('es-BO')}
                  </Typography>
                </>
              )}
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setDetail(null)}>Cerrar</Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  );
}
