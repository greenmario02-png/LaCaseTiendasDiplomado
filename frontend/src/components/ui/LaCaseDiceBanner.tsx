import { useMemo } from 'react';
import { Box, Typography } from '@mui/material';
import CampaignIcon from '@mui/icons-material/Campaign';
import lacaseDice from '../../data/lacaseDice.json';

const MENSAJES: string[] = lacaseDice as string[];
const CANTIDAD_EN_LETRERO = 25;

function pickRandom(list: string[], count: number): string[] {
  const pool = [...list];
  const picked: string[] = [];
  for (let i = 0; i < count && pool.length > 0; i++) {
    const idx = Math.floor(Math.random() * pool.length);
    picked.push(pool[idx]);
    pool.splice(idx, 1);
  }
  return picked;
}

/** Letrero LED con frases de "LaCase dice:" — mismo patrón visual que el ticker de cotizaciones. */
export function LaCaseDiceBanner() {
  const mensajes = useMemo(() => pickRandom(MENSAJES, CANTIDAD_EN_LETRERO), []);

  if (mensajes.length === 0) return null;

  return (
    <Box
      sx={{
        bgcolor: 'primary.dark',
        color: 'white',
        overflow: 'hidden',
        position: 'relative',
        py: 0.75,
      }}
    >
      <Box
        sx={{
          display: 'flex',
          gap: 4,
          width: 'max-content',
          animation: 'lacaseDiceTicker 60s linear infinite',
          whiteSpace: 'nowrap',
          '@keyframes lacaseDiceTicker': { '0%': { transform: 'translateX(0)' }, '100%': { transform: 'translateX(-50%)' } },
        }}
      >
        {[...mensajes, ...mensajes].map((mensaje, i) => (
          <Box key={i} display="flex" alignItems="center" gap={1} sx={{ minWidth: 'max-content' }}>
            <CampaignIcon fontSize="small" />
            <Typography variant="body2" component="span">
              <strong>LaCase dice:</strong> {mensaje}
            </Typography>
          </Box>
        ))}
      </Box>
    </Box>
  );
}

export default LaCaseDiceBanner;
