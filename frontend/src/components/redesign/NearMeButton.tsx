import { Chip, CircularProgress } from '@mui/material';
import MyLocationIcon from '@mui/icons-material/MyLocation';
import { useLocationStore } from '../../stores/locationStore';
import { useUnifiedTokens } from '../../theme';

/** Botón/chip para activar "cerca de ti" con la ubicación del navegador (compartida con foro y tienda). */
export function NearMeButton() {
  const t = useUnifiedTokens();
  const { coords, city, status, request, clear } = useLocationStore();
  const asking = status === 'asking';

  if (coords) {
    return (
      <Chip
        icon={<MyLocationIcon />}
        label={city ? `Cerca de ${city}` : 'Cerca de tu ubicación'}
        onDelete={clear}
        sx={{ bgcolor: `${t.primary}1F`, color: t.primary, fontWeight: 700, '& .MuiChip-icon': { color: t.primary } }}
      />
    );
  }

  const label =
    status === 'denied' ? 'Ubicación bloqueada — activala en el navegador' : status === 'unavailable' ? 'No pudimos obtener tu ubicación' : 'Usar mi ubicación';

  return (
    <Chip
      clickable
      disabled={asking}
      onClick={() => void request()}
      icon={asking ? <CircularProgress size={14} /> : <MyLocationIcon />}
      label={asking ? 'Buscando…' : label}
      variant="outlined"
      sx={{ borderColor: t.primary, color: t.primary, fontWeight: 600, '& .MuiChip-icon': { color: t.primary } }}
    />
  );
}
