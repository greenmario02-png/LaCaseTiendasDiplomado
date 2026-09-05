import { useEffect, useState } from 'react';
import { Box, Typography, List, ListItemButton, ListItemIcon, ListItemText, Divider, Chip, CircularProgress } from '@mui/material';
import HomeIcon from '@mui/icons-material/Home';
import LocalFireDepartmentIcon from '@mui/icons-material/LocalFireDepartment';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import { CategoryIcon } from '../../theme/forumIcons';
import { forumPalette } from '../../theme/forumTheme';
import { useForumStore } from '../../stores/forumStore';
import { listCategories, getCitiesStats } from '../../services/forum.api';
import type { ForumCategory } from '../../services/forum.api';

const MODES = [
  { key: 'RECIENTE', label: 'Recientes', icon: <AccessTimeIcon fontSize="small" /> },
  { key: 'POPULAR', label: 'Popular', icon: <LocalFireDepartmentIcon fontSize="small" /> },
  { key: 'SIN_RESPUESTA', label: 'Sin respuesta', icon: <HelpOutlineIcon fontSize="small" /> },
];

export default function ForumSidebarLeft() {
  const { activeMode, activeCategory, activeCity, setMode, setCategory, setCity } = useForumStore();
  const [categories, setCategories] = useState<ForumCategory[]>([]);
  const [cities, setCities] = useState<{ city: string; count: number }[]>([]);

  useEffect(() => {
    listCategories().then(setCategories).catch(() => {});
    getCitiesStats().then(setCities).catch(() => {});
  }, []);

  return (
    <Box sx={{ display: { xs: 'none', lg: 'block' }, width: 240, flexShrink: 0, pr: 2 }}>
      <Box sx={{ bgcolor: forumPalette.bgCard, borderRadius: '10px', border: `1px solid ${forumPalette.border}`, p: 1 }}>
        <Typography variant="subtitle2" fontWeight={700} sx={{ px: 1, py: 0.5, color: forumPalette.textPrimary }}>Navegación</Typography>
        <List dense disablePadding>
          <ListItemButton onClick={() => { setMode('RECIENTE'); setCategory(''); }}>
            <ListItemIcon sx={{ minWidth: 30, color: forumPalette.textSecondary }}><HomeIcon fontSize="small" /></ListItemIcon>
            <ListItemText primary="Inicio" sx={{ color: forumPalette.textPrimary }} />
          </ListItemButton>
          {MODES.map((m) => (
            <ListItemButton key={m.key} selected={activeMode === m.key} onClick={() => setMode(m.key)}>
              <ListItemIcon sx={{ minWidth: 30, color: forumPalette.textSecondary }}>{m.icon}</ListItemIcon>
              <ListItemText primary={m.label} sx={{ color: forumPalette.textPrimary }} />
            </ListItemButton>
          ))}
        </List>
      </Box>

      <Box sx={{ bgcolor: forumPalette.bgCard, borderRadius: '10px', border: `1px solid ${forumPalette.border}`, mt: 1.5, p: 1 }}>
        <Typography variant="subtitle2" fontWeight={700} sx={{ px: 1, py: 0.5, color: forumPalette.textPrimary }}>Categorías</Typography>
        {categories.length === 0 ? <CircularProgress size={18} sx={{ m: 2 }} /> : (
          <List dense disablePadding>
            {categories.filter((c) => c.isActive).slice(0, 12).map((c) => (
              <ListItemButton key={c.id} selected={activeCategory === c.slug} onClick={() => setCategory(c.slug)}>
                <ListItemText primary={<span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}><CategoryIcon slug={c.slug} size={15} color={forumPalette.accent} /> {c.name}</span>} sx={{ color: forumPalette.textPrimary, fontSize: '0.85rem' }} />
              </ListItemButton>
            ))}
          </List>
        )}
      </Box>

      <Box sx={{ bgcolor: forumPalette.bgCard, borderRadius: '10px', border: `1px solid ${forumPalette.border}`, mt: 1.5, p: 1 }}>
        <Typography variant="subtitle2" fontWeight={700} sx={{ px: 1, py: 0.5, color: forumPalette.textPrimary }}>
          <LocationOnIcon sx={{ fontSize: 14, verticalAlign: 'middle', mr: 0.5 }} />Ciudades
        </Typography>
        <List dense disablePadding>
          {cities.slice(0, 8).map((c) => (
            <ListItemButton key={c.city} selected={activeCity === c.city} onClick={() => setCity(c.city)}>
              <ListItemText primary={c.city} sx={{ color: forumPalette.textPrimary, fontSize: '0.85rem' }} />
              <Chip label={c.count} size="small" sx={{ fontSize: '0.65rem', color: forumPalette.textMuted }} />
            </ListItemButton>
          ))}
        </List>
      </Box>
    </Box>
  );
}
