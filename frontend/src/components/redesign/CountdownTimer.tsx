import { useEffect, useRef, useState } from 'react';
import { Box, Typography } from '@mui/material';
import { getUnifiedTokens } from '../../theme';

interface CountdownTimerProps {
  target: number;
  onEnd?: () => void;
}

const pad = (n: number) => String(n).padStart(2, '0');

function parts(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const d = Math.floor(total / 86400);
  const h = Math.floor((total % 86400) / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return `${pad(d)}:${pad(h)}:${pad(m)}:${pad(s)}`;
}

/** Cuenta regresiva en vivo (dd:hh:mm:ss). Llama onEnd al llegar a 0. */
export function CountdownTimer({ target, onEnd }: CountdownTimerProps) {
  const tokens = getUnifiedTokens(false);
  const [now, setNow] = useState(() => Date.now());
  const ended = useRef(false);

  const remaining = target - now;

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (remaining <= 0 && !ended.current) {
      ended.current = true;
      onEnd?.();
    }
  }, [remaining, onEnd]);

  return (
    <Box
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.5,
        bgcolor: tokens.secondaryContainer,
        color: tokens.onSecondary,
        px: 1.5,
        py: 0.5,
        borderRadius: '8px',
        fontWeight: 700,
        fontVariantNumeric: 'tabular-nums',
      }}
    >
      <Typography variant="caption" fontWeight={700} fontFamily="monospace">
        {parts(remaining)}
      </Typography>
    </Box>
  );
}
