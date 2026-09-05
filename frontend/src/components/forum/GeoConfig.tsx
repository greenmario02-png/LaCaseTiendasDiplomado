import { useEffect, useMemo, useState } from 'react';
import {
  Box, Typography, Button, TextField, Autocomplete, Slider, Chip, Alert, CircularProgress,
} from '@mui/material';
import MyLocationIcon from '@mui/icons-material/MyLocation';
import SaveIcon from '@mui/icons-material/Save';
import { listCities, resolveGeo } from '../../services/forum.api';
import type { ForumCity } from '../../services/forum.api';
import { getErrorMessage } from '../../services/api';
import { useForumStore } from '../../stores/forumStore';
import { MapPin } from 'lucide-react';
import { forumPalette } from '../../theme/forumTheme';

interface Props {
  compact?: boolean;
  onSaved?: () => void;
}

/** Configuración de zona del foro: selector de ciudad (agrupado por departamento) + radio + GPS.
 *  Componente compartido entre ForumProfilePage y el selector del navbar del foro (09-spec G5). */
export function GeoConfig({ compact = false, onSaved }: Props) {
  const { geo, cities, updateGeo } = useForumStore();
  const [allCities, setAllCities] = useState<ForumCity[]>([]);
  const [cityId, setCityId] = useState<number | null>(geo?.cityId ?? null);
  const [radioKm, setRadioKm] = useState<number>(geo?.radioKm ?? 25);
  const [locating, setLocating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (geo?.cityId) setCityId(geo.cityId);
    if (geo?.radioKm) setRadioKm(geo.radioKm);
  }, [geo]);

  useEffect(() => {
    listCities()
      .then(setAllCities)
      .catch(() => {});
  }, []);

  const grouped = useMemo(() => {
    const map: Record<string, ForumCity[]> = {};
    [...allCities]
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .forEach((c) => {
        (map[c.department] = map[c.department] ?? []).push(c);
      });
    return map;
  }, [allCities]);

  const selected = allCities.find((c) => c.id === cityId) ?? null;

  const useGps = () => {
    setLocating(true);
    setError('');
    if (!('geolocation' in navigator)) {
      setError('Tu navegador no soporta geolocalización.');
      setLocating(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords;
          const r = await resolveGeo(latitude, longitude);
          setCityId(r.cityId);
          setError('');
        } catch (e) {
          setError(getErrorMessage(e));
        } finally {
          setLocating(false);
        }
      },
      () => {
        setError('No pudimos obtener tu ubicación. Elegí tu ciudad manualmente.');
        setLocating(false);
      },
      { timeout: 10000 },
    );
  };

  const save = async () => {
    if (!cityId) {
      setError('Elegí tu ciudad.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await updateGeo({ cityId, radioKm });
      onSaved?.();
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box>
      <StackGeo cityId={cityId} grouped={grouped} onChange={setCityId} />

      <Box sx={{ mt: 2 }}>
        <Typography variant="caption" sx={{ color: forumPalette.textSecondary }}>
          Radio de la zona: <strong>{radioKm} km</strong>
        </Typography>
        <Slider
          value={radioKm}
          onChange={(_, v) => setRadioKm(Array.isArray(v) ? v[0] : (v as number))}
          min={5}
          max={200}
          step={5}
          valueLabelDisplay="auto"
          sx={{ color: forumPalette.accent }}
          disabled={saving}
        />
      </Box>

      {geo?.cityVerified && (
        <Chip icon={<MapPin size={13} strokeWidth={2.2} />} label="Verificada por GPS" size="small" sx={{ bgcolor: 'rgba(76,175,80,0.15)', color: '#4CAF50', fontWeight: 700, mb: 1 }} />
      )}

      {error && <Alert severity="error" sx={{ mb: 1, fontSize: '0.85rem' }}>{error}</Alert>}

      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 1 }}>
        <Button variant="outlined" startIcon={<MyLocationIcon />} onClick={useGps} disabled={locating || saving}
          sx={{ color: forumPalette.accent, borderColor: forumPalette.accent, textTransform: 'none' }}>
          {locating ? 'Buscando...' : 'Usar mi ubicación'}
        </Button>
        <Button variant="contained" startIcon={saving ? <CircularProgress size={14} color="inherit" /> : <SaveIcon />}
          onClick={save} disabled={saving || !cityId}
          sx={{ bgcolor: forumPalette.accent, '&:hover': { bgcolor: forumPalette.accentHover }, textTransform: 'none' }}>
          {saving ? 'Guardando...' : 'Guardar'}
        </Button>
      </Box>

      {!compact && selected && (
        <Typography variant="caption" sx={{ color: forumPalette.textMuted, display: 'block', mt: 1 }}>
          Ciudad: <strong>{selected.name}</strong> ({selected.department}) · radio estimado {selected.radiusKm} km
        </Typography>
      )}
    </Box>
  );
}

function StackGeo({ cityId, grouped, onChange }: {
  cityId: number | null;
  grouped: Record<string, ForumCity[]>;
  onChange: (id: number | null) => void;
}) {
  const options = Object.entries(grouped).flatMap(([department, cities]) =>
    cities.map((c) => ({ ...c, _department: department })),
  );
  return (
    <Autocomplete
      fullWidth
      size="small"
      value={options.find((o) => o.id === cityId) ?? null}
      onChange={(_, v) => onChange(v ? v.id : null)}
      options={options}
      groupBy={(o) => o._department}
      getOptionLabel={(o) => `${o.name} (${o.department})`}
      isOptionEqualToValue={(a, b) => a.id === b.id}
      renderInput={(params) => (
        <TextField {...params} label="Ciudad" placeholder="Elegí tu ciudad (ej: Oruro)"
          sx={{ '& fieldset': { borderColor: forumPalette.border } }} />
      )}
    />
  );
}
