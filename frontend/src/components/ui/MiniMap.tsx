import { Box, Button, Typography, Paper } from '@mui/material';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import DirectionsIcon from '@mui/icons-material/Directions';
import LocationOffIcon from '@mui/icons-material/LocationOff';
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

const defaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});
L.Marker.prototype.options.icon = defaultIcon;

interface Props {
  lat?: number | null;
  lng?: number | null;
  storeName?: string;
  locationVerified?: boolean;
}

export default function MiniMap({ lat, lng, storeName = 'Tienda', locationVerified }: Props) {
  const hasLocation = Number.isFinite(Number(lat)) && Number.isFinite(Number(lng)) && Number(lat) !== 0 && Number(lng) !== 0;

  if (!hasLocation) {
    return (
      <Paper variant="outlined" sx={{ p: 3, textAlign: 'center', bgcolor: '#fafafa' }}>
        <LocationOffIcon color="disabled" sx={{ fontSize: 40 }} />
        <Typography color="text.secondary" mt={1}>
          Ubicación no especificada
        </Typography>
        <Typography variant="caption" color="text.disabled">
          La tienda aún no marcó su ubicación en el mapa.
        </Typography>
      </Paper>
    );
  }

  const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;

  return (
    <Box>
      <Paper variant="outlined" sx={{ height: 220, overflow: 'hidden' }}>
        <MapContainer center={[Number(lat), Number(lng)]} zoom={14} style={{ height: '100%', width: '100%' }}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <Marker position={[Number(lat), Number(lng)]}>
            <Popup>
              {storeName}
              {locationVerified ? ' 📍 (verificada)' : ''}
            </Popup>
          </Marker>
        </MapContainer>
      </Paper>
      <Button
        fullWidth
        variant="contained"
        color="success"
        startIcon={<DirectionsIcon />}
        href={mapsUrl}
        target="_blank"
        rel="noopener"
        sx={{ mt: 1 }}
      >
        Cómo llegar (Google Maps)
      </Button>
    </Box>
  );
}
