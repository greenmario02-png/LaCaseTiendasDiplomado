import { useEffect, useMemo, useState } from 'react';
import { Box, Typography, Fade } from '@mui/material';
import CampaignIcon from '@mui/icons-material/Campaign';
import lacaseDice from '../../data/lacaseDice.json';

const MENSAJES: string[] = lacaseDice as string[];
const CANTIDAD_EN_ROTACION = 30;
const INTERVALO_MS = 6000;

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

/**
 * Letrero "LaCase dice:" — muestra UN mensaje a la vez, con fade, y lo cambia cada
 * `INTERVALO_MS` (a diferencia del letrero de divisas, que es un ticker continuo).
 */
export function LaCaseDiceBanner() {
  const mensajes = useMemo(() => pickRandom(MENSAJES, CANTIDAD_EN_ROTACION), []);
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (mensajes.length === 0) return;
    const id = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setIndex((i) => (i + 1) % mensajes.length);
        setVisible(true);
      }, 300);
    }, INTERVALO_MS);
    return () => clearInterval(id);
  }, [mensajes.length]);

  if (mensajes.length === 0) return null;

  return (
    <Box
      sx={{
        bgcolor: 'primary.dark',
        color: 'white',
        py: 0.75,
        px: 2,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 1,
        minHeight: 36,
        textAlign: 'center',
      }}
    >
      <CampaignIcon fontSize="small" sx={{ flexShrink: 0 }} />
      <Fade in={visible} timeout={300}>
        <Typography variant="body2" component="span" noWrap sx={{ maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          <strong>LaCase dice:</strong> {mensajes[index]}
        </Typography>
      </Fade>
    </Box>
  );
}

export default LaCaseDiceBanner;
