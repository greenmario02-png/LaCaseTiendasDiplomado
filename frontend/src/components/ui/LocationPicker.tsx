import { useEffect, useState } from 'react';
import { Box, TextField, Paper, Chip, Stack, Button, CircularProgress, Typography } from '@mui/material';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import SearchIcon from '@mui/icons-material/Search';
import LocationOnIcon from '@mui/icons-material/LocationOn';

// Fix de iconos por defecto de Leaflet en bundlers
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

const defaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});
L.Marker.prototype.options.icon = defaultIcon;

export interface LocationPoint {
  lat: number;
  lng: number;
  label: string;
}

// Componente que actualiza el centro del mapa cuando cambia lat/lng
function Recenter({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => {
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      map.setView([lat, lng], map.getZoom());
    }
  }, [lat, lng]);
  return null;
}

// Captura el click para marcar la ubicación
function ClickMarker({ onChange, value }: { onChange: (p: LocationPoint) => void; value: LocationPoint | null }) {
  useMapEvents({
    click(e) {
      onChange({ lat: e.latlng.lat, lng: e.latlng.lng, label: 'Punto seleccionado' });
    },
  });
  return value ? <Marker position={[value.lat, value.lng]} /> : null;
}

interface Props {
  value: LocationPoint | null;
  onChange: (p: LocationPoint | null) => void;
  countryHint?: string;
}

export default function LocationPicker({ value, onChange, countryHint = '' }: Props) {
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<LocationPoint[]>([]);
  const [center, setCenter] = useState<{ lat: number; lng: number }>(
    value ? { lat: value.lat, lng: value.lng } : { lat: -16.5, lng: -68.15 } // Bolivia por defecto
  );

  const search = async () => {
    if (!query.trim()) return;
    setSearching(true);
    setResults([]);
    try {
      const q = `${query}${countryHint ? `, ${countryHint}` : ''}`;
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=6&q=${encodeURIComponent(q)}`);
      const data = await res.json();
      const mapped = (data as any[]).map((d) => ({
        lat: Number(d.lat),
        lng: Number(d.lon),
        label: d.display_name,
      }));
      setResults(mapped);
      if (mapped.length > 0) setCenter({ lat: mapped[0].lat, lng: mapped[0].lng });
    } catch {
      // sin resultados
    } finally {
      setSearching(false);
    }
  };

  return (
    <Box>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} mb={1}>
        <TextField
          size="small"
          fullWidth
          placeholder="Buscar ciudad o dirección..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && search()}
        />
        <Button variant="outlined" onClick={search} startIcon={searching ? <CircularProgress size={16} /> : <SearchIcon />}>
          Buscar
        </Button>
      </Stack>

      {results.length > 0 && (
        <Stack spacing={0.5} mb={1}>
          {results.map((r, i) => (
            <Chip
              key={i}
              label={r.label}
              onClick={() => {
                onChange({ lat: r.lat, lng: r.lng, label: r.label });
                setCenter({ lat: r.lat, lng: r.lng });
                setResults([]);
              }}
              icon={<LocationOnIcon />}
              sx={{ justifyContent: 'flex-start' }}
            />
          ))}
        </Stack>
      )}

      <Paper variant="outlined" sx={{ height: 300, overflow: 'hidden' }}>
        <MapContainer
          center={[center.lat, center.lng]}
          zoom={value ? 13 : 5}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <Recenter lat={center.lat} lng={center.lng} />
          <ClickMarker value={value} onChange={onChange} />
        </MapContainer>
      </Paper>
      <Typography color="text.secondary" sx={{ mt: 0.5 }}>
        {value ? `📍 ${value.label} (${value.lat.toFixed(5)}, ${value.lng.toFixed(5)}) — toque el mapa para ajustar` : 'Hacé clic en el mapa para marcar la ubicación de tu tienda.'}
      </Typography>
    </Box>
  );
}
