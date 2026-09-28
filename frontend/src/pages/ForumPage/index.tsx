import { useEffect, useState } from 'react';
import { Box, Chip, Button, Dialog, DialogTitle, DialogContent, DialogActions, Alert, IconButton, Tooltip } from '@mui/material';
import { Outlet } from 'react-router-dom';
import ChangeCircleIcon from '@mui/icons-material/ChangeCircle';
import { MapPin, Check, SlidersHorizontal } from 'lucide-react';
import ForumSidebarLeft from '../../components/forum/ForumSidebarLeft';
import ForumSidebarRight from '../../components/forum/ForumSidebarRight';
import { GeoConfig } from '../../components/forum/GeoConfig';
import { useForumStore } from '../../stores/forumStore';
import { useForumPalette } from '../../theme/forumTheme';
import { useUnifiedTokens } from '../../theme';

export default function ForumPage() {
  const forumPalette = useForumPalette();
  const t = useUnifiedTokens();
  const { geo, geoLoaded, fetchGeoSession } = useForumStore();
  const [cityOpen, setCityOpen] = useState(false);

  useEffect(() => {
    if (!geoLoaded) fetchGeoSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Box sx={{ position: 'relative', minHeight: 'calc(100vh - 64px)', color: forumPalette.textPrimary, overflow: 'hidden', bgcolor: t.background }}>
      <Box sx={{ position: 'relative', zIndex: 1, display: 'flex', minHeight: 'calc(100vh - 64px)' }}>
        {/* Sidebar izquierdo: navegación, categorías, ciudades */}
        <ForumSidebarLeft />
        {/* Feed / detalle */}
        <Box sx={{ flex: 1, minWidth: 0, maxWidth: 860, mx: 'auto', width: '100%', p: { xs: 1, md: 2 } }}>
          {/* Barra de ciudad (carga única por sesión) */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1, flexWrap: 'wrap' }}>
            {geo?.cityId ? (
              <>
                <Chip
                  icon={<MapPin size={13} strokeWidth={2.2} />}
                  label={geo.cityVerified ? `${geo.city ?? 'Mi ciudad'} (verificada)` : geo.city ?? 'Mi ciudad'}
                  size="small"
                  sx={{ color: forumPalette.amarillo, fontWeight: 700, bgcolor: `${t.secondaryContainer}1A` }}
                />
                {geo.cityVerified && <Check size={14} strokeWidth={2.4} color={t.tertiaryContainer} />}
                <Tooltip title="Cambiar de ciudad">
                  <IconButton size="small" onClick={() => setCityOpen(true)} sx={{ color: forumPalette.textSecondary }}>
                    <ChangeCircleIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </>
            ) : (
              geoLoaded && (
                <Alert severity="info" icon={<MapPin size={16} strokeWidth={2.2} />} sx={{ flex: 1, fontSize: '0.85rem', bgcolor: `${t.primary}14`, color: t.onSurface }}>
                  Configura tu ciudad para ver los foros de tu zona.
                  <Button size="small" onClick={() => setCityOpen(true)}
                    sx={{ ml: 1, color: forumPalette.accent, textTransform: 'none' }}>
                    Configurar
                  </Button>
                </Alert>
              )
            )}
          </Box>

          <Outlet />
        </Box>
        {/* Sidebar derecho: top usuarios, trending, CTA */}
        <ForumSidebarRight />

        {/* Selector de ciudad (reutiliza GeoConfig) */}
        <Dialog open={cityOpen} onClose={() => setCityOpen(false)} fullWidth maxWidth="sm">
          <DialogTitle sx={{ color: forumPalette.textPrimary, display: 'flex', alignItems: 'center', gap: 1 }}>
            <SlidersHorizontal size={18} strokeWidth={2.2} /> Tu zona del foro
          </DialogTitle>
          <DialogContent>
            <GeoConfig compact onSaved={() => setCityOpen(false)} />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setCityOpen(false)} sx={{ color: forumPalette.textSecondary, textTransform: 'none' }}>
              Cerrar
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Box>
  );
}
