import { useEffect, useState } from 'react';
import {
  Box, Typography, Card, CardContent, CardActionArea, Grid, Tabs, Tab, Button, Dialog,
  DialogTitle, DialogContent, DialogActions, TextField, CircularProgress, Chip, Alert,
} from '@mui/material';
import SentimentVeryDissatisfiedIcon from '@mui/icons-material/SentimentVeryDissatisfied';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import AddIcon from '@mui/icons-material/Add';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { listConoThemes, createConoTheme } from '../../services/cono.api';
import type { ConoTheme, ConoThemeType } from '../../services/cono.api';
import { useAuthStore } from '../../stores/authStore';
import { getErrorMessage } from '../../services/api';
import { useUnifiedTokens } from '../../theme';
import { StaggerContainer, StaggerItem } from '../../components/motion/StaggerList';
import { MotionCard } from '../../components/motion/MotionCard';

export default function ConoHomePage() {
  const tokens = useUnifiedTokens();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [tab, setTab] = useState<ConoThemeType>('MEME');
  const [themes, setThemes] = useState<ConoTheme[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({ slug: '', title: '', description: '' });
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    listConoThemes(tab).then(setThemes).finally(() => setLoading(false));
  };

  useEffect(load, [tab]);

  const submitTheme = async () => {
    if (!form.slug.trim() || !form.title.trim()) {
      toast.error('Slug y título son obligatorios.');
      return;
    }
    setSaving(true);
    try {
      const theme = await createConoTheme({ ...form, type: tab });
      setCreateOpen(false);
      setForm({ slug: '', title: '', description: '' });
      navigate(`/cono/${theme.slug}`);
    } catch (e) {
      toast.error(getErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box sx={{ maxWidth: 900, mx: 'auto', p: 2 }}>
      <Typography variant="h5" fontWeight={800} sx={{ color: tokens.onSurface, mb: 0.5, display: 'flex', alignItems: 'center', gap: 1 }}>
        <SentimentVeryDissatisfiedIcon sx={{ fontSize: 26, color: tokens.primary }} /> Memes y torneo
      </Typography>
      <Typography variant="body2" sx={{ color: tokens.onSurfaceVariant, mb: 2 }}>
        Rankings de la comunidad, con humor y con datos. Votá positivo o nica, o seguí un torneo de eliminatorias.
      </Typography>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)}>
          <Tab label="Memes" value="MEME" />
          <Tab label="Torneos" value="TOURNAMENT" icon={<EmojiEventsIcon sx={{ fontSize: 18 }} />} iconPosition="start" />
        </Tabs>
        {user && (
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setCreateOpen(true)}>
            Nuevo tema
          </Button>
        )}
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress /></Box>
      ) : themes.length === 0 ? (
        <Alert severity="info">Todavía no hay temas en esta categoría. ¡Creá el primero!</Alert>
      ) : (
        <StaggerContainer>
          <Grid container spacing={2}>
            {themes.map((t) => (
              <Grid item xs={12} sm={6} key={t.id}>
                <StaggerItem>
                  <MotionCard>
                    <Card sx={{ bgcolor: tokens.surfaceContainerLowest, borderRadius: '12px', boxShadow: tokens.cardShadow }}>
                      <CardActionArea onClick={() => navigate(`/cono/${t.slug}`)}>
                        <CardContent>
                          <Typography fontWeight={700} sx={{ color: tokens.onSurface }}>{t.title}</Typography>
                          {t.description && (
                            <Typography variant="body2" sx={{ color: tokens.onSurfaceVariant, mb: 1 }}>{t.description}</Typography>
                          )}
                          <Chip label={`${t._count?.entries ?? 0} entradas`} size="small" />
                          {t.createdBy && (
                            <Typography variant="caption" sx={{ display: 'block', mt: 1, color: tokens.onSurfaceVariant }}>
                              por {t.createdBy.forumUsername}
                            </Typography>
                          )}
                        </CardContent>
                      </CardActionArea>
                    </Card>
                  </MotionCard>
                </StaggerItem>
              </Grid>
            ))}
          </Grid>
        </StaggerContainer>
      )}

      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Nuevo tema — {tab === 'MEME' ? 'Memes' : 'Torneo'}</DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2, fontSize: '0.8rem' }}>
            Necesitás al menos una verificación profesional aprobada para crear un tema.
            <Button size="small" onClick={() => navigate('/foro/verificacion')} sx={{ ml: 1 }}>Verificarme</Button>
          </Alert>
          <TextField
            fullWidth margin="dense" label="Slug (URL)" placeholder="peor-banco-bolivia"
            value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })}
          />
          <TextField
            fullWidth margin="dense" label="Título" placeholder="Peor banco de Bolivia"
            value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
          />
          <TextField
            fullWidth margin="dense" label="Descripción (opcional)" multiline minRows={2}
            value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateOpen(false)}>Cancelar</Button>
          <Button variant="contained" onClick={submitTheme} disabled={saving}>
            {saving ? <CircularProgress size={18} /> : 'Crear'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

