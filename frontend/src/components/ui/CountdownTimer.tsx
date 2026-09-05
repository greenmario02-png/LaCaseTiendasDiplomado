import { useEffect, useState } from 'react';
import { Box, Typography } from '@mui/material';

interface CountdownTimerProps {
  targetDate: string | Date;
  compact?: boolean;
}

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  expired: boolean;
}

function getTimeLeft(target: Date): TimeLeft {
  const diff = target.getTime() - Date.now();
  if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0, expired: true };
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  const seconds = Math.floor((diff % 60000) / 1000);
  return { days, hours, minutes, seconds, expired: false };
}

const pad = (n: number) => String(n).padStart(2, '0');

/**
 * Cuenta regresiva reutilizable para promociones y subastas (C5).
 * targetDate: fecha de fin (ISO string o Date). Si expiró muestra "Finalizado".
 */
export default function CountdownTimer({ targetDate, compact = false }: CountdownTimerProps) {
  const [left, setLeft] = useState<TimeLeft>(() => getTimeLeft(new Date(targetDate)));

  useEffect(() => {
    const t = setInterval(() => setLeft(getTimeLeft(new Date(targetDate))), 1000);
    return () => clearInterval(t);
  }, [targetDate]);

  if (left.expired) {
    return (
      <Typography variant={compact ? 'caption' : 'body2'} color="text.disabled">
        Finalizado
      </Typography>
    );
  }

  if (compact) {
    return (
      <Typography variant="caption" sx={{ fontWeight: 700, color: 'error.main' }}>
        {left.days > 0 ? `${left.days}d ` : ''}
        {pad(left.hours)}:{pad(left.minutes)}:{pad(left.seconds)}
      </Typography>
    );
  }

  const units = [
    { label: 'días', value: left.days },
    { label: 'horas', value: pad(left.hours) },
    { label: 'min', value: pad(left.minutes) },
    { label: 'seg', value: pad(left.seconds) },
  ];

  return (
    <Box display="flex" gap={0.75} alignItems="center">
      {units.map((u) => (
        <Box
          key={u.label}
          sx={{
            bgcolor: 'rgba(240, 50, 10, 0.1)',
            border: '1px solid rgba(240, 50, 10, 0.3)',
            borderRadius: 1.5,
            px: 1,
            py: 0.5,
            textAlign: 'center',
            minWidth: 44,
          }}
        >
          <Typography variant="h6" fontWeight={800} lineHeight={1.1} color="error.main">
            {u.value}
          </Typography>
          <Typography variant="caption" color="text.secondary" lineHeight={1}>
            {u.label}
          </Typography>
        </Box>
      ))}
    </Box>
  );
}
